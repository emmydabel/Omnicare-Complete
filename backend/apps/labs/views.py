from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsAdminOrClinicalStaff, IsDoctor

from .models import LabResult, LabTestRequest
from .serializers import LabResultSerializer, LabTestRequestSerializer


def _scope_to_patient_if_needed(request, qs, patient_field="patient"):
    if request.user.role == "patient":
        return qs.filter(**{f"{patient_field}__user": request.user})
    return qs


class LabTestRequestViewSet(viewsets.ModelViewSet):
    """
    Lab order lifecycle: Requested -> Sample Collected -> In Progress -> Completed.
    Doctors create requests; nurses/admins progress the workflow and log results
    (there's no separate lab-technician role in this system, so that
    responsibility sits with clinical staff); patients have read-only access to
    their own tests, which is the "result-to-patient linking" the record
    provides implicitly via the `patient` foreign key.
    """

    serializer_class = LabTestRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "priority", "test_type", "patient"]
    search_fields = ["request_id", "patient__patient_id", "patient__user__first_name", "patient__user__last_name"]
    ordering_fields = ["created_at", "priority"]

    def get_queryset(self):
        qs = LabTestRequest.objects.select_related(
            "patient__user", "requested_by__user"
        ).prefetch_related("result__parameters")
        qs = _scope_to_patient_if_needed(self.request, qs)
        if self.request.user.role == "doctor":
            # Doctors see requests they personally ordered, plus anything for
            # their own patients — kept broad (all) since any doctor may need
            # to review results for a colleague's patient during rounds.
            return qs
        return qs

    def get_permissions(self):
        if self.action == "create":
            return [IsDoctor()]
        if self.action in ("update", "partial_update", "destroy", "update_status"):
            return [IsAdminOrClinicalStaff()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        doctor_profile = getattr(self.request.user, "doctor_profile", None)
        serializer.save(requested_by=doctor_profile)

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        test_request = self.get_object()
        new_status = request.data.get("status")
        if new_status not in LabTestRequest.Status.values:
            return Response({"detail": "Invalid status."}, status=400)
        test_request.status = new_status
        if new_status == LabTestRequest.Status.SAMPLE_COLLECTED:
            test_request.sample_collected_at = timezone.now()
        test_request.save()
        return Response(LabTestRequestSerializer(test_request).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = self.get_queryset()
        return Response({
            "total": qs.count(),
            "pending": qs.exclude(status__in=["completed", "cancelled"]).count(),
            "stat_priority": qs.filter(priority=LabTestRequest.Priority.STAT).exclude(status="completed").count(),
            "completed_today": qs.filter(
                status="completed", updated_at__date=timezone.now().date()
            ).count(),
        })


class LabResultViewSet(viewsets.ModelViewSet):
    serializer_class = LabResultSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["is_reviewed_by_doctor"]

    def get_queryset(self):
        qs = LabResult.objects.select_related(
            "test_request__patient__user", "entered_by"
        ).prefetch_related("parameters")
        return _scope_to_patient_if_needed(self.request, qs, patient_field="test_request__patient")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrClinicalStaff()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["post"], permission_classes=[IsDoctor])
    def mark_reviewed(self, request, pk=None):
        result = self.get_object()
        result.mark_reviewed()
        return Response(LabResultSerializer(result).data)

    @action(detail=False, methods=["get"])
    def critical(self, request):
        """Unreviewed results containing at least one critical value — this is
        the data source for the dashboard's 'flag urgent cases' widget."""
        qs = self.get_queryset().filter(parameters__is_critical=True, is_reviewed_by_doctor=False).distinct()
        return Response(LabResultSerializer(qs, many=True).data)
