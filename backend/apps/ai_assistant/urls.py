from django.urls import path

from . import views

urlpatterns = [
    path("sessions/", views.ChatSessionListCreateView.as_view(), name="aria-sessions"),
    path("sessions/<int:pk>/", views.ChatSessionDetailView.as_view(), name="aria-session-detail"),
    path("chat/", views.SendMessageView.as_view(), name="aria-chat"),
    path("urgent-flags/", views.UrgentFlagsView.as_view(), name="aria-urgent-flags"),
]
