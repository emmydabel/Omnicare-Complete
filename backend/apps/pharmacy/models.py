from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Medicine(TimeStampedModel):
    class Category(models.TextChoices):
        ANALGESIC = "analgesic", "Analgesic"
        ANTIBIOTIC = "antibiotic", "Antibiotic"
        ANTIVIRAL = "antiviral", "Antiviral"
        CARDIOVASCULAR = "cardiovascular", "Cardiovascular"
        RESPIRATORY = "respiratory", "Respiratory"
        GASTROINTESTINAL = "gastrointestinal", "Gastrointestinal"
        ENDOCRINE = "endocrine", "Endocrine"
        NEUROLOGICAL = "neurological", "Neurological"
        VITAMIN_SUPPLEMENT = "vitamin_supplement", "Vitamin / Supplement"
        OTHER = "other", "Other"

    class DosageForm(models.TextChoices):
        TABLET = "tablet", "Tablet"
        CAPSULE = "capsule", "Capsule"
        SYRUP = "syrup", "Syrup"
        INJECTION = "injection", "Injection"
        OINTMENT = "ointment", "Ointment"
        DROPS = "drops", "Drops"
        INHALER = "inhaler", "Inhaler"

    sku = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    name = models.CharField(max_length=150, db_index=True)
    generic_name = models.CharField(max_length=150, blank=True)
    category = models.CharField(max_length=30, choices=Category.choices, default=Category.OTHER)
    dosage_form = models.CharField(max_length=20, choices=DosageForm.choices, default=DosageForm.TABLET)
    strength = models.CharField(max_length=50, blank=True, help_text="e.g. 500mg")
    manufacturer = models.CharField(max_length=150, blank=True)
    batch_number = models.CharField(max_length=50, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock_quantity = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=20)
    expiry_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["category"]),
            models.Index(fields=["stock_quantity"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.strength})" if self.strength else self.name

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and not self.sku:
            self.sku = f"MED-{self.pk:06d}"
            super().save(update_fields=["sku"])

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.reorder_level

    @property
    def is_expiring_soon(self):
        if not self.expiry_date:
            return False
        from datetime import date, timedelta

        return self.expiry_date <= date.today() + timedelta(days=60)

    def adjust_stock(self, delta, transaction_type, performed_by, note=""):
        """Atomically move stock and write the audit-trail transaction row."""
        from django.db import transaction as db_transaction

        with db_transaction.atomic():
            locked = Medicine.objects.select_for_update().get(pk=self.pk)
            new_qty = locked.stock_quantity + delta
            if new_qty < 0:
                raise ValueError(f"Insufficient stock for {locked.name}: {locked.stock_quantity} available.")
            locked.stock_quantity = new_qty
            locked.save(update_fields=["stock_quantity", "updated_at"])
            StockTransaction.objects.create(
                medicine=locked,
                transaction_type=transaction_type,
                quantity=abs(delta),
                performed_by=performed_by,
                note=note,
                resulting_quantity=new_qty,
            )
            self.stock_quantity = new_qty
        return self


class StockTransaction(TimeStampedModel):
    class TransactionType(models.TextChoices):
        RESTOCK = "restock", "Restock"
        DISPENSE = "dispense", "Dispense"
        ADJUSTMENT = "adjustment", "Manual Adjustment"
        RETURN = "return", "Return"
        EXPIRED = "expired", "Expired / Written Off"

    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name="transactions")
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    quantity = models.PositiveIntegerField()
    resulting_quantity = models.PositiveIntegerField()
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["medicine", "-created_at"])]

    def __str__(self):
        return f"{self.get_transaction_type_display()} {self.quantity}x {self.medicine.name}"
