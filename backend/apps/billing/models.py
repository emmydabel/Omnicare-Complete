from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Invoice(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        OVERDUE = "overdue", "Overdue"
        CANCELLED = "cancelled", "Cancelled"
        REFUNDED = "refunded", "Refunded"

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Cash"
        CARD = "card", "Card"
        INSURANCE = "insurance", "Insurance"
        BANK_TRANSFER = "bank_transfer", "Bank Transfer"
        UNPAID = "unpaid", "Not yet paid"

    invoice_number = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="invoices")
    appointment = models.ForeignKey(
        "appointments.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    issue_date = models.DateField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    tax_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.UNPAID)
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="invoices_created"
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["patient", "-created_at"]),
            models.Index(fields=["invoice_number"]),
        ]

    def __str__(self):
        return f"{self.invoice_number} — {self.patient} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and not self.invoice_number:
            self.invoice_number = f"INV-{self.pk:06d}"
            super().save(update_fields=["invoice_number"])

    @property
    def subtotal(self) -> Decimal:
        total = self.items.aggregate(s=models.Sum(models.F("quantity") * models.F("unit_price")))["s"]
        return total or Decimal("0.00")

    @property
    def tax_amount(self) -> Decimal:
        return (self.subtotal * Decimal(str(self.tax_rate_percent)) / Decimal("100")).quantize(Decimal("0.01"))

    @property
    def total_amount(self) -> Decimal:
        return self.subtotal + self.tax_amount - Decimal(str(self.discount_amount))

    @property
    def balance_due(self) -> Decimal:
        return self.total_amount - self.amount_paid

    def record_payment(self, amount, payment_method):
        from django.utils import timezone

        self.amount_paid = self.amount_paid + Decimal(amount)
        self.payment_method = payment_method
        if self.amount_paid >= self.total_amount:
            self.status = self.Status.PAID
            self.paid_at = timezone.now()
        self.save()


class InvoiceItem(TimeStampedModel):
    class ItemType(models.TextChoices):
        CONSULTATION = "consultation", "Consultation"
        PROCEDURE = "procedure", "Procedure"
        MEDICATION = "medication", "Medication"
        LAB_TEST = "lab_test", "Lab Test"
        ROOM_CHARGE = "room_charge", "Room Charge"
        OTHER = "other", "Other"

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    item_type = models.CharField(max_length=20, choices=ItemType.choices, default=ItemType.OTHER)
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.description} x{self.quantity}"

    @property
    def amount(self) -> Decimal:
        return self.quantity * self.unit_price


class InsuranceClaim(TimeStampedModel):
    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under Review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        PAID = "paid", "Paid"

    claim_number = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="insurance_claims")
    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="insurance_claims")
    insurance_provider = models.CharField(max_length=150)
    policy_number = models.CharField(max_length=100)
    claim_amount = models.DecimalField(max_digits=10, decimal_places=2)
    approved_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)
    submitted_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-submitted_at"]
        indexes = [models.Index(fields=["status"]), models.Index(fields=["claim_number"])]

    def __str__(self):
        return f"{self.claim_number} — {self.insurance_provider} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and not self.claim_number:
            self.claim_number = f"CLM-{self.pk:06d}"
            super().save(update_fields=["claim_number"])
