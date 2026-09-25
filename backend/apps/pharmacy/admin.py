from django.contrib import admin

from .models import Medicine, StockTransaction


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "category", "dosage_form", "stock_quantity", "reorder_level", "unit_price", "expiry_date", "is_active")
    list_filter = ("category", "dosage_form", "is_active")
    search_fields = ("sku", "name", "generic_name", "manufacturer")
    readonly_fields = ("sku", "created_at", "updated_at")


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ("medicine", "transaction_type", "quantity", "resulting_quantity", "performed_by", "created_at")
    list_filter = ("transaction_type",)
    search_fields = ("medicine__name",)
    autocomplete_fields = ("medicine", "performed_by")
