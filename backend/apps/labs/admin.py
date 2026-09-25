from django.contrib import admin

from .models import LabResult, LabResultParameter, LabTestRequest


class LabResultParameterInline(admin.TabularInline):
    model = LabResultParameter
    extra = 1


class LabResultInline(admin.StackedInline):
    model = LabResult
    extra = 0
    readonly_fields = ("entered_at",)


@admin.register(LabTestRequest)
class LabTestRequestAdmin(admin.ModelAdmin):
    list_display = ("request_id", "patient", "test_type", "priority", "status", "created_at")
    list_filter = ("status", "priority", "test_type")
    search_fields = ("request_id", "patient__patient_id", "patient__user__first_name", "patient__user__last_name")
    autocomplete_fields = ("patient", "requested_by")
    readonly_fields = ("request_id", "created_at", "updated_at")
    inlines = [LabResultInline]


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ("test_request", "entered_by", "is_reviewed_by_doctor", "entered_at")
    list_filter = ("is_reviewed_by_doctor",)
    autocomplete_fields = ("test_request", "entered_by")
    inlines = [LabResultParameterInline]
