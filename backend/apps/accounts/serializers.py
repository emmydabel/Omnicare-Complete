from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "role", "phone_number", "is_active", "date_joined",
        ]
        read_only_fields = ["id", "role", "is_active", "date_joined"]


class PatientRegisterSerializer(serializers.Serializer):
    """Public self-registration — always creates a PATIENT account + profile."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(
        choices=[("male", "Male"), ("female", "Female"), ("other", "Other")],
        required=False, allow_blank=True,
    )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        from apps.patients.models import PatientProfile

        profile_fields = {
            "date_of_birth": validated_data.pop("date_of_birth", None),
            "gender": validated_data.pop("gender", ""),
        }
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone_number=validated_data.get("phone_number", ""),
            role=User.Role.PATIENT,
        )
        PatientProfile.objects.create(user=user, **profile_fields)
        return user


class StaffCreateSerializer(serializers.Serializer):
    """Admin-only: provisions Doctor / Nurse / Pharmacist / Admin accounts."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=[c for c in User.Role.choices if c[0] != User.Role.PATIENT]
    )
    # Role-specific profile fields — only the ones relevant to `role` are used.
    specialization = serializers.CharField(required=False, allow_blank=True)
    license_number = serializers.CharField(required=False, allow_blank=True)
    department = serializers.CharField(required=False, allow_blank=True)
    years_of_experience = serializers.IntegerField(required=False, default=0)
    consultation_fee = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, default=0)
    shift = serializers.ChoiceField(
        choices=[("morning", "Morning"), ("evening", "Evening"), ("night", "Night")],
        required=False, allow_blank=True,
    )
    pharmacy_branch = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        from apps.doctors.models import DoctorProfile
        from apps.nurses.models import NurseProfile
        from apps.pharmacists.models import PharmacistProfile

        role = validated_data["role"]
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone_number=validated_data.get("phone_number", ""),
            role=role,
            is_staff=(role == User.Role.ADMIN),
        )

        if role == User.Role.DOCTOR:
            DoctorProfile.objects.create(
                user=user,
                specialization=validated_data.get("specialization", "General Medicine"),
                license_number=validated_data.get("license_number", ""),
                department=validated_data.get("department", "General"),
                years_of_experience=validated_data.get("years_of_experience", 0) or 0,
                consultation_fee=validated_data.get("consultation_fee", 0) or 0,
            )
        elif role == User.Role.NURSE:
            NurseProfile.objects.create(
                user=user,
                department=validated_data.get("department", "General"),
                shift=validated_data.get("shift", "morning"),
                license_number=validated_data.get("license_number", ""),
            )
        elif role == User.Role.PHARMACIST:
            PharmacistProfile.objects.create(
                user=user,
                license_number=validated_data.get("license_number", ""),
                pharmacy_branch=validated_data.get("pharmacy_branch", "Main Pharmacy"),
            )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds role/name claims to the JWT and a full user object to the login response."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = user.get_full_name()
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value
