"""
Tests for ARIA. The Gemini API call itself is mocked by pre-setting
`AriaService._client` directly on a service instance — this sidesteps
needing to know the exact internals of the `google-genai` SDK (which isn't
even installed in the environment these tests were written in) and instead
verifies the one contract that actually matters: our code calls
`client.models.generate_content(...)` and does the right thing with
whatever comes back. No real network call happens in any test here, by
design — that's the correct way to test code that wraps an external paid
API, not a limitation of this test suite.

Run with: python manage.py test apps.ai_assistant
"""
from unittest.mock import MagicMock

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ai_assistant.models import ChatMessage, ChatSession
from apps.ai_assistant.services import AriaService, detect_urgent
from apps.core.test_utils import make_admin, make_doctor, make_patient


def _mocked_service(reply_text="This is a mocked ARIA reply."):
    service = AriaService()
    fake_response = MagicMock()
    fake_response.text = reply_text
    fake_client = MagicMock()
    fake_client.models.generate_content.return_value = fake_response
    service._client = fake_client  # bypasses the lazy genai.Client(...) creation entirely
    return service, fake_client


class UrgentDetectionTests(TestCase):
    def test_detects_common_emergency_phrases(self):
        for phrase in ["I have chest pain", "I can't breathe", "severe bleeding from the wound", "sudden slurred speech"]:
            self.assertTrue(detect_urgent(phrase), f"expected urgent: {phrase!r}")

    def test_does_not_flag_ordinary_messages(self):
        for phrase in ["I have a mild headache", "what's my appointment time tomorrow", "how do I refill my prescription"]:
            self.assertFalse(detect_urgent(phrase), f"expected NOT urgent: {phrase!r}")

    def test_is_case_insensitive(self):
        self.assertTrue(detect_urgent("CHEST PAIN since this morning"))

    def test_empty_or_none_input_does_not_crash(self):
        self.assertFalse(detect_urgent(""))
        self.assertFalse(detect_urgent(None))


class AriaServiceMockedCallTests(TestCase):
    def setUp(self):
        self.patient = make_patient()
        self.session = ChatSession.objects.create(user=self.patient.user)

    def test_send_message_persists_both_user_and_model_messages(self):
        service, _ = _mocked_service("Take some rest and stay hydrated.")
        reply = service.send_message(session=self.session, user=self.patient.user, message_text="I have a headache")

        self.assertEqual(reply.role, ChatMessage.Role.MODEL)
        self.assertEqual(reply.content, "Take some rest and stay hydrated.")
        self.assertEqual(self.session.messages.count(), 2)
        self.assertEqual(self.session.messages.first().role, ChatMessage.Role.USER)

    def test_urgent_user_message_flags_both_the_question_and_gets_a_crisis_notice_appended(self):
        service, _ = _mocked_service("Please seek help.")
        reply = service.send_message(session=self.session, user=self.patient.user, message_text="I have chest pain and can't breathe")

        user_message = self.session.messages.filter(role=ChatMessage.Role.USER).first()
        self.assertTrue(user_message.is_urgent)
        self.assertTrue(reply.is_urgent)
        self.assertIn("988", reply.content)  # crisis notice appended for patients

    def test_rolling_history_includes_prior_messages_in_the_gemini_call(self):
        service, fake_client = _mocked_service()
        service.send_message(session=self.session, user=self.patient.user, message_text="first message")
        service.send_message(session=self.session, user=self.patient.user, message_text="second message")

        # Second call's `contents` kwarg should include the first exchange.
        _, second_call_kwargs = fake_client.models.generate_content.call_args_list[1]
        contents_texts = [part["parts"][0]["text"] for part in second_call_kwargs["contents"]]
        self.assertTrue(any("first message" in t for t in contents_texts))
        self.assertTrue(any("second message" in t for t in contents_texts))

    def test_gemini_failure_falls_back_gracefully_instead_of_raising(self):
        service = AriaService()
        fake_client = MagicMock()
        fake_client.models.generate_content.side_effect = Exception("simulated network failure")
        service._client = fake_client

        reply = service.send_message(session=self.session, user=self.patient.user, message_text="hello")
        self.assertEqual(reply.role, ChatMessage.Role.MODEL)
        self.assertIn("trouble reaching", reply.content.lower())

    def test_role_aware_system_instruction_differs_for_patient_vs_doctor(self):
        service, fake_client = _mocked_service()
        doctor = make_doctor()
        doctor_session = ChatSession.objects.create(user=doctor.user)

        service.send_message(session=self.session, user=self.patient.user, message_text="test")
        service.send_message(session=doctor_session, user=doctor.user, message_text="test")

        patient_call_kwargs = fake_client.models.generate_content.call_args_list[0][1]
        doctor_call_kwargs = fake_client.models.generate_content.call_args_list[1][1]
        patient_instruction = patient_call_kwargs["config"].system_instruction
        doctor_instruction = doctor_call_kwargs["config"].system_instruction
        self.assertNotEqual(patient_instruction, doctor_instruction)
        self.assertIn("diagnose", patient_instruction.lower())  # patient prompt explicitly forbids this


class ChatAPITests(APITestCase):
    def setUp(self):
        self.patient = make_patient()
        self.admin = make_admin()

    def test_chat_endpoint_creates_a_session_automatically_when_none_given(self):
        import apps.ai_assistant.views as views_module

        _, fake_client = _mocked_service("Hello, how can I help?")
        views_module.aria_service._client = fake_client

        self.client.force_authenticate(self.patient.user)
        res = self.client.post("/api/ai-assistant/chat/", {"message": "hi"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertIn("session", res.data)
        self.assertIn("message", res.data)
        self.assertTrue(ChatSession.objects.filter(user=self.patient.user).exists())

    def test_cannot_send_a_message_into_someone_elses_session(self):
        other_patient = make_patient()
        other_session = ChatSession.objects.create(user=other_patient.user)

        self.client.force_authenticate(self.patient.user)
        res = self.client.post("/api/ai-assistant/chat/", {"session_id": other_session.id, "message": "hi"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_urgent_flags_feed_is_staff_only(self):
        self.client.force_authenticate(self.patient.user)
        res = self.client.get("/api/ai-assistant/urgent-flags/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/ai-assistant/urgent-flags/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
