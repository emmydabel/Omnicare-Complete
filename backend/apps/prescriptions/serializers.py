from rest_framework import serializers

from apps.pharmacy.models import Medicine

from .models import Prescription, PrescriptionItem


class PrescriptionItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    medicine_stock = serializers.IntegerField(source="medicine.stock_quantity", read_only=True)
    dispensed_by_name = serializers.CharField(source="dispensed_by.get_full_name", read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = [
            "id", "prescription", "medicine", "medicine_name", "medicine_stock", "dosage", "frequency",
            "duration_days", "quantity", "instructions", "is_dispensed", "dispensed_at", "dispensed_by",
            "dispensed_by_name",
        ]
        read_only_fields = ["id", "is_dispensed", "dispensed_at", "dispensed_by"]


class PrescriptionItemInputSerializer(serializers.Serializer):
    """Used only when nested inside PrescriptionSerializer.create()."""

    medicine = serializers.PrimaryKeyRelatedField(queryset=Medicine.objects.all())
    dosage = serializers.CharField(max_length=100)
    frequency = serializers.CharField(max_length=100)
    duration_days = serializers.IntegerField(default=7)
    quantity = serializers.IntegerField(min_value=1)
    instructions = serializers.CharField(max_length=255, required=False, allow_blank=True)


class PrescriptionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.user.get_full_name", read_only=True)
    doctor_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    items = PrescriptionItemSerializer(many=True, read_only=True)
    items_input = PrescriptionItemInputSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Prescription
        fields = [
            "id", "prescription_id", "patient", "patient_name", "doctor", "doctor_name",
            "medical_record", "status", "status_display", "notes", "items", "items_input",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "prescription_id", "status", "created_at", "updated_at"]

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.get_full_name()}"

    def create(self, validated_data):
        items_data = validated_data.pop("items_input", [])
        prescription = Prescription.objects.create(**validated_data)
        for item in items_data:
            PrescriptionItem.objects.create(prescription=prescription, **item)
        return prescription


class DispenseItemSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
