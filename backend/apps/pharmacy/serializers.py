from rest_framework import serializers

from .models import Medicine, StockTransaction


class MedicineSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    dosage_form_display = serializers.CharField(source="get_dosage_form_display", read_only=True)

    class Meta:
        model = Medicine
        fields = [
            "id", "sku", "name", "generic_name", "category", "category_display", "dosage_form",
            "dosage_form_display", "strength", "manufacturer", "batch_number", "unit_price",
            "stock_quantity", "reorder_level", "expiry_date", "is_active",
            "is_low_stock", "is_expiring_soon", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "sku", "stock_quantity", "created_at", "updated_at"]


class StockTransactionSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)

    class Meta:
        model = StockTransaction
        fields = [
            "id", "medicine", "medicine_name", "transaction_type", "quantity",
            "resulting_quantity", "performed_by", "performed_by_name", "note", "created_at",
        ]
        read_only_fields = ["id", "resulting_quantity", "performed_by", "created_at"]


class StockAdjustSerializer(serializers.Serializer):
    delta = serializers.IntegerField(help_text="Positive to restock, negative to write off / correct downward.")
    note = serializers.CharField(required=False, allow_blank=True)
