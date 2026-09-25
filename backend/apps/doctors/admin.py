from django.contrib import admin

from .models import DoctorAvailability, DoctorProfile, DoctorShift


class DoctorAvailabilityInline(admin.TabularInline):
    model = DoctorAvailability
    extra = 0


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ("doctor_id", "user", "specialization", "department", "years_of_experience", "is_available_for_booking")
    list_filter = ("department", "specialization", "is_available_for_booking")
    search_fields = ("doctor_id", "user__first_name", "user__last_name", "license_number")
    autocomplete_fields = ("user",)
    readonly_fields = ("doctor_id", "created_at", "updated_at")
    inlines = [DoctorAvailabilityInline]


@admin.register(DoctorShift)
class DoctorShiftAdmin(admin.ModelAdmin):
    list_display = ("doctor", "date", "shift_type", "start_time", "end_time", "status")
    list_filter = ("shift_type", "status", "date")
    search_fields = ("doctor__user__first_name", "doctor__user__last_name")
    autocomplete_fields = ("doctor",)
