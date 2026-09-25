from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class PatientProfile(TimeStampedModel):
    """Clinical/demographic profile attached 1:1 to a User with role=patient."""

    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"

    class BloodGroup(models.TextChoices):
        A_POS = "A+", "A+"
        A_NEG = "A-", "A-"
        B_POS = "B+", "B+"
        B_NEG = "B-", "B-"
        AB_POS = "AB+", "AB+"
        AB_NEG = "AB-", "AB-"
        O_POS = "O+", "O+"
        O_NEG = "O-", "O-"
        UNKNOWN = "unknown", "Unknown"

    class AdmissionStatus(models.TextChoices):
        OUTPATIENT = "outpatient", "Outpatient"
        ADMITTED = "admitted", "Admitted"
        DISCHARGED = "discharged", "Discharged"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="patient_profile"
    )
    patient_id = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True)
    blood_group = models.CharField(max_length=10, choices=BloodGroup.choices, default=BloodGroup.UNKNOWN)
    address = models.TextField(blank=True)
    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    insurance_provider = models.CharField(max_length=150, blank=True)
    insurance_policy_number = models.CharField(max_length=100, blank=True)

    admission_status = models.CharField(
        max_length=20, choices=AdmissionStatus.choices, default=AdmissionStatus.OUTPATIENT
    )
    ward = models.CharField(max_length=50, blank=True)
    bed_number = models.CharField(max_length=20, blank=True)
    admitting_doctor = models.ForeignKey(
        "doctors.DoctorProfile", on_delete=models.SET_NULL, null=True, blank=True, related_name="admitted_patients"
    )
    admitted_at = models.DateTimeField(null=True, blank=True)
    discharged_at = models.DateTimeField(null=True, blank=True)
    discharge_summary = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["admission_status"]),
            models.Index(fields=["patient_id"]),
        ]

    def __str__(self):
        return f"{self.patient_id} — {self.user.get_full_name()}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and not self.patient_id:
            self.patient_id = f"P-{self.pk:06d}"
            super().save(update_fields=["patient_id"])

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        from datetime import date

        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    def admit(self, ward, bed_number="", doctor=None):
        from django.utils import timezone

        self.admission_status = self.AdmissionStatus.ADMITTED
        self.ward = ward
        self.bed_number = bed_number
        self.admitting_doctor = doctor
        self.admitted_at = timezone.now()
        self.discharged_at = None
        self.save()

    def discharge(self, summary=""):
        from django.utils import timezone

        self.admission_status = self.AdmissionStatus.DISCHARGED
        self.discharged_at = timezone.now()
        self.discharge_summary = summary or self.discharge_summary
        self.save()
