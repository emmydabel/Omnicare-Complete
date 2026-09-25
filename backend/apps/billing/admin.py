from django.contrib import admin

from .models import Invoice, InvoiceItem, InsuranceClaim


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "patient", "status", "total_amount", "amount_paid", "due_date", "created_at")
    list_filter = ("status", "payment_method")
    search_fields = ("invoice_number", "patient__patient_id", "patient__user__first_name", "patient__user__last_name")
    autocomplete_fields = ("patient", "appointment", "created_by")
    readonly_fields = ("invoice_number", "issue_date", "created_at", "updated_at")
    inlines = [InvoiceItemInline]

    @admin.display(description="Total")
    def total_amount(self, obj):
        return obj.total_amount


@admin.register(InsuranceClaim)
class InsuranceClaimAdmin(admin.ModelAdmin):
    list_display = ("claim_number", "patient", "insurance_provider", "status", "claim_amount", "submitted_at")
    list_filter = ("status", "insurance_provider")
    search_fields = ("claim_number", "patient__patient_id", "insurance_provider", "policy_number")
    autocomplete_fields = ("patient", "invoice")
    readonly_fields = ("claim_number", "submitted_at")
