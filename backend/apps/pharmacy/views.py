from django.db.models import F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsNonPatientStaff, role_permission

from .models import Medicine, StockTransaction
from .serializers import MedicineSerializer, StockAdjustSerializer, StockTransactionSerializer

CanManageInventory = role_permission("admin", "pharmacist")


class MedicineViewSet(viewsets.ModelViewSet):
    """Drug inventory. Any clinical/admin/pharmacy staff can browse (doctors need
    this when prescribing); only pharmacists/admins can create, edit, or adjust stock."""

    queryset = Medicine.objects.all()
    serializer_class = MedicineSerializer
    permission_classes = [IsNonPatientStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "dosage_form", "is_active"]
    search_fields = ["name", "generic_name", "sku", "manufacturer"]
    ordering_fields = ["name", "stock_quantity", "unit_price", "expiry_date"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "adjust_stock"):
            return [CanManageInventory()]
        return super().get_permissions()

    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):
        qs = self.filter_queryset(self.get_queryset()).filter(stock_quantity__lte=F("reorder_level"))
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="expiring-soon")
    def expiring_soon(self, request):
        from datetime import date, timedelta

        cutoff = date.today() + timedelta(days=60)
        qs = self.filter_queryset(self.get_queryset()).filter(expiry_date__lte=cutoff, expiry_date__isnull=False)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="adjust-stock")
    def adjust_stock(self, request, pk=None):
        medicine = self.get_object()
        serializer = StockAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        delta = serializer.validated_data["delta"]
        try:
            medicine.adjust_stock(
                delta=delta,
                transaction_type=StockTransaction.TransactionType.RESTOCK if delta > 0 else StockTransaction.TransactionType.ADJUSTMENT,
                performed_by=request.user,
                note=serializer.validated_data.get("note", ""),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(MedicineSerializer(medicine).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = self.get_queryset()
        return Response({
            "total_items": qs.count(),
            "low_stock_count": qs.filter(stock_quantity__lte=F("reorder_level")).count(),
            "inventory_value": sum(m.unit_price * m.stock_quantity for m in qs),
        })


class StockTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only audit trail — transactions are created via Medicine.adjust_stock()
    or the prescriptions dispensing flow, never directly."""

    queryset = StockTransaction.objects.select_related("medicine", "performed_by")
    serializer_class = StockTransactionSerializer
    permission_classes = [IsNonPatientStaff]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["medicine", "transaction_type", "performed_by"]
    ordering_fields = ["created_at"]
