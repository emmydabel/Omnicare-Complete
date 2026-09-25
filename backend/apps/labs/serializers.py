from rest_framework import serializers

from .models import LabResult, LabResultParameter, LabTestRequest


class LabResultParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabResultParameter
        fields = [
            "id", "parameter_name", "value", "unit",
            "reference_range_low", "reference_range_high", "is_critical",
        ]
        read_only_fields = ["id"]


class LabResultSerializer(serializers.ModelSerializer):
    parameters = LabResultParameterSerializer(many=True, required=False)
    has_critical_values = serializers.ReadOnlyField()
    entered_by_name = serializers.CharField(source="entered_by.get_full_name", read_only=True)

    class Meta:
        model = LabResult
        fields = [
            "id", "test_request", "entered_by", "entered_by_name", "summary", "attachment",
            "is_reviewed_by_doctor", "reviewed_at", "entered_at", "parameters", "has_critical_values",
        ]
        read_only_fields = ["id", "entered_by", "entered_at", "is_reviewed_by_doctor", "reviewed_at"]

    def create(self, validated_data):
        params = validated_data.pop("parameters", [])
        request = self.context.get("request")
        result = LabResult.objects.create(entered_by=request.user if request else None, **validated_data)
        for param in params:
            LabResultParameter.objects.create(result=result, **param)
        # Auto-advance the parent request to Completed once a result exists.
        result.test_request.status = LabTestRequest.Status.COMPLETED
        result.test_request.save(update_fields=["status", "updated_at"])
        return result

    def update(self, instance, validated_data):
        params = validated_data.pop("parameters", None)
        instance = super().update(instance, validated_data)
        if params is not None:
            instance.parameters.all().delete()
            for param in params:
                LabResultParameter.objects.create(result=instance, **param)
        return instance


class LabTestRequestSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.user.get_full_name", read_only=True)
    patient_display_id = serializers.CharField(source="patient.patient_id", read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    result = LabResultSerializer(read_only=True)

    class Meta:
        model = LabTestRequest
        fields = [
            "id", "request_id", "patient", "patient_name", "patient_display_id", "requested_by",
            "requested_by_name", "test_type", "priority", "status", "clinical_notes",
            "sample_collected_at", "result", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "request_id", "created_at", "updated_at"]

    def get_requested_by_name(self, obj):
        return f"Dr. {obj.requested_by.user.get_full_name()}" if obj.requested_by_id else None
