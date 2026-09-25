from django.contrib import admin

from .models import ChatMessage, ChatSession


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ("role", "content", "is_urgent", "created_at")
    can_delete = False


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "patient_context", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("title", "user__email", "user__first_name", "user__last_name")
    autocomplete_fields = ("user", "patient_context")
    inlines = [ChatMessageInline]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("session", "role", "is_urgent", "created_at")
    list_filter = ("role", "is_urgent")
    search_fields = ("content", "session__user__email")
    readonly_fields = ("created_at",)
