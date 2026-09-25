"use client";

import { useEffect, useState } from "react";
import { Download, DollarSign, Wallet, Receipt, CreditCard, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useServerTable } from "@/lib/useServerTable";
import { useFetch } from "@/lib/useFetch";
import { useToast } from "@/lib/toast-context";
import { api, ApiError } from "@/lib/api-client";
import { PageHeader, EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { Field, inputCls } from "@/components/ui/Field";
import { INVOICE_STATUS_STYLE, CLAIM_STATUS_STYLE } from "@/lib/constants";
import type { Invoice, InsuranceClaim, FinancialSummary, Paginated, PatientProfile } from "@/lib/types";

interface LineItemForm {
  item_type: string;
  description: string;
  quantity: string;
  unit_price: string;
}
const emptyLineItem: LineItemForm = { item_type: "consultation", description: "", quantity: "1", unit_price: "0" };

export default function BillingPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "admin";
  const table = useServerTable<Invoice>({ endpoint: "/invoices/", pageSize: 7, filterParam: "status" });
  const { data: finance } = useFetch<FinancialSummary>(isAdmin ? "/invoices/financial_summary/" : null);
  const { data: claims, loading: claimsLoading } = useFetch<Paginated<InsuranceClaim>>(isAdmin ? "/insurance-claims/?page_size=10" : null);

  const [payModal, setPayModal] = useState<Invoice | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("card");
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [invoicePatient, setInvoicePatient] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [items, setItems] = useState<LineItemForm[]>([{ ...emptyLineItem }]);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  useEffect(() => {
    if (!createOpen) return;
    api.get<Paginated<PatientProfile>>("/patients/?page_size=100").then((r) => setPatients(r.results)).catch(() => {});
  }, [createOpen]);

  const updateItem = (i: number, field: keyof LineItemForm, value: string) => {
    setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const estimatedTotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

  const createInvoice = async () => {
    setCreatingInvoice(true);
    try {
      await api.post("/invoices/", {
        patient: Number(invoicePatient),
        due_date: dueDate || null,
        tax_rate_percent: Number(taxRate) || 0,
        items: items
          .filter((it) => it.description.trim())
          .map((it) => ({ item_type: it.item_type, description: it.description, quantity: Number(it.quantity) || 1, unit_price: Number(it.unit_price) || 0 })),
      });
      toast("Invoice created.");
      setCreateOpen(false);
      setInvoicePatient("");
      setDueDate("");
      setTaxRate("0");
      setItems([{ ...emptyLineItem }]);
      table.refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.fieldErrorSummary || err.message : "Couldn't create invoice.", "error");
    } finally {
      setCreatingInvoice(false);
    }
  };

  const recordPayment = async () => {
    if (!payModal) return;
    setSaving(true);
    try {
      await api.post(`/invoices/${payModal.id}/record_payment/`, { amount: Number(amount), payment_method: method });
      toast(`Payment recorded for ${payModal.invoice_number}.`);
      setPayModal(null);
      setAmount("");
      table.refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't record payment.", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Invoice>[] = [
    { key: "invoice_number", label: "Invoice", render: (r) => <span className="font-data text-xs font-semibold text-slate-600">{r.invoice_number}</span> },
    { key: "patient_name", label: "Patient", sortable: true },
    { key: "issue_date", label: "Date", sortable: true, render: (r) => <span className="font-data text-xs">{r.issue_date}</span> },
    { key: "total_amount", label: "Amount", render: (r) => <span className="font-data font-semibold text-slate-800">₦{parseFloat(r.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> },
    { key: "payment_method", label: "Method" },
    { key: "status", label: "Status", render: (r) => <Badge className={INVOICE_STATUS_STYLE[r.status]}>{r.status}</Badge> },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {isAdmin && r.status !== "paid" && (
            <button onClick={() => setPayModal(r)} className="rounded-lg border border-teal-200 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">
              Record Payment
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Billing & Insurance"
        subtitle="Invoices, payments, and insurance claims"
        action={
          isAdmin && (
            <PrimaryButton icon={Plus} onClick={() => setCreateOpen(true)}>
              New Invoice
            </PrimaryButton>
          )
        }
      />

      {isAdmin && (
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {!finance ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          ) : (
            <>
              <StatCard icon={DollarSign} label="Collected" value={`₦${finance.total_collected.toLocaleString()}`} tint="bg-green-50 text-green-600" />
              <StatCard icon={Wallet} label="Outstanding" value={`₦${finance.outstanding_balance.toLocaleString()}`} tint="bg-amber-50 text-amber-600" />
              <StatCard icon={Receipt} label="Total Invoices" value={finance.invoice_count} tint="bg-blue-50 text-blue-600" />
              <StatCard icon={CreditCard} label="Overdue" value={finance.overdue_invoice_count} tint="bg-red-50 text-red-600" />
            </>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        data={table.data}
        loading={table.loading}
        error={table.error}
        count={table.count}
        page={table.page}
        totalPages={table.totalPages}
        onPageChange={table.setPage}
        searchInput={table.searchInput}
        onSearchChange={table.setSearchInput}
        ordering={table.ordering}
        onToggleSort={table.toggleSort}
        filterOptions={{ param: "status", options: [
          { value: "paid", label: "Paid" }, { value: "pending", label: "Pending" }, { value: "overdue", label: "Overdue" },
        ] }}
        filterValue={table.filterValue}
        onFilterChange={table.setFilterValue}
        searchPlaceholder="Search invoice or patient..."
      />

      {isAdmin && (
        <div className="mt-5 animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display mb-4 text-sm font-bold text-slate-900">Insurance Claims</h3>
          {claimsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !claims?.results.length ? (
            <EmptyState icon={Download} title="No claims submitted" subtitle="Claims submitted against an invoice will appear here." />
          ) : (
            <div className="space-y-2.5">
              {claims.results.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {c.claim_number} · {c.patient_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {c.insurance_provider} · ₦{parseFloat(c.claim_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Badge className={CLAIM_STATUS_STYLE[c.status]}>{c.status.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title={`Record Payment — ${payModal?.invoice_number ?? ""}`}
        footer={
          <>
            <SecondaryButton onClick={() => setPayModal(null)}>Cancel</SecondaryButton>
            <PrimaryButton loading={saving} onClick={recordPayment}>
              Record Payment
            </PrimaryButton>
          </>
        }
      >
        {payModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Balance due: <span className="font-data font-semibold text-slate-900">₦{parseFloat(payModal.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </p>
            <Field label="Amount">
              <input type="number" step="0.01" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Payment Method">
              <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="insurance">Insurance</option>
              </select>
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Invoice"
        wide
        footer={
          <>
            <SecondaryButton onClick={() => setCreateOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton icon={Plus} loading={creatingInvoice} onClick={createInvoice} disabled={!invoicePatient}>
              Create Invoice
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Patient">
                <select className={inputCls} value={invoicePatient} onChange={(e) => setInvoicePatient(e.target.value)}>
                  <option value="">Select patient…</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.user.full_name} ({p.patient_id})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Due Date">
              <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Line Items</span>
              <button onClick={() => setItems((rows) => [...rows, { ...emptyLineItem }])} className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                + Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 rounded-lg border border-slate-100 p-2">
                  <select className={`${inputCls} col-span-3`} value={it.item_type} onChange={(e) => updateItem(i, "item_type", e.target.value)}>
                    <option value="consultation">Consultation</option>
                    <option value="procedure">Procedure</option>
                    <option value="medication">Medication</option>
                    <option value="lab_test">Lab Test</option>
                    <option value="room_charge">Room Charge</option>
                    <option value="other">Other</option>
                  </select>
                  <input className={`${inputCls} col-span-4`} placeholder="Description" value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                  <input type="number" className={`${inputCls} col-span-2`} placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                  <input type="number" step="0.01" className={`${inputCls} col-span-2`} placeholder="Unit price" value={it.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)} />
                  <button onClick={() => setItems((rows) => rows.filter((_, idx) => idx !== i))} className="col-span-1 flex items-center justify-center text-slate-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tax Rate (%)">
              <input type="number" step="0.01" className={inputCls} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </Field>
            <div className="flex flex-col justify-end pb-2 text-right">
              <span className="text-xs text-slate-500">Estimated subtotal</span>
              <span className="font-data text-lg font-bold text-slate-900">₦{estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
