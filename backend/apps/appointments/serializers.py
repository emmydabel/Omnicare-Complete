from rest_framework import serializers

from apps.doctors.models import DoctorProfile
from apps.patients.models import PatientProfile

from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.user.get_full_name", read_only=True)
    patient_code = serializers.CharField(source="patient.patient_id", read_only=True)
    doctor_name = serializers.SerializerMethodField()
    doctor_specialization = serializers.CharField(source="doctor.specialization", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    visit_type_display = serializers.CharField(source="get_visit_type_display", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id", "appointment_id", "patient", "patient_name", "patient_code",
            "doctor", "doctor_name", "doctor_specialization", "department", "visit_type",
            "visit_type_display", "scheduled_start", "scheduled_end", "status", "status_display",
            "reason", "notes", "cancellation_reason", "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "appointment_id", "status", "created_by", "created_at", "updated_at"]

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.get_full_name()}"

    def validate(self, attrs):
        start = attrs.get("scheduled_start", getattr(self.instance, "scheduled_start", None))
        end = attrs.get("scheduled_end", getattr(self.instance, "scheduled_end", None))
        if start and end and end <= start:
            raise serializers.ValidationError({"scheduled_end": "End time must be after start time."})

        doctor = attrs.get("doctor", getattr(self.instance, "doctor", None))
        if doctor and start and end:
            clashes = Appointment.objects.filter(
                doctor=doctor,
                scheduled_start__lt=end,
                scheduled_end__gt=start,
            ).exclude(status__in=[Appointment.Status.CANCELLED, Appointment.Status.NO_SHOW])
            if self.instance:
                clashes = clashes.exclude(pk=self.instance.pk)
            if clashes.exists():
                raise serializers.ValidationError(
                    {"scheduled_start": "This doctor already has an appointment in that time window."}
                )
        return attrs


class AppointmentCreateSerializer(AppointmentSerializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=PatientProfile.objects.all())
    doctor = serializers.PrimaryKeyRelatedField(queryset=DoctorProfile.objects.all())


class AppointmentTransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Appointment.Status.choices)
    cancellation_reason = serializers.CharField(required=False, allow_blank=True)
