from rest_framework import serializers

from apps.accounts.serializers import UserSerializer

from .models import NurseProfile


class NurseProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    first_name = serializers.CharField(source="user.first_name", write_only=True, required=False)
    last_name = serializers.CharField(source="user.last_name", write_only=True, required=False)
    phone_number = serializers.CharField(source="user.phone_number", write_only=True, required=False, allow_blank=True)

    class Meta:
        model = NurseProfile
        fields = [
            "id", "user", "nurse_id", "department", "shift", "license_number",
            "assigned_ward", "years_of_experience", "created_at", "updated_at",
            "first_name", "last_name", "phone_number",
        ]
        read_only_fields = ["id", "nurse_id", "created_at", "updated_at"]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if user_data:
            for attr, value in user_data.items():
                setattr(instance.user, attr, value)
            instance.user.save(update_fields=list(user_data.keys()))
        return super().update(instance, validated_data)
