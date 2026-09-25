from django.contrib import admin

from .models import PharmacistProfile


@admin.register(PharmacistProfile)
class PharmacistProfileAdmin(admin.ModelAdmin):
    list_display = ("pharmacist_id", "user", "pharmacy_branch", "years_of_experience")
    list_filter = ("pharmacy_branch",)
    search_fields = ("pharmacist_id", "user__first_name", "user__last_name")
    autocomplete_fields = ("user",)
    readonly_fields = ("pharmacist_id", "created_at", "updated_at")
