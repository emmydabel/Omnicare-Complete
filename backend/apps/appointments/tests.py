"""
Tests for the appointment status state machine (Scheduled -> Confirmed ->
In Progress -> Completed, with Cancelled/No Show side-branches) and the
role-scoped queryset that keeps patients from seeing each other's bookings.

Run with: python manage.py test apps.appointments
"""
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.appointments.models import Appointment
from apps.core.test_utils import make_admin, make_doctor, make_nurse, make_patient, make_pharmacist


def _make_appointment(patient, doctor, status_=Appointment.Status.SCHEDULED, **extra):
    start = timezone.now() + timedelta(days=1)
    return Appointment.objects.create(
        patient=patient, doctor=doctor, scheduled_start=start, scheduled_end=start + timedelta(minutes=30),
        status=status_, reason="Test visit", **extra,
    )


class AppointmentStateMachineModelTests(APITestCase):
    """Pure model-level tests of can_transition_to — no HTTP involved, just
    the state machine rules themselves."""

    def setUp(self):
        self.patient = make_patient()
        self.doctor = make_doctor()

    def test_scheduled_can_move_to_confirmed_cancelled_or_no_show(self):
        appt = _make_appointment(self.patient, self.doctor, Appointment.Status.SCHEDULED)
        self.assertTrue(appt.can_transition_to(Appointment.Status.CONFIRMED))
        self.assertTrue(appt.can_transition_to(Appointment.Status.CANCELLED))
        self.assertTrue(appt.can_transition_to(Appointment.Status.NO_SHOW))

    def test_scheduled_cannot_skip_straight_to_completed(self):
        appt = _make_appointment(self.patient, self.doctor, Appointment.Status.SCHEDULED)
        self.assertFalse(appt.can_transition_to(Appointment.Status.COMPLETED))

    def test_completed_is_a_terminal_state(self):
        appt = _make_appointment(self.patient, self.doctor, Appointment.Status.COMPLETED)
        for target in (Appointment.Status.SCHEDULED, Appointment.Status.CONFIRMED, Appointment.Status.IN_PROGRESS, Appointment.Status.CANCELLED):
            self.assertFalse(appt.can_transition_to(target))

    def test_cancelled_is_a_terminal_state(self):
        appt = _make_appointment(self.patient, self.doctor, Appointment.Status.CANCELLED)
        for target in Appointment.Status:
            self.assertFalse(appt.can_transition_to(target))


class AppointmentTransitionAPITests(APITestCase):
    def setUp(self):
        self.patient = make_patient()
        self.doctor = make_doctor()
        self.nurse = make_nurse().user
        self.admin = make_admin()
        self.appt = _make_appointment(self.patient, self.doctor, Appointment.Status.SCHEDULED)

    def test_valid_transition_succeeds(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/appointments/{self.appt.id}/transition/", {"status": "confirmed"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.appt.refresh_from_db()
        self.assertEqual(self.appt.status, Appointment.Status.CONFIRMED)

    def test_invalid_transition_is_rejected_with_400(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/appointments/{self.appt.id}/transition/", {"status": "completed"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.appt.refresh_from_db()
        self.assertEqual(self.appt.status, Appointment.Status.SCHEDULED)  # unchanged

    def test_patient_cannot_transition_their_own_appointment(self):
        """Patients can cancel (separate action) but not drive the clinical
        workflow forward — that requires staff."""
        self.client.force_authenticate(self.patient.user)
        res = self.client.post(f"/api/appointments/{self.appt.id}/transition/", {"status": "confirmed"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_can_cancel_their_own_appointment(self):
        self.client.force_authenticate(self.patient.user)
        res = self.client.post(f"/api/appointments/{self.appt.id}/cancel/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.appt.refresh_from_db()
        self.assertEqual(self.appt.status, Appointment.Status.CANCELLED)

    def test_cannot_cancel_an_already_completed_appointment(self):
        self.appt.status = Appointment.Status.COMPLETED
        self.appt.save()
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/appointments/{self.appt.id}/cancel/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reschedule_via_plain_patch_updates_time(self):
        self.client.force_authenticate(self.admin)
        new_start = timezone.now() + timedelta(days=3)
        new_end = new_start + timedelta(minutes=30)
        res = self.client.patch(
            f"/api/appointments/{self.appt.id}/",
            {"scheduled_start": new_start.isoformat(), "scheduled_end": new_end.isoformat()},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.appt.refresh_from_db()
        self.assertEqual(self.appt.scheduled_start, new_start)


class AppointmentQuerysetScopingTests(APITestCase):
    """The permission classes only gate *endpoint* access — this is what
    actually prevents one patient from seeing another's appointments."""

    def setUp(self):
        self.doctor = make_doctor()
        self.other_doctor = make_doctor()
        self.patient_a = make_patient()
        self.patient_b = make_patient()
        self.appt_a = _make_appointment(self.patient_a, self.doctor)
        self.appt_b = _make_appointment(self.patient_b, self.other_doctor)

    def test_patient_only_sees_their_own_appointments(self):
        self.client.force_authenticate(self.patient_a.user)
        res = self.client.get("/api/appointments/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [a["id"] for a in res.data["results"]]
        self.assertIn(self.appt_a.id, ids)
        self.assertNotIn(self.appt_b.id, ids)

    def test_doctor_only_sees_their_own_patients_appointments(self):
        self.client.force_authenticate(self.doctor.user)
        res = self.client.get("/api/appointments/")
        ids = [a["id"] for a in res.data["results"]]
        self.assertIn(self.appt_a.id, ids)
        self.assertNotIn(self.appt_b.id, ids)

    def test_pharmacist_sees_no_appointments_at_all(self):
        pharmacist = make_pharmacist().user
        self.client.force_authenticate(pharmacist)
        res = self.client.get("/api/appointments/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)

    def test_admin_sees_every_appointment(self):
        admin = make_admin()
        self.client.force_authenticate(admin)
        res = self.client.get("/api/appointments/")
        ids = [a["id"] for a in res.data["results"]]
        self.assertIn(self.appt_a.id, ids)
        self.assertIn(self.appt_b.id, ids)
