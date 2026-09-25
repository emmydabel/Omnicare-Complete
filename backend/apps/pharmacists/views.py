from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets

from apps.core.permissions import IsAdmin, ReadOnlyOrNonPatientStaff

from .models import PharmacistProfile
from .serializers import PharmacistProfileSerializer


class PharmacistProfileViewSet(viewsets.ModelViewSet):
    queryset = PharmacistProfile.objects.select_related("user")
    serializer_class = PharmacistProfileSerializer
    permission_classes = [ReadOnlyOrNonPatientStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["pharmacy_branch"]
    search_fields = ["user__first_name", "user__last_name", "pharmacist_id"]
    ordering_fields = ["created_at", "years_of_experience"]

    def get_permissions(self):
        if self.action == "destroy":
            return [IsAdmin()]
        return super().get_permissions()
