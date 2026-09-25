from rest_framework import serializers

from .models import Allergy, MedicalRecord, VitalSign


class AllergySerializer(serializers.ModelSerializer):
    noted_by_name = serializers.CharField(source="noted_by.get_full_name", read_only=True)

    class Meta:
        model = Allergy
        fields = ["id", "patient", "allergen", "reaction", "severity", "noted_by", "noted_by_name", "created_at"]
        read_only_fields = ["id", "noted_by", "created_at"]


class VitalSignSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)
    patient_name = serializers.CharField(source="patient.user.get_full_name", read_only=True)
    is_critical = serializers.BooleanField(read_only=True)

    class Meta:
        model = VitalSign
        fields = [
            "id", "patient", "patient_name", "recorded_by", "recorded_by_name",
            "heart_rate", "blood_pressure_systolic", "blood_pressure_diastolic",
            "temperature_celsius", "respiratory_rate", "oxygen_saturation",
            "notes", "recorded_at", "is_critical",
        ]
        read_only_fields = ["id", "recorded_by", "recorded_at"]


class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.user.get_full_name", read_only=True)
    doctor_name = serializers.SerializerMethodField()
    record_type_display = serializers.CharField(source="get_record_type_display", read_only=True)
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = MedicalRecord
        fields = [
            "id", "record_id", "patient", "patient_name", "doctor", "doctor_name", "appointment",
            "record_type", "record_type_display", "visit_date", "diagnosis", "treatment_plan",
            "doctor_notes", "icd_code", "attachment", "attachment_url", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "record_id", "created_at", "updated_at"]
        extra_kwargs = {"attachment": {"write_only": True, "required": False}}

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.get_full_name()}" if obj.doctor_id else "—"

    def get_attachment_url(self, obj):
        request = self.context.get("request")
        if obj.attachment and request:
            return request.build_absolute_uri(obj.attachment.url)
        return None


class PatientChartSerializer(serializers.Serializer):
    """Aggregate view used by the EMR 'patient chart' screen: everything about
    one patient in a single response, so the frontend doesn't fan out 4 requests."""

    records = MedicalRecordSerializer(many=True)
    allergies = AllergySerializer(many=True)
    recent_vitals = VitalSignSerializer(many=True)
