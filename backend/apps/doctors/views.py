from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsAdmin, IsAdminOrClinicalStaff, ReadOnlyOrNonPatientStaff

from .models import DoctorAvailability, DoctorProfile, DoctorShift
from .serializers import DoctorAvailabilitySerializer, DoctorProfileSerializer, DoctorShiftSerializer


class DoctorProfileViewSet(viewsets.ModelViewSet):
    """
    Doctor directory. Readable by any authenticated role (patients need this to
    book appointments); writes restricted to admin (provisioning) or the doctor
    updating their own bio/availability flag.
    """

    queryset = DoctorProfile.objects.select_related("user").prefetch_related("availability_slots")
    serializer_class = DoctorProfileSerializer
    permission_classes = [ReadOnlyOrNonPatientStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["department", "specialization", "is_available_for_booking"]
    search_fields = ["user__first_name", "user__last_name", "specialization", "department", "doctor_id"]
    ordering_fields = ["created_at", "years_of_experience", "consultation_fee"]

    def get_permissions(self):
        if self.action == "destroy":
            return [IsAdmin()]
        return super().get_permissions()

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if self.request.method not in ("GET", "HEAD", "OPTIONS") and user.role == "doctor" and obj.user_id != user.id and user.role != "admin":
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Doctors may only edit their own profile.")
        return obj

    @action(detail=False, methods=["get"])
    def departments(self, request):
        depts = DoctorProfile.objects.values_list("department", flat=True).distinct().order_by("department")
        return Response(list(depts))

    @action(detail=True, methods=["get"])
    def schedule(self, request, pk=None):
        """Combined weekly availability + upcoming dated shifts for the calendar view."""
        doctor = self.get_object()
        availability = DoctorAvailabilitySerializer(doctor.availability_slots.filter(is_active=True), many=True).data
        shifts = DoctorShiftSerializer(doctor.shifts.order_by("date"), many=True).data
        return Response({"availability": availability, "shifts": shifts})


class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [IsAdminOrClinicalStaff]
    filterset_fields = ["doctor", "weekday", "is_active"]
    filter_backends = [DjangoFilterBackend]

    def get_queryset(self):
        user = self.request.user
        qs = DoctorAvailability.objects.select_related("doctor__user")
        if user.role == "doctor":
            return qs.filter(doctor__user=user)
        return qs


class DoctorShiftViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorShiftSerializer
    permission_classes = [IsAdminOrClinicalStaff]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["doctor", "date", "shift_type", "status", "department"]
    ordering_fields = ["date", "start_time"]

    def get_queryset(self):
        user = self.request.user
        qs = DoctorShift.objects.select_related("doctor__user")
        if user.role == "doctor":
            return qs.filter(doctor__user=user)
        return qs
