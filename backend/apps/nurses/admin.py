from django.contrib import admin

from .models import NurseProfile


@admin.register(NurseProfile)
class NurseProfileAdmin(admin.ModelAdmin):
    list_display = ("nurse_id", "user", "department", "shift", "assigned_ward", "years_of_experience")
    list_filter = ("department", "shift")
    search_fields = ("nurse_id", "user__first_name", "user__last_name")
    autocomplete_fields = ("user",)
    readonly_fields = ("nurse_id", "created_at", "updated_at")
