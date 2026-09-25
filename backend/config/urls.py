"""
Central API routing.

Every plain-CRUD viewset is registered here on one DefaultRouter so the whole
API surface is visible at a glance. `accounts` and `ai_assistant` keep their own
urls.py because their endpoints aren't simple model CRUD (auth flows, chat).
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.appointments.views import AppointmentViewSet
from apps.billing.views import InsuranceClaimViewSet, InvoiceViewSet
from apps.doctors.views import DoctorAvailabilityViewSet, DoctorProfileViewSet, DoctorShiftViewSet
from apps.labs.views import LabResultViewSet, LabTestRequestViewSet
from apps.medical_records.views import AllergyViewSet, MedicalRecordViewSet, VitalSignViewSet
from apps.nurses.views import NurseProfileViewSet
from apps.patients.views import PatientProfileViewSet
from apps.pharmacists.views import PharmacistProfileViewSet
from apps.pharmacy.views import MedicineViewSet, StockTransactionViewSet
from apps.prescriptions.views import PrescriptionViewSet

router = DefaultRouter()
router.register(r"patients", PatientProfileViewSet, basename="patient")
router.register(r"doctors", DoctorProfileViewSet, basename="doctor")
router.register(r"doctor-availability", DoctorAvailabilityViewSet, basename="doctoravailability")
router.register(r"doctor-shifts", DoctorShiftViewSet, basename="doctorshift")
router.register(r"nurses", NurseProfileViewSet, basename="nurse")
router.register(r"pharmacists", PharmacistProfileViewSet, basename="pharmacist")
router.register(r"appointments", AppointmentViewSet, basename="appointment")
router.register(r"medical-records", MedicalRecordViewSet, basename="medicalrecord")
router.register(r"allergies", AllergyViewSet, basename="allergy")
router.register(r"vitals", VitalSignViewSet, basename="vitalsign")
router.register(r"prescriptions", PrescriptionViewSet, basename="prescription")
router.register(r"medicines", MedicineViewSet, basename="medicine")
router.register(r"stock-transactions", StockTransactionViewSet, basename="stocktransaction")
router.register(r"invoices", InvoiceViewSet, basename="invoice")
router.register(r"insurance-claims", InsuranceClaimViewSet, basename="insuranceclaim")
router.register(r"lab-requests", LabTestRequestViewSet, basename="labtestrequest")
router.register(r"lab-results", LabResultViewSet, basename="labresult")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/ai-assistant/", include("apps.ai_assistant.urls")),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
