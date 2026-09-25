"""
Tests for Invoice's computed financial properties (subtotal/tax/total/
balance_due are all derived, never stored, specifically so they can't drift
from their line items) and the payment-recording workflow.

Run with: python manage.py test apps.billing
"""
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from apps.billing.models import Invoice, InvoiceItem
from apps.core.test_utils import make_admin, make_patient


class InvoiceComputedPropertyTests(APITestCase):
    def setUp(self):
        self.patient = make_patient()
        self.invoice = Invoice.objects.create(patient=self.patient, tax_rate_percent=Decimal("10.00"))
        InvoiceItem.objects.create(invoice=self.invoice, description="Consultation", quantity=1, unit_price=Decimal("100.00"))
        InvoiceItem.objects.create(invoice=self.invoice, description="Blood Panel", quantity=2, unit_price=Decimal("25.00"))

    def test_subtotal_sums_all_line_items(self):
        # 1x100.00 + 2x25.00 = 150.00
        self.assertEqual(self.invoice.subtotal, Decimal("150.00"))

    def test_tax_amount_is_computed_from_subtotal_and_rate(self):
        # 150.00 * 10% = 15.00
        self.assertEqual(self.invoice.tax_amount, Decimal("15.00"))

    def test_total_amount_includes_tax_and_subtracts_discount(self):
        self.assertEqual(self.invoice.total_amount, Decimal("165.00"))
        self.invoice.discount_amount = Decimal("15.00")
        self.invoice.save()
        self.assertEqual(self.invoice.total_amount, Decimal("150.00"))

    def test_balance_due_reflects_partial_payment(self):
        self.invoice.amount_paid = Decimal("65.00")
        self.invoice.save()
        self.assertEqual(self.invoice.balance_due, Decimal("100.00"))

    def test_adding_a_line_item_after_creation_updates_subtotal_live(self):
        """Proves these are computed, not cached/stored — adding an item
        should be reflected immediately without an explicit recalculation
        step, since subtotal is a property, not a stored column."""
        InvoiceItem.objects.create(invoice=self.invoice, description="Extra test", quantity=1, unit_price=Decimal("50.00"))
        self.assertEqual(self.invoice.subtotal, Decimal("200.00"))


class RecordPaymentAPITests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.patient = make_patient()
        self.invoice = Invoice.objects.create(patient=self.patient)
        InvoiceItem.objects.create(invoice=self.invoice, description="Consultation", quantity=1, unit_price=Decimal("100.00"))

    def test_full_payment_marks_invoice_paid(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            f"/api/invoices/{self.invoice.id}/record_payment/", {"amount": "100.00", "payment_method": "card"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.PAID)
        self.assertIsNotNone(self.invoice.paid_at)

    def test_partial_payment_does_not_mark_invoice_paid(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            f"/api/invoices/{self.invoice.id}/record_payment/", {"amount": "40.00", "payment_method": "cash"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.invoice.refresh_from_db()
        self.assertNotEqual(self.invoice.status, Invoice.Status.PAID)
        self.assertEqual(self.invoice.balance_due, Decimal("60.00"))

    def test_patient_cannot_record_a_payment(self):
        """Billing writes are admin-only by design — patients can view their
        own invoices but the ledger has a single writer."""
        self.client.force_authenticate(self.patient.user)
        res = self.client.post(
            f"/api/invoices/{self.invoice.id}/record_payment/", {"amount": "100.00", "payment_method": "card"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_can_view_only_their_own_invoice(self):
        other_patient = make_patient()
        other_invoice = Invoice.objects.create(patient=other_patient)

        self.client.force_authenticate(self.patient.user)
        res = self.client.get("/api/invoices/")
        ids = [inv["id"] for inv in res.data["results"]]
        self.assertIn(self.invoice.id, ids)
        self.assertNotIn(other_invoice.id, ids)
