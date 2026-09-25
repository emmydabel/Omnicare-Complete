from rest_framework import serializers

from .models import Invoice, InvoiceItem, InsuranceClaim


class InvoiceItemSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceItem
        fields = ["id", "item_type", "description", "quantity", "unit_price", "amount"]


class PatientMiniSerializer(serializers.Serializer):
    """Lightweight patient snapshot embedded in invoice lists — avoids importing
    the full PatientProfileSerializer (which would create a circular import)."""

    id = serializers.IntegerField()
    patient_id = serializers.CharField()
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return obj.user.get_full_name()


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, required=False)
    patient_name = serializers.CharField(source="patient.user.get_full_name", read_only=True)
    patient_display_id = serializers.CharField(source="patient.patient_id", read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "invoice_number", "patient", "patient_name", "patient_display_id", "appointment",
            "status", "issue_date", "due_date", "tax_rate_percent", "discount_amount", "amount_paid",
            "payment_method", "paid_at", "notes", "items", "subtotal", "tax_amount", "total_amount",
            "balance_due", "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "invoice_number", "issue_date", "paid_at", "created_by", "created_at", "updated_at"]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        request = self.context.get("request")
        invoice = Invoice.objects.create(
            created_by=request.user if request else None, **validated_data
        )
        for item in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item)
        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        instance = super().update(instance, validated_data)
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                InvoiceItem.objects.create(invoice=instance, **item)
        return instance


class RecordPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    payment_method = serializers.ChoiceField(choices=Invoice.PaymentMethod.choices)


class InsuranceClaimSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.user.get_full_name", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)

    class Meta:
        model = InsuranceClaim
        fields = [
            "id", "claim_number", "invoice", "invoice_number", "patient", "patient_name",
            "insurance_provider", "policy_number", "claim_amount", "approved_amount",
            "status", "submitted_at", "processed_at", "notes",
        ]
        read_only_fields = ["id", "claim_number", "submitted_at", "processed_at"]
