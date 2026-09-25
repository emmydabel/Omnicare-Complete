"""
Tests for Medicine.adjust_stock() — the one method every stock-changing
operation in the system (dispensing, restocking, manual adjustment) routes
through, so its correctness matters more than most.

Run with: python manage.py test apps.pharmacy
"""
from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.test_utils import make_admin, make_pharmacist
from apps.pharmacy.models import Medicine, StockTransaction


def _make_medicine(stock=100, reorder=20, **extra):
    return Medicine.objects.create(
        name=extra.pop("name", "Test Medicine"), generic_name=extra.pop("generic_name", "Test Generic"),
        stock_quantity=stock, reorder_level=reorder, unit_price=extra.pop("unit_price", Decimal("5.00")),
        expiry_date=extra.pop("expiry_date", "2027-01-01"), **extra,
    )


class AdjustStockModelTests(TestCase):
    def setUp(self):
        self.pharmacist = make_pharmacist().user
        self.medicine = _make_medicine(stock=100)

    def test_dispensing_decrements_stock(self):
        self.medicine.adjust_stock(-10, StockTransaction.TransactionType.DISPENSE, self.pharmacist)
        self.medicine.refresh_from_db()
        self.assertEqual(self.medicine.stock_quantity, 90)

    def test_restocking_increments_stock(self):
        self.medicine.adjust_stock(50, StockTransaction.TransactionType.RESTOCK, self.pharmacist)
        self.medicine.refresh_from_db()
        self.assertEqual(self.medicine.stock_quantity, 150)

    def test_cannot_dispense_more_than_available_stock(self):
        with self.assertRaises(ValueError):
            self.medicine.adjust_stock(-101, StockTransaction.TransactionType.DISPENSE, self.pharmacist)
        self.medicine.refresh_from_db()
        self.assertEqual(self.medicine.stock_quantity, 100)  # unchanged after the failed attempt

    def test_adjust_stock_writes_an_audit_transaction(self):
        self.medicine.adjust_stock(-5, StockTransaction.TransactionType.DISPENSE, self.pharmacist, note="test dispense")
        txn = StockTransaction.objects.filter(medicine=self.medicine).latest("created_at")
        self.assertEqual(txn.quantity, 5)  # stored as absolute value
        self.assertEqual(txn.resulting_quantity, 95)
        self.assertEqual(txn.note, "test dispense")
        self.assertEqual(txn.performed_by, self.pharmacist)

    def test_exact_full_dispense_is_allowed_but_further_dispense_fails(self):
        self.medicine.adjust_stock(-100, StockTransaction.TransactionType.DISPENSE, self.pharmacist)
        self.medicine.refresh_from_db()
        self.assertEqual(self.medicine.stock_quantity, 0)
        with self.assertRaises(ValueError):
            self.medicine.adjust_stock(-1, StockTransaction.TransactionType.DISPENSE, self.pharmacist)


class LowStockDetectionTests(TestCase):
    def test_is_low_stock_true_at_or_below_reorder_level(self):
        at_threshold = _make_medicine(stock=20, reorder=20, name="At Threshold")
        below = _make_medicine(stock=5, reorder=20, name="Below")
        above = _make_medicine(stock=50, reorder=20, name="Above")
        self.assertTrue(at_threshold.is_low_stock)
        self.assertTrue(below.is_low_stock)
        self.assertFalse(above.is_low_stock)


class MedicineAPIPermissionTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.pharmacist = make_pharmacist().user
        self.medicine = _make_medicine()

    def test_low_stock_endpoint_only_returns_items_at_or_below_reorder(self):
        _make_medicine(stock=200, reorder=20, name="Well Stocked")
        _make_medicine(stock=5, reorder=20, name="Running Low")
        self.client.force_authenticate(self.pharmacist)
        res = self.client.get("/api/medicines/low-stock/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        names = [m["name"] for m in res.data]
        self.assertIn("Running Low", names)
        self.assertNotIn("Well Stocked", names)
