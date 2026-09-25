from datetime import timedelta

from django.db.models import Count, Sum
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsAdmin

from .models import Invoice, InsuranceClaim
from .serializers import InsuranceClaimSerializer, InvoiceSerializer, RecordPaymentSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    Billing is treated as an admin/finance function: any authenticated user can
    read invoices relevant to them (patients see only their own), but only
    admins create/edit/delete — this keeps the financial ledger single-writer.
    """

    serializer_class = InvoiceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "payment_method", "patient"]
    search_fields = ["invoice_number", "patient__patient_id", "patient__user__first_name", "patient__user__last_name"]
    ordering_fields = ["created_at", "due_date", "issue_date"]

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.select_related("patient__user", "appointment").prefetch_related("items")
        if user.role == "patient":
            return qs.filter(patient__user=user)
        if user.role == "pharmacist":
            return qs.none()
        return qs

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "record_payment", "submit_claim"):
            return [IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["post"])
    def record_payment(self, request, pk=None):
        invoice = self.get_object()
        serializer = RecordPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice.record_payment(**serializer.validated_data)
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=True, methods=["post"])
    def submit_claim(self, request, pk=None):
        invoice = self.get_object()
        payload = {
            "invoice": invoice.id,
            "patient": invoice.patient_id,
            "insurance_provider": request.data.get("insurance_provider", invoice.patient.insurance_provider),
            "policy_number": request.data.get("policy_number", invoice.patient.insurance_policy_number),
            "claim_amount": request.data.get("claim_amount", invoice.total_amount),
            "notes": request.data.get("notes", ""),
        }
        serializer = InsuranceClaimSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        claim = serializer.save()
        invoice.payment_method = Invoice.PaymentMethod.INSURANCE
        invoice.save(update_fields=["payment_method", "updated_at"])
        return Response(InsuranceClaimSerializer(claim).data, status=201)

    @action(detail=False, methods=["get"], permission_classes=[IsAdmin])
    def financial_summary(self, request):
        """Powers the Billing & Reporting dashboard: revenue, outstanding balance,
        and a 6-month trend for the analytics chart."""
        qs = Invoice.objects.exclude(status=Invoice.Status.CANCELLED)
        totals = qs.aggregate(invoice_count=Count("id"))
        paid_total = qs.filter(status=Invoice.Status.PAID).aggregate(s=Sum("amount_paid"))["s"] or 0
        outstanding = sum((inv.balance_due for inv in qs.exclude(status=Invoice.Status.PAID)), start=0)

        # Simple 6-bucket monthly trend computed in Python to stay database-agnostic
        # (avoids a Postgres-only date_trunc dependency here).
        today = timezone.now().date().replace(day=1)
        buckets, bucket_order, cursor = {}, [], today
        for _ in range(6):
            key = cursor.strftime("%Y-%m")
            bucket_order.append(key)
            buckets[key] = 0.0
            prev_month = cursor.month - 1 or 12
            prev_year = cursor.year - 1 if cursor.month == 1 else cursor.year
            cursor = cursor.replace(year=prev_year, month=prev_month, day=1)
        bucket_order.reverse()
        for inv in qs:
            key = inv.created_at.strftime("%Y-%m")
            if key in buckets:
                buckets[key] += float(inv.amount_paid)

        return Response({
            "invoice_count": totals["invoice_count"],
            "total_collected": float(paid_total),
            "outstanding_balance": float(outstanding),
            "paid_invoice_count": qs.filter(status=Invoice.Status.PAID).count(),
            "overdue_invoice_count": qs.filter(status=Invoice.Status.OVERDUE).count(),
            "monthly_revenue": [{"month": m, "revenue": buckets[m]} for m in bucket_order],
        })


class InsuranceClaimViewSet(viewsets.ModelViewSet):
    serializer_class = InsuranceClaimSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "insurance_provider"]
    search_fields = ["claim_number", "patient__patient_id", "insurance_provider"]
    ordering_fields = ["submitted_at"]

    def get_queryset(self):
        user = self.request.user
        qs = InsuranceClaim.objects.select_related("patient__user", "invoice")
        if user.role == "patient":
            return qs.filter(patient__user=user)
        if user.role in ("pharmacist", "nurse"):
            return qs.none()
        return qs

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def update_status(self, request, pk=None):
        claim = self.get_object()
        new_status = request.data.get("status")
        if new_status not in InsuranceClaim.Status.values:
            return Response({"detail": "Invalid status."}, status=400)
        claim.status = new_status
        if new_status in (InsuranceClaim.Status.APPROVED, InsuranceClaim.Status.REJECTED, InsuranceClaim.Status.PAID):
            claim.processed_at = timezone.now()
            if "approved_amount" in request.data:
                claim.approved_amount = request.data["approved_amount"]
        claim.save()
        return Response(InsuranceClaimSerializer(claim).data)
