from django.contrib import admin

from .models import PatientProfile


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ("patient_id", "user", "gender", "blood_group", "admission_status", "ward", "created_at")
    list_filter = ("admission_status", "gender", "blood_group")
    search_fields = ("patient_id", "user__first_name", "user__last_name", "user__email")
    autocomplete_fields = ("user", "admitting_doctor")
    readonly_fields = ("patient_id", "created_at", "updated_at")
