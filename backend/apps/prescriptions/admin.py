from django.contrib import admin

from .models import Prescription, PrescriptionItem


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 0
    readonly_fields = ("is_dispensed", "dispensed_at", "dispensed_by")


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("prescription_id", "patient", "doctor", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("prescription_id", "patient__user__first_name", "patient__user__last_name")
    autocomplete_fields = ("patient", "doctor", "medical_record")
    readonly_fields = ("prescription_id", "created_at", "updated_at")
    inlines = [PrescriptionItemInline]
