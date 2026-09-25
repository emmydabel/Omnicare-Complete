from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class NurseProfile(TimeStampedModel):
    class Shift(models.TextChoices):
        MORNING = "morning", "Morning"
        EVENING = "evening", "Evening"
        NIGHT = "night", "Night"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="nurse_profile"
    )
    nurse_id = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    department = models.CharField(max_length=100, default="General")
    shift = models.CharField(max_length=20, choices=Shift.choices, default=Shift.MORNING)
    license_number = models.CharField(max_length=100, blank=True)
    assigned_ward = models.CharField(max_length=50, blank=True)
    years_of_experience = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["department"]), models.Index(fields=["shift"])]

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.department} ({self.shift})"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and not self.nurse_id:
            self.nurse_id = f"N-{self.pk:06d}"
            super().save(update_fields=["nurse_id"])
