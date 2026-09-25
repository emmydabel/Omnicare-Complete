from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class PharmacistProfile(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pharmacist_profile"
    )
    pharmacist_id = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    license_number = models.CharField(max_length=100, blank=True)
    pharmacy_branch = models.CharField(max_length=100, default="Main Pharmacy")
    years_of_experience = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.pharmacy_branch}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and not self.pharmacist_id:
            self.pharmacist_id = f"RX-{self.pk:06d}"
            super().save(update_fields=["pharmacist_id"])
