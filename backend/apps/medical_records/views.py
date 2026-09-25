from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.core.permissions import IsAdminOrClinicalStaff, role_permission
from apps.patients.models import PatientProfile

from .models import Allergy, MedicalRecord, VitalSign
from .serializers import AllergySerializer, MedicalRecordSerializer, PatientChartSerializer, VitalSignSerializer

CanRecordVitals = role_permission("admin", "doctor", "nurse")


def _patient_scoped_queryset(request, base_qs, patient_field="patient"):
    user = request.user
    if user.role == "patient":
        return base_qs.filter(**{f"{patient_field}__user": user})
    if user.role == "pharmacist":
        return base_qs.none()
    return base_qs


class MedicalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalRecordSerializer
    permission_classes = [IsAdminOrClinicalStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["patient", "doctor", "record_type"]
    search_fields = ["record_id", "diagnosis", "patient__user__first_name", "patient__user__last_name"]
    ordering_fields = ["visit_date", "created_at"]

    def get_queryset(self):
        qs = MedicalRecord.objects.select_related("patient__user", "doctor__user")
        return _patient_scoped_queryset(self.request, qs)

    def get_permissions(self):
        if self.action in ("list", "retrieve", "chart"):
            from rest_framework.permissions import IsAuthenticated

            return [IsAuthenticated()]
        return super().get_permissions()

    def perform_create(self, serializer):
        doctor = None
        user = self.request.user
        if user.role == "doctor":
            from apps.doctors.models import DoctorProfile

            doctor = DoctorProfile.objects.filter(user=user).first()
        serializer.save(doctor=doctor or serializer.validated_data.get("doctor"))

    @action(detail=False, methods=["get"], url_path="patient-chart/(?P<patient_id>[^/.]+)")
    def chart(self, request, patient_id=None):
        """Full clinical picture for one patient: records + allergies + recent vitals."""
        user = request.user
        try:
            patient = PatientProfile.objects.get(pk=patient_id)
        except PatientProfile.DoesNotExist:
            return Response({"detail": "Patient not found."}, status=404)

        if user.role == "patient" and patient.user_id != user.id:
            raise PermissionDenied("You may only view your own chart.")
        if user.role == "pharmacist":
            raise PermissionDenied("Pharmacists do not have EMR access.")

        data = {
            "records": patient.medical_records.select_related("doctor__user").all(),
            "allergies": patient.allergies.all(),
            "recent_vitals": patient.vital_signs.all()[:10],
        }
        return Response(PatientChartSerializer(data).data)


class AllergyViewSet(viewsets.ModelViewSet):
    serializer_class = AllergySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["patient", "severity"]

    def get_queryset(self):
        qs = Allergy.objects.select_related("patient__user", "noted_by")
        user = self.request.user
        if user.role == "patient":
            return qs.filter(patient__user=user)
        # Pharmacists CAN read allergies (dispensing safety) even though they're
        # locked out of the rest of the EMR.
        return qs

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrClinicalStaff()]
        from rest_framework.permissions import IsAuthenticated

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(noted_by=self.request.user)


class VitalSignViewSet(viewsets.ModelViewSet):
    serializer_class = VitalSignSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["patient"]
    ordering_fields = ["recorded_at"]

    def get_queryset(self):
        qs = VitalSign.objects.select_related("patient__user", "recorded_by")
        return _patient_scoped_queryset(self.request, qs)

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [CanRecordVitals()]
        from rest_framework.permissions import IsAuthenticated

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    @action(detail=False, methods=["get"])
    def live_feed(self, request):
        """Most recent reading per patient — powers the dashboard's real-time
        vitals monitor widget without the frontend having to fan out per-patient."""
        qs = self.filter_queryset(self.get_queryset())[:25]
        return Response(VitalSignSerializer(qs, many=True).data)
