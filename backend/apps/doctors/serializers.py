from rest_framework import serializers

from apps.accounts.serializers import UserSerializer

from .models import DoctorAvailability, DoctorProfile, DoctorShift


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    weekday_display = serializers.CharField(source="get_weekday_display", read_only=True)

    class Meta:
        model = DoctorAvailability
        fields = ["id", "doctor", "weekday", "weekday_display", "start_time", "end_time", "is_active"]


class DoctorShiftSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.user.get_full_name", read_only=True)
    shift_type_display = serializers.CharField(source="get_shift_type_display", read_only=True)

    class Meta:
        model = DoctorShift
        fields = [
            "id", "doctor", "doctor_name", "date", "shift_type", "shift_type_display",
            "start_time", "end_time", "department", "status", "notes",
        ]


class DoctorProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    first_name = serializers.CharField(source="user.first_name", write_only=True, required=False)
    last_name = serializers.CharField(source="user.last_name", write_only=True, required=False)
    phone_number = serializers.CharField(source="user.phone_number", write_only=True, required=False, allow_blank=True)
    availability_slots = DoctorAvailabilitySerializer(many=True, read_only=True)
    upcoming_shifts = serializers.SerializerMethodField()
    patient_count = serializers.SerializerMethodField()

    class Meta:
        model = DoctorProfile
        fields = [
            "id", "user", "doctor_id", "specialization", "department", "license_number",
            "years_of_experience", "consultation_fee", "bio", "qualifications",
            "is_available_for_booking", "availability_slots", "upcoming_shifts", "patient_count",
            "created_at", "updated_at", "first_name", "last_name", "phone_number",
        ]
        read_only_fields = ["id", "doctor_id", "created_at", "updated_at"]

    def get_upcoming_shifts(self, obj):
        from django.utils import timezone

        qs = obj.shifts.filter(date__gte=timezone.now().date(), status="scheduled").order_by("date")[:5]
        return DoctorShiftSerializer(qs, many=True).data

    def get_patient_count(self, obj):
        return obj.appointments.values("patient_id").distinct().count() if hasattr(obj, "appointments") else 0

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if user_data:
            for attr, value in user_data.items():
                setattr(instance.user, attr, value)
            instance.user.save(update_fields=list(user_data.keys()))
        return super().update(instance, validated_data)
