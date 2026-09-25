from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import role_permission

from .models import Prescription, PrescriptionItem
from .serializers import DispenseItemSerializer, PrescriptionSerializer

CanPrescribe = role_permission("admin", "doctor")
CanDispense = role_permission("admin", "pharmacist")


class PrescriptionViewSet(viewsets.ModelViewSet):
    """Doctor creates -> Pharmacist dispenses (item by item, decrementing stock)."""

    serializer_class = PrescriptionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "patient", "doctor"]
    search_fields = ["prescription_id", "patient__user__first_name", "patient__user__last_name"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Prescription.objects.select_related("patient__user", "doctor__user").prefetch_related("items__medicine")
        if user.role == "patient":
            return qs.filter(patient__user=user)
        if user.role == "doctor":
            return qs.filter(doctor__user=user)
        return qs  # admin, nurse, pharmacist

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [CanPrescribe()]
        if self.action == "dispense_item":
            return [CanDispense()]
        return super().get_permissions()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == "doctor":
            from apps.doctors.models import DoctorProfile

            doctor_profile = DoctorProfile.objects.filter(user=user).first()
            serializer.save(doctor=doctor_profile)
        else:
            serializer.save()

    @action(detail=True, methods=["post"], url_path="dispense-item")
    def dispense_item(self, request, pk=None):
        prescription = self.get_object()
        serializer = DispenseItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = prescription.items.get(pk=serializer.validated_data["item_id"])
            item.dispense(request.user)
        except PrescriptionItem.DoesNotExist:
            return Response({"detail": "Prescription item not found."}, status=404)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        prescription.refresh_from_db()
        return Response(PrescriptionSerializer(prescription).data)

    @action(detail=False, methods=["get"])
    def queue(self, request):
        """Pending/partially-dispensed prescriptions — the pharmacist's work queue."""
        qs = self.filter_queryset(self.get_queryset()).exclude(
            status__in=[Prescription.Status.DISPENSED, Prescription.Status.CANCELLED]
        )
        page = self.paginate_queryset(qs)
        serializer = PrescriptionSerializer(page or qs, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)
