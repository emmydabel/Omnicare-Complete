from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.doctors.models import DoctorProfile
from apps.patients.models import PatientProfile


class MedicalRecord(TimeStampedModel):
    """One EMR entry: a diagnosis, treatment plan, and doctor's notes tied to a visit."""

    class RecordType(models.TextChoices):
        DIAGNOSIS = "diagnosis", "Diagnosis"
        TREATMENT_PLAN = "treatment_plan", "Treatment Plan"
        PROGRESS_NOTE = "progress_note", "Progress Note"
        DISCHARGE_SUMMARY = "discharge_summary", "Discharge Summary"
        LAB_SUMMARY = "lab_summary", "Lab Summary"

    record_id = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="medical_records")
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.SET_NULL, null=True, related_name="medical_records")
    appointment = models.ForeignKey(
        "appointments.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="medical_records"
    )
    record_type = models.CharField(max_length=20, choices=RecordType.choices, default=RecordType.PROGRESS_NOTE)
    visit_date = models.DateField()
    diagnosis = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)
    doctor_notes = models.TextField(blank=True)
    icd_code = models.CharField(max_length=20, blank=True, help_text="Optional ICD-10 diagnosis code")
    attachment = models.FileField(upload_to="emr_attachments/%Y/%m/", null=True, blank=True)

    class Meta:
        ordering = ["-visit_date", "-created_at"]
        indexes = [
            models.Index(fields=["patient", "-visit_date"]),
            models.Index(fields=["record_type"]),
        ]

    def __str__(self):
        return f"{self.record_id} — {self.patient} ({self.get_record_type_display()})"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and not self.record_id:
            self.record_id = f"EMR-{self.pk:06d}"
            super().save(update_fields=["record_id"])


class Allergy(TimeStampedModel):
    class Severity(models.TextChoices):
        MILD = "mild", "Mild"
        MODERATE = "moderate", "Moderate"
        SEVERE = "severe", "Severe"

    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="allergies")
    allergen = models.CharField(max_length=150)
    reaction = models.CharField(max_length=255, blank=True)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MILD)
    noted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ["-severity", "allergen"]
        verbose_name_plural = "Allergies"
        indexes = [models.Index(fields=["patient"])]

    def __str__(self):
        return f"{self.patient} allergic to {self.allergen} ({self.severity})"


class VitalSign(TimeStampedModel):
    """A single vitals reading — feeds the dashboard's real-time vitals monitor widget."""

    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="vital_signs")
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    heart_rate = models.PositiveSmallIntegerField(help_text="bpm", null=True, blank=True)
    blood_pressure_systolic = models.PositiveSmallIntegerField(help_text="mmHg", null=True, blank=True)
    blood_pressure_diastolic = models.PositiveSmallIntegerField(help_text="mmHg", null=True, blank=True)
    temperature_celsius = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    respiratory_rate = models.PositiveSmallIntegerField(help_text="breaths/min", null=True, blank=True)
    oxygen_saturation = models.PositiveSmallIntegerField(help_text="SpO2 %", null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["patient", "-recorded_at"])]

    def __str__(self):
        return f"Vitals for {self.patient} @ {self.recorded_at:%Y-%m-%d %H:%M}"

    @property
    def is_critical(self):
        """Simple threshold check used to badge a reading as needing attention."""
        checks = [
            self.heart_rate and (self.heart_rate < 50 or self.heart_rate > 120),
            self.oxygen_saturation and self.oxygen_saturation < 92,
            self.blood_pressure_systolic and (self.blood_pressure_systolic > 180 or self.blood_pressure_systolic < 90),
            self.temperature_celsius and (self.temperature_celsius >= 39 or self.temperature_celsius <= 35),
        ]
        return any(checks)
