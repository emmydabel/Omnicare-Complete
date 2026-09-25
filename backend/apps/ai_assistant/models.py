from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class ChatSession(TimeStampedModel):
    """
    One ARIA conversation thread. Conversation history lives in the database
    (ChatMessage rows below), not in any external memory library — each request
    reconstructs the rolling message array straight from these rows and hands
    it to the Gemini API. See apps/ai_assistant/services.py.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_sessions")
    title = models.CharField(max_length=255, default="New Conversation")
    is_active = models.BooleanField(default=True)
    patient_context = models.ForeignKey(
        "patients.PatientProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_sessions",
        help_text="If set, ARIA was given this patient's record summary as context "
        "(clinical staff use — e.g. asking ARIA to summarize a chart).",
    )

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["user", "-updated_at"])]

    def __str__(self):
        return f"{self.title} ({self.user.email})"


class ChatMessage(TimeStampedModel):
    class Role(models.TextChoices):
        USER = "user", "User"
        MODEL = "model", "ARIA"

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    is_urgent = models.BooleanField(
        default=False, help_text="Auto-flagged when the message content matches urgent/emergency patterns."
    )

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["session", "created_at"])]

    def __str__(self):
        preview = self.content[:50] + ("…" if len(self.content) > 50 else "")
        return f"[{self.role}] {preview}"
