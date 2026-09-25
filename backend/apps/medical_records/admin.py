from django.contrib import admin

from .models import Allergy, MedicalRecord, VitalSign


@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = ("record_id", "patient", "doctor", "record_type", "visit_date")
    list_filter = ("record_type", "visit_date")
    search_fields = ("record_id", "patient__user__first_name", "patient__user__last_name", "diagnosis")
    autocomplete_fields = ("patient", "doctor", "appointment")
    readonly_fields = ("record_id", "created_at", "updated_at")
    date_hierarchy = "visit_date"


@admin.register(Allergy)
class AllergyAdmin(admin.ModelAdmin):
    list_display = ("patient", "allergen", "severity", "noted_by")
    list_filter = ("severity",)
    search_fields = ("allergen", "patient__user__first_name", "patient__user__last_name")
    autocomplete_fields = ("patient", "noted_by")


@admin.register(VitalSign)
class VitalSignAdmin(admin.ModelAdmin):
    list_display = ("patient", "heart_rate", "blood_pressure_systolic", "blood_pressure_diastolic", "oxygen_saturation", "recorded_at")
    list_filter = ("recorded_at",)
    search_fields = ("patient__user__first_name", "patient__user__last_name")
    autocomplete_fields = ("patient", "recorded_by")
