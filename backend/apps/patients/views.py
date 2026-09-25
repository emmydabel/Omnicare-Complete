from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsAdminOrClinicalStaff, IsNonPatientStaff

from .models import PatientProfile
from .serializers import PatientAdmitSerializer, PatientDischargeSerializer, PatientProfileSerializer


class PatientProfileViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for patient profiles.

    - patient: sees only their own record (read-only for admission fields)
    - doctor / nurse / pharmacist: read access to all patients (care coordination)
    - admin: full CRUD, including admit/discharge
    """

    serializer_class = PatientProfileSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["admission_status", "gender", "blood_group", "ward"]
    search_fields = ["patient_id", "user__first_name", "user__last_name", "user__email", "phone_number"]
    ordering_fields = ["created_at", "user__first_name", "admitted_at"]

    def get_queryset(self):
        user = self.request.user
        qs = PatientProfile.objects.select_related("user", "admitting_doctor__user")
        if user.role == "patient":
            return qs.filter(user=user)
        return qs

    def get_permissions(self):
        if self.action in ("create", "destroy", "admit", "discharge"):
            return [IsAdminOrClinicalStaff()] if self.action != "destroy" else [IsNonPatientStaff()]
        return super().get_permissions()

    @action(detail=True, methods=["post"], permission_classes=[IsAdminOrClinicalStaff])
    def admit(self, request, pk=None):
        patient = self.get_object()
        serializer = PatientAdmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doctor = None
        doctor_id = serializer.validated_data.get("doctor_id")
        if doctor_id:
            from apps.doctors.models import DoctorProfile

            doctor = DoctorProfile.objects.filter(pk=doctor_id).first()
        patient.admit(
            ward=serializer.validated_data["ward"],
            bed_number=serializer.validated_data.get("bed_number", ""),
            doctor=doctor,
        )
        return Response(PatientProfileSerializer(patient).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminOrClinicalStaff])
    def discharge(self, request, pk=None):
        patient = self.get_object()
        serializer = PatientDischargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient.discharge(summary=serializer.validated_data.get("discharge_summary", ""))
        return Response(PatientProfileSerializer(patient).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = self.get_queryset()
        return Response({
            "total": qs.count(),
            "admitted": qs.filter(admission_status=PatientProfile.AdmissionStatus.ADMITTED).count(),
            "outpatient": qs.filter(admission_status=PatientProfile.AdmissionStatus.OUTPATIENT).count(),
            "discharged": qs.filter(admission_status=PatientProfile.AdmissionStatus.DISCHARGED).count(),
        })
