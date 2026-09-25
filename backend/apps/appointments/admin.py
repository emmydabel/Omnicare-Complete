from django.contrib import admin

from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("appointment_id", "patient", "doctor", "scheduled_start", "status", "visit_type")
    list_filter = ("status", "visit_type", "department")
    search_fields = ("appointment_id", "patient__user__first_name", "patient__user__last_name", "doctor__user__last_name")
    autocomplete_fields = ("patient", "doctor", "created_by")
    readonly_fields = ("appointment_id", "created_at", "updated_at")
    date_hierarchy = "scheduled_start"
