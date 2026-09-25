from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import TimeStampedModel
from apps.doctors.models import DoctorProfile
from apps.patients.models import PatientProfile


class Appointment(TimeStampedModel):
    """Booking workflow: SCHEDULED -> CONFIRMED -> IN_PROGRESS -> COMPLETED,
    with CANCELLED / NO_SHOW as terminal side-branches from any non-terminal state."""

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        CONFIRMED = "confirmed", "Confirmed"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        NO_SHOW = "no_show", "No Show"

    class VisitType(models.TextChoices):
        CONSULTATION = "consultation", "Consultation"
        FOLLOW_UP = "follow_up", "Follow-up"
        EMERGENCY = "emergency", "Emergency"
        ROUTINE_CHECKUP = "routine_checkup", "Routine Checkup"
        PROCEDURE = "procedure", "Procedure"

    # Forward transitions allowed from each status (used by the `transition` action).
    ALLOWED_TRANSITIONS = {
        Status.SCHEDULED: {Status.CONFIRMED, Status.CANCELLED, Status.NO_SHOW},
        Status.CONFIRMED: {Status.IN_PROGRESS, Status.CANCELLED, Status.NO_SHOW},
        Status.IN_PROGRESS: {Status.COMPLETED, Status.CANCELLED},
        Status.COMPLETED: set(),
        Status.CANCELLED: set(),
        Status.NO_SHOW: set(),
    }

    appointment_id = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="appointments")
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="appointments")
    department = models.CharField(max_length=100, blank=True)
    visit_type = models.CharField(max_length=20, choices=VisitType.choices, default=VisitType.CONSULTATION)
    scheduled_start = models.DateTimeField()
    scheduled_end = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    reason = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    cancellation_reason = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="booked_appointments"
    )

    class Meta:
        ordering = ["-scheduled_start"]
        indexes = [
            models.Index(fields=["scheduled_start"]),
            models.Index(fields=["status"]),
            models.Index(fields=["doctor", "scheduled_start"]),
            models.Index(fields=["patient", "scheduled_start"]),
        ]

    def __str__(self):
        return f"{self.appointment_id} — {self.patient} with {self.doctor} @ {self.scheduled_start:%Y-%m-%d %H:%M}"

    def clean(self):
        if self.scheduled_end and self.scheduled_start and self.scheduled_end <= self.scheduled_start:
            raise ValidationError("End time must be after start time.")

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        if not self.department and self.doctor_id:
            self.department = self.doctor.department
        super().save(*args, **kwargs)
        if is_new and not self.appointment_id:
            self.appointment_id = f"A-{self.pk:06d}"
            super().save(update_fields=["appointment_id"])

    def can_transition_to(self, new_status):
        return new_status in self.ALLOWED_TRANSITIONS.get(self.status, set())
