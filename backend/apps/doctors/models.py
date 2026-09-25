from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class DoctorProfile(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="doctor_profile"
    )
    doctor_id = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    specialization = models.CharField(max_length=150, default="General Medicine")
    department = models.CharField(max_length=100, default="General")
    license_number = models.CharField(max_length=100, blank=True)
    years_of_experience = models.PositiveIntegerField(default=0)
    consultation_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    bio = models.TextField(blank=True)
    qualifications = models.CharField(max_length=255, blank=True)
    is_available_for_booking = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["department"]),
            models.Index(fields=["specialization"]),
        ]

    def __str__(self):
        return f"Dr. {self.user.get_full_name()} ({self.specialization})"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and not self.doctor_id:
            self.doctor_id = f"D-{self.pk:06d}"
            super().save(update_fields=["doctor_id"])


class DoctorAvailability(TimeStampedModel):
    """Recurring weekly availability window, e.g. 'Every Monday 09:00–13:00'."""

    class Weekday(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="availability_slots")
    weekday = models.IntegerField(choices=Weekday.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["weekday", "start_time"]
        indexes = [models.Index(fields=["doctor", "weekday"])]
        verbose_name_plural = "Doctor availability"

    def __str__(self):
        return f"{self.doctor} — {self.get_weekday_display()} {self.start_time}-{self.end_time}"


class DoctorShift(TimeStampedModel):
    """A concrete, dated shift assignment — feeds the monthly shift-management calendar."""

    class ShiftType(models.TextChoices):
        MORNING = "morning", "Morning"
        EVENING = "evening", "Evening"
        NIGHT = "night", "Night"
        ON_CALL = "on_call", "On-call"

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="shifts")
    date = models.DateField()
    shift_type = models.CharField(max_length=20, choices=ShiftType.choices, default=ShiftType.MORNING)
    start_time = models.TimeField()
    end_time = models.TimeField()
    department = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["date", "start_time"]
        indexes = [models.Index(fields=["doctor", "date"]), models.Index(fields=["date"])]

    def __str__(self):
        return f"{self.doctor} — {self.date} ({self.get_shift_type_display()})"
