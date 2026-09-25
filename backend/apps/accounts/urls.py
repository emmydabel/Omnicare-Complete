from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("staff/create/", views.StaffCreateView.as_view(), name="auth-staff-create"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("change-password/", views.ChangePasswordView.as_view(), name="auth-change-password"),
    path("users/", views.UserListView.as_view(), name="auth-user-list"),
    path("users/<int:pk>/toggle-active/", views.ToggleUserActiveView.as_view(), name="auth-user-toggle-active"),
]
