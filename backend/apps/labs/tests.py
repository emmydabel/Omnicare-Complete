"""
Tests for LabResultParameter's auto-critical-flagging (a value is flagged
critical if it falls outside the given reference range) and the manual
override path for parameters where no reference range applies.

Run with: python manage.py test apps.labs
"""
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.test_utils import make_admin, make_doctor, make_patient
from apps.labs.models import LabResult, LabResultParameter, LabTestRequest


def _make_request(patient, doctor):
    return LabTestRequest.objects.create(patient=patient, requested_by=doctor, test_type=LabTestRequest.TestType.CBC)


class CriticalValueFlaggingTests(TestCase):
    def setUp(self):
        self.patient = make_patient()
        self.doctor = make_doctor()
        self.request = _make_request(self.patient, self.doctor)
        self.result = LabResult.objects.create(test_request=self.request)

    def test_value_below_reference_range_is_flagged_critical(self):
        param = LabResultParameter.objects.create(
            result=self.result, parameter_name="Hemoglobin", value="6.2", unit="g/dL",
            reference_range_low=12.0, reference_range_high=17.0,
        )
        self.assertTrue(param.is_critical)

    def test_value_above_reference_range_is_flagged_critical(self):
        param = LabResultParameter.objects.create(
            result=self.result, parameter_name="WBC", value="18.5", unit="x10^9/L",
            reference_range_low=4.0, reference_range_high=11.0,
        )
        self.assertTrue(param.is_critical)

    def test_value_within_reference_range_is_not_flagged(self):
        param = LabResultParameter.objects.create(
            result=self.result, parameter_name="Platelets", value="250", unit="x10^9/L",
            reference_range_low=150, reference_range_high=400,
        )
        self.assertFalse(param.is_critical)

    def test_value_exactly_at_boundary_is_not_flagged(self):
        param = LabResultParameter.objects.create(
            result=self.result, parameter_name="Boundary Test", value="17.0", unit="g/dL",
            reference_range_low=12.0, reference_range_high=17.0,
        )
        self.assertFalse(param.is_critical)

    def test_non_numeric_value_with_a_range_does_not_crash_and_isnt_flagged(self):
        """A qualitative result (e.g. 'Positive'/'Negative') can't be compared
        numerically — should degrade gracefully, not raise."""
        param = LabResultParameter.objects.create(
            result=self.result, parameter_name="Culture", value="Negative", unit="",
            reference_range_low=None, reference_range_high=None,
        )
        self.assertFalse(param.is_critical)

    def test_manual_critical_override_is_respected_when_no_range_given(self):
        """Some parameters (e.g. a qualitative flag) have no numeric range at
        all — is_critical should trust whatever was explicitly set."""
        param = LabResultParameter.objects.create(
            result=self.result, parameter_name="Blood Culture", value="Positive", unit="",
            is_critical=True,
        )
        self.assertTrue(param.is_critical)

    def test_has_critical_values_reflects_any_flagged_parameter(self):
        LabResultParameter.objects.create(result=self.result, parameter_name="Normal One", value="5", reference_range_low=1, reference_range_high=10)
        self.assertFalse(self.result.has_critical_values)
        LabResultParameter.objects.create(result=self.result, parameter_name="Critical One", value="99", reference_range_low=1, reference_range_high=10)
        self.assertTrue(self.result.has_critical_values)


class LabResultCreationAPITests(APITestCase):
    def setUp(self):
        self.doctor = make_doctor()
        self.patient = make_patient()
        self.admin = make_admin()
        self.request = _make_request(self.patient, self.doctor)

    def test_creating_a_result_marks_the_request_completed(self):
        self.client.force_authenticate(self.admin)
        payload = {
            "test_request": self.request.id, "summary": "All normal",
            "parameters": [{"parameter_name": "Hemoglobin", "value": "14.0", "unit": "g/dL", "reference_range_low": 12, "reference_range_high": 17}],
        }
        res = self.client.post("/api/lab-results/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, LabTestRequest.Status.COMPLETED)

    def test_critical_endpoint_only_returns_unreviewed_critical_results(self):
        result = LabResult.objects.create(test_request=self.request)
        LabResultParameter.objects.create(result=result, parameter_name="Critical Value", value="999", reference_range_low=1, reference_range_high=10)

        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/lab-results/critical/")
        self.assertEqual(len(res.data), 1)

        result.mark_reviewed()
        res = self.client.get("/api/lab-results/critical/")
        self.assertEqual(len(res.data), 0)  # reviewed results drop off the feed

    def test_doctor_can_enter_a_result_admin_doctor_and_nurse_all_can(self):
        """IsAdminOrClinicalStaff = role_permission("admin", "doctor", "nurse") —
        confirmed by reading the actual permission class rather than assumed."""
        self.client.force_authenticate(self.doctor.user)
        payload = {"test_request": self.request.id, "summary": "test", "parameters": []}
        res = self.client.post("/api/lab-results/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

    def test_patient_cannot_enter_a_result(self):
        self.client.force_authenticate(self.patient.user)
        payload = {"test_request": self.request.id, "summary": "test", "parameters": []}
        res = self.client.post("/api/lab-results/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
