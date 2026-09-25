from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.accounts.models import User

from .models import PatientProfile


class PatientProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    age = serializers.IntegerField(read_only=True)
    admitting_doctor_name = serializers.SerializerMethodField()

    # Flat write-through fields so the frontend can PATCH contact info without
    # a nested user payload.
    first_name = serializers.CharField(source="user.first_name", write_only=True, required=False)
    last_name = serializers.CharField(source="user.last_name", write_only=True, required=False)
    phone_number = serializers.CharField(source="user.phone_number", write_only=True, required=False, allow_blank=True)

    class Meta:
        model = PatientProfile
        fields = [
            "id", "user", "patient_id", "date_of_birth", "age", "gender", "blood_group",
            "address", "emergency_contact_name", "emergency_contact_phone",
            "insurance_provider", "insurance_policy_number",
            "admission_status", "ward", "bed_number", "admitting_doctor", "admitting_doctor_name",
            "admitted_at", "discharged_at", "discharge_summary",
            "created_at", "updated_at",
            "first_name", "last_name", "phone_number",
        ]
        read_only_fields = ["id", "patient_id", "created_at", "updated_at", "admitted_at", "discharged_at"]

    def get_admitting_doctor_name(self, obj):
        return obj.admitting_doctor.user.get_full_name() if obj.admitting_doctor_id else None

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if user_data:
            for attr, value in user_data.items():
                setattr(instance.user, attr, value)
            instance.user.save(update_fields=list(user_data.keys()))
        return super().update(instance, validated_data)


class PatientAdmitSerializer(serializers.Serializer):
    ward = serializers.CharField(max_length=50)
    bed_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    doctor_id = serializers.IntegerField(required=False, allow_null=True)


class PatientDischargeSerializer(serializers.Serializer):
    discharge_summary = serializers.CharField(required=False, allow_blank=True)
