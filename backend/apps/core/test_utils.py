"""
Shared helpers for building test fixtures — used by every app's tests.py so
role/profile creation isn't copy-pasted six times. Not itself a test module
(no TestCase classes here), so Django's test runner won't try to collect it
directly, but it's colocated in `core` since that's where shared RBAC/model
base classes already live.
"""
from django.contrib.auth import get_user_model

User = get_user_model()


def make_user(role, email=None, password="TestPass123!", **extra):
    email = email or f"{role}-{User.objects.count()}@test.omnicare.dev"
    return User.objects.create_user(
        email=email, password=password, role=role,
        first_name=extra.pop("first_name", role.capitalize()),
        last_name=extra.pop("last_name", "Tester"),
        **extra,
    )


def make_patient(email=None, **extra):
    from apps.patients.models import PatientProfile

    user = make_user("patient", email=email)
    return PatientProfile.objects.create(user=user, **extra)


def make_doctor(email=None, department="General Medicine", **extra):
    from apps.doctors.models import DoctorProfile

    user = make_user("doctor", email=email)
    return DoctorProfile.objects.create(
        user=user, department=department, specialization=extra.pop("specialization", "General Practice"),
        license_number=extra.pop("license_number", f"MD-{user.id:05d}"),
        years_of_experience=extra.pop("years_of_experience", 5),
        consultation_fee=extra.pop("consultation_fee", "100.00"), **extra,
    )


def make_nurse(email=None, **extra):
    from apps.nurses.models import NurseProfile

    user = make_user("nurse", email=email)
    return NurseProfile.objects.create(
        user=user, department=extra.pop("department", "Emergency"), shift=extra.pop("shift", "morning"),
        license_number=extra.pop("license_number", f"RN-{user.id:05d}"), **extra,
    )


def make_pharmacist(email=None, **extra):
    from apps.pharmacists.models import PharmacistProfile

    user = make_user("pharmacist", email=email)
    return PharmacistProfile.objects.create(
        user=user, license_number=extra.pop("license_number", f"RX-{user.id:05d}"), **extra,
    )


def make_admin(email=None, **extra):
    return make_user("admin", email=email, is_staff=True, **extra)
