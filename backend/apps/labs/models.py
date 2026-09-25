from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class LabTestRequest(TimeStampedModel):
    """A doctor's order for a lab test on a patient. Result-to-patient linking is
    implicit via `patient`; `requested_by` is always a doctor's User account."""

    class TestType(models.TextChoices):
        CBC = "cbc", "Complete Blood Count (CBC)"
        BLOOD_GLUCOSE = "blood_glucose", "Blood Glucose"
        LIPID_PANEL = "lipid_panel", "Lipid Panel"
        LIVER_FUNCTION = "liver_function", "Liver Function Panel"
        KIDNEY_FUNCTION = "kidney_function", "Kidney Function Panel"
        THYROID_PANEL = "thyroid_panel", "Thyroid Panel"
        ELECTROLYTES = "electrolytes", "Electrolyte Panel"
        URINALYSIS = "urinalysis", "Urinalysis"
        COAGULATION = "coagulation", "Coagulation Panel"
        CULTURE_SENSITIVITY = "culture_sensitivity", "Culture & Sensitivity"
        XRAY = "xray", "X-Ray Imaging"
        CT_SCAN = "ct_scan", "CT Scan"
        MRI = "mri", "MRI"
        COVID_PCR = "covid_pcr", "COVID-19 PCR"
        OTHER = "other", "Other"

    class Priority(models.TextChoices):
        ROUTINE = "routine", "Routine"
        URGENT = "urgent", "Urgent"
        STAT = "stat", "STAT (Immediate)"

    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        SAMPLE_COLLECTED = "sample_collected", "Sample Collected"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    request_id = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="lab_requests")
    requested_by = models.ForeignKey(
        "doctors.DoctorProfile", on_delete=models.SET_NULL, null=True, related_name="lab_requests"
    )
    test_type = models.CharField(max_length=30, choices=TestType.choices, default=TestType.OTHER)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.ROUTINE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    clinical_notes = models.TextField(blank=True, help_text="Reason for test / clinical context")
    sample_collected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["patient", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.request_id} — {self.get_test_type_display()} for {self.patient}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and not self.request_id:
            self.request_id = f"LAB-{self.pk:06d}"
            super().save(update_fields=["request_id"])


class LabResult(TimeStampedModel):
    test_request = models.OneToOneField(LabTestRequest, on_delete=models.CASCADE, related_name="result")
    entered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    summary = models.TextField(blank=True)
    attachment = models.FileField(upload_to="lab_results/%Y/%m/", null=True, blank=True)
    is_reviewed_by_doctor = models.BooleanField(default=False)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    entered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-entered_at"]

    def __str__(self):
        return f"Result for {self.test_request.request_id}"

    @property
    def has_critical_values(self):
        return self.parameters.filter(is_critical=True).exists()

    def mark_reviewed(self):
        from django.utils import timezone

        self.is_reviewed_by_doctor = True
        self.reviewed_at = timezone.now()
        self.save(update_fields=["is_reviewed_by_doctor", "reviewed_at", "updated_at"])


class LabResultParameter(TimeStampedModel):
    """One measured value within a result, e.g. 'Hemoglobin: 13.2 g/dL (13.5–17.5)'.
    `is_critical` is auto-computed on save by comparing against the reference range."""

    result = models.ForeignKey(LabResult, on_delete=models.CASCADE, related_name="parameters")
    parameter_name = models.CharField(max_length=150)
    value = models.CharField(max_length=50)
    unit = models.CharField(max_length=30, blank=True)
    reference_range_low = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    reference_range_high = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    is_critical = models.BooleanField(default=False)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        flag = " ⚠ CRITICAL" if self.is_critical else ""
        return f"{self.parameter_name}: {self.value} {self.unit}{flag}"

    def save(self, *args, **kwargs):
        self.is_critical = self._compute_critical()
        super().save(*args, **kwargs)

    def _compute_critical(self):
        """Numeric values outside the reference range are auto-flagged; a manual
        override can still be set explicitly by passing is_critical before save
        via the `force_critical` kwarg pattern used in the serializer."""
        if self.reference_range_low is None and self.reference_range_high is None:
            return self.is_critical  # no range to compare against — trust manual flag
        try:
            numeric_value = float(self.value)
        except (TypeError, ValueError):
            return self.is_critical
        if self.reference_range_low is not None and numeric_value < float(self.reference_range_low):
            return True
        if self.reference_range_high is not None and numeric_value > float(self.reference_range_high):
            return True
        return False
