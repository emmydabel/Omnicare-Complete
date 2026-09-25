from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets

from apps.core.permissions import IsAdmin, ReadOnlyOrNonPatientStaff

from .models import NurseProfile
from .serializers import NurseProfileSerializer


class NurseProfileViewSet(viewsets.ModelViewSet):
    queryset = NurseProfile.objects.select_related("user")
    serializer_class = NurseProfileSerializer
    permission_classes = [ReadOnlyOrNonPatientStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["department", "shift"]
    search_fields = ["user__first_name", "user__last_name", "nurse_id", "assigned_ward"]
    ordering_fields = ["created_at", "years_of_experience"]

    def get_permissions(self):
        if self.action == "destroy":
            return [IsAdmin()]
        return super().get_permissions()
