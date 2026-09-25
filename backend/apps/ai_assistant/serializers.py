from rest_framework import serializers

from .models import ChatMessage, ChatSession


class ChatMessageSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="session.user.get_full_name", read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "session", "role", "content", "is_urgent", "created_at", "patient_name"]
        read_only_fields = fields


class ChatSessionSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    message_count = serializers.IntegerField(source="messages.count", read_only=True)

    class Meta:
        model = ChatSession
        fields = [
            "id", "title", "is_active", "patient_context", "created_at", "updated_at",
            "last_message", "message_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        if not last:
            return None
        preview = last.content[:120] + ("…" if len(last.content) > 120 else "")
        return {"role": last.role, "preview": preview, "created_at": last.created_at}


class ChatSessionDetailSerializer(ChatSessionSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta(ChatSessionSerializer.Meta):
        fields = ChatSessionSerializer.Meta.fields + ["messages"]


class SendMessageSerializer(serializers.Serializer):
    session_id = serializers.PrimaryKeyRelatedField(
        source="session", queryset=ChatSession.objects.all(), required=False, allow_null=True
    )
    message = serializers.CharField(max_length=4000, allow_blank=False)
    patient_context_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_session(self, session):
        request = self.context["request"]
        if session.user_id != request.user.id:
            raise serializers.ValidationError("That conversation doesn't belong to you.")
        return session

    def validate(self, attrs):
        session = attrs.get("session")
        if session is not None:
            self.validate_session(session)
        return attrs
