from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.core.permissions import role_permission

from .models import Appointment
from .serializers import AppointmentCreateSerializer, AppointmentSerializer, AppointmentTransitionSerializer

CanManageAppointments = role_permission("admin", "doctor", "nurse")


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    Book / reschedule / cancel / track status.

    Queryset is role-scoped: patients see only their own bookings, doctors see
    only their own patient list, nurses/admins see everything (coordination).
    Pharmacists have no legitimate reason to browse appointments, so they get
    an empty queryset rather than a 403 (keeps the shared router endpoint simple).
    """

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "visit_type", "doctor", "patient", "department"]
    search_fields = ["appointment_id", "patient__user__first_name", "patient__user__last_name", "doctor__user__last_name"]
    ordering_fields = ["scheduled_start", "created_at"]

    def get_serializer_class(self):
        if self.action == "create":
            return AppointmentCreateSerializer
        return AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Appointment.objects.select_related("patient__user", "doctor__user")
        if user.role == "patient":
            return qs.filter(patient__user=user)
        if user.role == "doctor":
            return qs.filter(doctor__user=user)
        if user.role == "pharmacist":
            return qs.none()
        return qs  # admin, nurse

    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy", "transition"):
            return [CanManageAppointments()]
        return super().get_permissions()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == "patient":
            from apps.patients.models import PatientProfile

            patient_profile = PatientProfile.objects.filter(user=user).first()
            if not patient_profile:
                raise ValidationError("No patient profile found for this account.")
            serializer.save(patient=patient_profile, created_by=user, status=Appointment.Status.SCHEDULED)
        else:
            serializer.save(created_by=user, status=Appointment.Status.SCHEDULED)

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        """Move an appointment through Scheduled -> Confirmed -> In Progress -> Completed,
        or sideways into Cancelled / No Show. Enforces the allowed state machine."""
        appointment = self.get_object()
        serializer = AppointmentTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]

        if not appointment.can_transition_to(new_status):
            return Response(
                {"detail": f"Cannot move an appointment from '{appointment.status}' to '{new_status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = new_status
        if new_status == Appointment.Status.CANCELLED:
            appointment.cancellation_reason = serializer.validated_data.get("cancellation_reason", "")
        appointment.save()
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Convenience shortcut for transition(status='cancelled')."""
        appointment = self.get_object()
        if not appointment.can_transition_to(Appointment.Status.CANCELLED):
            return Response(
                {"detail": f"Cannot cancel an appointment that is already '{appointment.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        appointment.status = Appointment.Status.CANCELLED
        appointment.cancellation_reason = request.data.get("cancellation_reason", "")
        appointment.save()
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=False, methods=["get"])
    def today(self, request):
        now = timezone.localtime()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timezone.timedelta(days=1)
        qs = self.filter_queryset(self.get_queryset()).filter(scheduled_start__gte=start, scheduled_start__lt=end)
        page = self.paginate_queryset(qs)
        serializer = AppointmentSerializer(page or qs, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = self.get_queryset()
        by_status = {choice.value: qs.filter(status=choice.value).count() for choice in Appointment.Status}
        return Response({"total": qs.count(), "by_status": by_status})
