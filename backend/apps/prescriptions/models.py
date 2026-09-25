from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.doctors.models import DoctorProfile
from apps.patients.models import PatientProfile


class Prescription(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PARTIALLY_DISPENSED = "partially_dispensed", "Partially Dispensed"
        DISPENSED = "dispensed", "Dispensed"
        CANCELLED = "cancelled", "Cancelled"

    prescription_id = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="prescriptions")
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="prescriptions")
    medical_record = models.ForeignKey(
        "medical_records.MedicalRecord", on_delete=models.SET_NULL, null=True, blank=True, related_name="prescriptions"
    )
    status = models.CharField(max_length=25, choices=Status.choices, default=Status.PENDING)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status"]), models.Index(fields=["patient"])]

    def __str__(self):
        return f"{self.prescription_id} — {self.patient}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and not self.prescription_id:
            self.prescription_id = f"RX-{self.pk:06d}"
            super().save(update_fields=["prescription_id"])

    def refresh_status(self):
        items = list(self.items.all())
        if not items:
            return
        if all(i.is_dispensed for i in items):
            self.status = self.Status.DISPENSED
        elif any(i.is_dispensed for i in items):
            self.status = self.Status.PARTIALLY_DISPENSED
        else:
            self.status = self.Status.PENDING
        self.save(update_fields=["status", "updated_at"])


class PrescriptionItem(TimeStampedModel):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name="items")
    medicine = models.ForeignKey("pharmacy.Medicine", on_delete=models.PROTECT, related_name="prescription_items")
    dosage = models.CharField(max_length=100, help_text="e.g. 500mg")
    frequency = models.CharField(max_length=100, help_text="e.g. Twice daily")
    duration_days = models.PositiveIntegerField(default=7)
    quantity = models.PositiveIntegerField(default=1)
    instructions = models.CharField(max_length=255, blank=True, help_text="e.g. Take with food")
    is_dispensed = models.BooleanField(default=False)
    dispensed_at = models.DateTimeField(null=True, blank=True)
    dispensed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="dispensed_items"
    )

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.medicine.name} x{self.quantity} for {self.prescription.patient}"

    def dispense(self, pharmacist_user):
        """Marks this line dispensed and atomically decrements pharmacy stock,
        writing a StockTransaction audit row via Medicine.adjust_stock()."""
        from django.db import transaction as db_transaction
        from django.utils import timezone

        from apps.pharmacy.models import StockTransaction

        if self.is_dispensed:
            raise ValueError("This item has already been dispensed.")

        with db_transaction.atomic():
            self.medicine.adjust_stock(
                delta=-self.quantity,
                transaction_type=StockTransaction.TransactionType.DISPENSE,
                performed_by=pharmacist_user,
                note=f"Dispensed for prescription {self.prescription.prescription_id}",
            )
            self.is_dispensed = True
            self.dispensed_at = timezone.now()
            self.dispensed_by = pharmacist_user
            self.save(update_fields=["is_dispensed", "dispensed_at", "dispensed_by", "updated_at"])
        self.prescription.refresh_status()
        return self
