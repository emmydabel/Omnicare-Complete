from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsAdminOrClinicalStaff
from apps.patients.models import PatientProfile

from .models import ChatMessage, ChatSession
from .serializers import (
    ChatMessageSerializer,
    ChatSessionDetailSerializer,
    ChatSessionSerializer,
    SendMessageSerializer,
)
from .services import aria_service


class ChatSessionListCreateView(generics.ListCreateAPIView):
    """GET: this user's conversation list (most recent first).
    POST: start a new, empty session (a session is also auto-created lazily by
    SendMessageView if the client doesn't create one explicitly first)."""

    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user, is_active=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ChatSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET: full session with message history. PATCH: rename. DELETE: archive
    (soft-delete via is_active=False, so history is retained for audit)."""

    serializer_class = ChatSessionDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class SendMessageView(APIView):
    """
    POST {session_id?, message, patient_context_id?} -> ARIA's reply.

    If `session_id` is omitted, a new session is created automatically. If
    `patient_context_id` is supplied by clinical staff, that patient's chart
    summary is injected as grounding context for this turn only (see
    services._patient_context_block) — this is what powers "summarize this
    patient's record" style requests.
    """

    permission_classes = [IsAuthenticated]
    throttle_scope = "ai_chat"

    def post(self, request):
        serializer = SendMessageSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        session = data.get("session")
        if session is None:
            session = ChatSession.objects.create(user=request.user)

        patient_profile = None
        patient_context_id = data.get("patient_context_id")
        if patient_context_id and request.user.role != "patient":
            patient_profile = PatientProfile.objects.filter(pk=patient_context_id).first()
            if patient_profile and session.patient_context_id != patient_profile.id:
                session.patient_context = patient_profile
                session.save(update_fields=["patient_context"])

        assistant_message = aria_service.send_message(
            session=session,
            user=request.user,
            message_text=data["message"],
            patient_profile=patient_profile,
        )

        return Response(
            {
                "session": ChatSessionSerializer(session).data,
                "message": ChatMessageSerializer(assistant_message).data,
            },
            status=status.HTTP_200_OK,
        )


class UrgentFlagsView(generics.ListAPIView):
    """
    Staff-facing feed of recent ARIA conversations where a patient's own
    message matched an urgent/emergency pattern — this is the "flagging
    urgent cases" requirement surfaced somewhere clinical staff will actually
    see it, not just left inside the patient's private chat window.
    """

    serializer_class = ChatMessageSerializer
    permission_classes = [IsAdminOrClinicalStaff]

    def get_queryset(self):
        return (
            ChatMessage.objects.filter(
                is_urgent=True, role=ChatMessage.Role.USER, session__user__role="patient"
            )
            .select_related("session__user")
            .order_by("-created_at")[:50]
        )
