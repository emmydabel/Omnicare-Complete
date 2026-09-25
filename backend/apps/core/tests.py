"""
Tests for the RBAC permission primitives every viewset in the project
builds on. These are deliberately isolated from HTTP/URL routing — they
instantiate the permission classes directly against a bare request object,
since `has_permission`/`has_object_permission` only ever look at
`request.user` and (for object checks) the target object.

Run with: python manage.py test apps.core
"""
from django.test import RequestFactory, TestCase

from apps.core.permissions import (
    IsAdmin, IsClinicalStaff, IsDoctor, IsOwnerOrStaff,
    IsPatient, ReadOnlyOrNonPatientStaff, role_permission,
)
from apps.core.test_utils import make_admin, make_doctor, make_nurse, make_patient, make_pharmacist


class RolePermissionFactoryTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.doctor = make_doctor().user
        self.nurse = make_nurse().user
        self.patient = make_patient().user
        self.pharmacist = make_pharmacist().user
        self.admin = make_admin()

    def _request(self, user):
        req = self.factory.get("/")
        req.user = user
        return req

    def test_single_role_permission_allows_only_that_role(self):
        perm = IsDoctor()
        self.assertTrue(perm.has_permission(self._request(self.doctor), None))
        self.assertFalse(perm.has_permission(self._request(self.nurse), None))
        self.assertFalse(perm.has_permission(self._request(self.patient), None))

    def test_multi_role_permission_allows_any_listed_role(self):
        perm = IsClinicalStaff()  # doctor, nurse
        self.assertTrue(perm.has_permission(self._request(self.doctor), None))
        self.assertTrue(perm.has_permission(self._request(self.nurse), None))
        self.assertFalse(perm.has_permission(self._request(self.patient), None))
        self.assertFalse(perm.has_permission(self._request(self.pharmacist), None))

    def test_admin_only_excludes_every_other_role(self):
        perm = IsAdmin()
        self.assertTrue(perm.has_permission(self._request(self.admin), None))
        for user in (self.doctor, self.nurse, self.patient, self.pharmacist):
            self.assertFalse(perm.has_permission(self._request(user), None))

    def test_anonymous_user_is_always_denied(self):
        from django.contrib.auth.models import AnonymousUser

        perm = role_permission("admin", "doctor", "nurse", "patient", "pharmacist")()
        req = self._request(AnonymousUser())
        self.assertFalse(perm.has_permission(req, None))

    def test_patient_permission_rejects_every_staff_role(self):
        perm = IsPatient()
        self.assertTrue(perm.has_permission(self._request(self.patient), None))
        for user in (self.doctor, self.nurse, self.pharmacist, self.admin):
            self.assertFalse(perm.has_permission(self._request(user), None))


class IsOwnerOrStaffTests(TestCase):
    """Object-level check used by endpoints where a patient should only
    touch their own resource but any staff role may access it for care
    reasons — this is the one guarding a lot of patient-facing data."""

    def setUp(self):
        self.factory = RequestFactory()
        self.patient_profile = make_patient()
        self.other_patient_profile = make_patient()
        self.doctor = make_doctor().user
        self.perm = IsOwnerOrStaff()

    def _request(self, user):
        req = self.factory.get("/")
        req.user = user
        return req

    def test_patient_can_access_own_object_via_direct_user_attr(self):
        req = self._request(self.patient_profile.user)
        # Simulate an object exposing `.user` directly (e.g. a profile object)
        self.assertTrue(self.perm.has_object_permission(req, None, self.patient_profile))

    def test_patient_cannot_access_another_patients_object(self):
        req = self._request(self.patient_profile.user)
        self.assertFalse(self.perm.has_object_permission(req, None, self.other_patient_profile))

    def test_patient_can_access_own_object_via_nested_patient_chain(self):
        """Simulates objects like Invoice/Appointment that expose `.patient.user`
        rather than `.user` directly."""

        class FakeRecord:
            def __init__(self, patient):
                self.patient = patient

        req = self._request(self.patient_profile.user)
        record = FakeRecord(self.patient_profile)
        self.assertTrue(self.perm.has_object_permission(req, None, record))

    def test_staff_can_access_any_patients_object(self):
        req = self._request(self.doctor)
        self.assertTrue(self.perm.has_object_permission(req, None, self.patient_profile))
        self.assertTrue(self.perm.has_object_permission(req, None, self.other_patient_profile))


class ReadOnlyOrNonPatientStaffTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.perm = ReadOnlyOrNonPatientStaff()
        self.patient = make_patient().user
        self.nurse = make_nurse().user

    def test_patient_can_read_but_not_write(self):
        get_req = self.factory.get("/")
        get_req.user = self.patient
        self.assertTrue(self.perm.has_permission(get_req, None))

        post_req = self.factory.post("/")
        post_req.user = self.patient
        self.assertFalse(self.perm.has_permission(post_req, None))

    def test_clinical_staff_can_write(self):
        post_req = self.factory.post("/")
        post_req.user = self.nurse
        self.assertTrue(self.perm.has_permission(post_req, None))
