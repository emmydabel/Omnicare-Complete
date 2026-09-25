"""
Auth flow tests: patient self-registration, login, JWT issuance, admin
staff-provisioning, and RBAC on the user directory endpoint.

Run with: python manage.py test apps.accounts
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.test_utils import make_admin, make_doctor, make_patient

User = get_user_model()


class RegistrationTests(APITestCase):
    def test_patient_can_self_register(self):
        payload = {
            "email": "new.patient@test.omnicare.dev", "password": "StrongPass123!",
            "first_name": "Jordan", "last_name": "Ellis", "phone_number": "+1-555-0100",
        }
        res = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["role"], "patient")

        # A PatientProfile should exist for the new user (registration isn't
        # just a bare User row — it needs the profile for the rest of the
        # system, e.g. the patient_id generator, to work).
        user = User.objects.get(email="new.patient@test.omnicare.dev")
        self.assertTrue(hasattr(user, "patient_profile"))

    def test_duplicate_email_is_rejected(self):
        make_patient(email="taken@test.omnicare.dev")
        payload = {"email": "taken@test.omnicare.dev", "password": "StrongPass123!", "first_name": "A", "last_name": "B"}
        res = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_always_creates_a_patient_regardless_of_role_in_payload(self):
        """Public registration must never let a caller grant themselves a
        privileged role — this is the kind of bug that matters."""
        payload = {
            "email": "sneaky@test.omnicare.dev", "password": "StrongPass123!",
            "first_name": "Sneaky", "last_name": "User", "role": "admin",
        }
        res = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["user"]["role"], "patient")


class LoginTests(APITestCase):
    def setUp(self):
        self.patient_profile = make_patient(email="login.test@test.omnicare.dev")
        self.patient_profile.user.set_password("CorrectPass123!")
        self.patient_profile.user.save()

    def test_login_with_correct_credentials_issues_tokens(self):
        res = self.client.post(
            "/api/auth/login/", {"email": "login.test@test.omnicare.dev", "password": "CorrectPass123!"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["email"], "login.test@test.omnicare.dev")

    def test_login_with_wrong_password_is_rejected(self):
        res = self.client.post(
            "/api/auth/login/", {"email": "login.test@test.omnicare.dev", "password": "WrongPassword!"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_account_cannot_log_in(self):
        self.patient_profile.user.is_active = False
        self.patient_profile.user.save()
        res = self.client.post(
            "/api/auth/login/", {"email": "login.test@test.omnicare.dev", "password": "CorrectPass123!"}, format="json"
        )
        self.assertNotEqual(res.status_code, status.HTTP_200_OK)


class StaffCreationTests(APITestCase):
    def setUp(self):
        self.admin = make_admin(email="admin.test@test.omnicare.dev")
        self.doctor = make_doctor(email="doctor.test@test.omnicare.dev").user

    def test_admin_can_create_a_doctor_account(self):
        self.client.force_authenticate(self.admin)
        payload = {
            "email": "new.doctor@test.omnicare.dev", "password": "StrongPass123!",
            "first_name": "Nia", "last_name": "Osei", "role": "doctor",
            "specialization": "Cardiology", "department": "Cardiology",
            "license_number": "MD-99999", "years_of_experience": 4, "consultation_fee": "120.00",
        }
        res = self.client.post("/api/auth/staff/create/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(User.objects.get(email="new.doctor@test.omnicare.dev").role, "doctor")

    def test_non_admin_cannot_create_staff_accounts(self):
        self.client.force_authenticate(self.doctor)
        payload = {
            "email": "blocked@test.omnicare.dev", "password": "StrongPass123!",
            "first_name": "X", "last_name": "Y", "role": "nurse", "department": "ICU", "shift": "night",
        }
        res = self.client.post("/api/auth/staff/create/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_create_staff_accounts(self):
        payload = {"email": "blocked2@test.omnicare.dev", "password": "StrongPass123!", "first_name": "X", "last_name": "Y", "role": "nurse"}
        res = self.client.post("/api/auth/staff/create/", payload, format="json")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))


class UserDirectoryRBACTests(APITestCase):
    """The user directory (/api/auth/users/) exposes every account in the
    system — this must be admin-only, full stop."""

    def setUp(self):
        self.admin = make_admin(email="admin2@test.omnicare.dev")
        self.doctor = make_doctor(email="doctor2@test.omnicare.dev").user
        self.patient = make_patient(email="patient2@test.omnicare.dev").user

    def test_admin_can_list_users(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/auth/users/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_doctor_cannot_list_users(self):
        self.client.force_authenticate(self.doctor)
        res = self.client.get("/api/auth/users/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_cannot_list_users(self):
        self.client.force_authenticate(self.patient)
        res = self.client.get("/api/auth/users/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_toggle_active_is_admin_only(self):
        target = make_patient(email="toggle-target@test.omnicare.dev").user
        self.client.force_authenticate(self.doctor)
        res = self.client.post(f"/api/auth/users/{target.id}/toggle-active/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/auth/users/{target.id}/toggle-active/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        target.refresh_from_db()
        self.assertFalse(target.is_active)
