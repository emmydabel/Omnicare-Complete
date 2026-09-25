"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Plus, Pencil, Power, X, PackagePlus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useServerTable } from "@/lib/useServerTable";
import { useFetch } from "@/lib/useFetch";
import { useToast } from "@/lib/toast-context";
import { api, ApiError } from "@/lib/api-client";
import { PageHeader, EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { Field, inputCls } from "@/components/ui/Field";
import type { DoctorProfile, Medicine, Paginated, PatientProfile, Prescription } from "@/lib/types";

interface MedForm {
  name: string;
  generic_name: string;
  category: string;
  dosage_form: string;
  strength: string;
  manufacturer: string;
  batch_number: string;
  unit_price: string;
  reorder_level: string;
  expiry_date: string;
  initial_stock: string;
}
const emptyMedForm: MedForm = {
  name: "", generic_name: "", category: "other", dosage_form: "tablet", strength: "", manufacturer: "",
  batch_number: "", unit_price: "0", reorder_level: "20", expiry_date: "", initial_stock: "0",
};

interface RxItemForm {
  medicine: string;
  dosage: string;
  frequency: string;
  duration_days: string;
  quantity: string;
  instructions: string;
}
const emptyRxItem: RxItemForm = { medicine: "", dosage: "", frequency: "Once daily", duration_days: "7", quantity: "1", instructions: "" };

export default function PharmacyPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"inventory" | "prescriptions">("inventory");
  const toast = useToast();
  const invTable = useServerTable<Medicine>({ endpoint: "/medicines/", pageSize: 7, filterParam: "category" });
  const { data: queue, loading: queueLoading, error: queueError } = useFetch<Paginated<Prescription>>(
    tab === "prescriptions" ? "/prescriptions/queue/" : null
  );
  const [refreshTick, setRefreshTick] = useState(0);

  // Matches the backend: CanManageInventory = role_permission("admin", "pharmacist");
  // CanPrescribe = role_permission("admin", "doctor"). Verified against the actual
  // permission classes rather than assumed.
  const canManageInventory = user?.role === "admin" || user?.role === "pharmacist";
  const canPrescribe = user?.role === "admin" || user?.role === "doctor";

  useEffect(() => {
    invTable.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  const dispense = async (prescriptionId: number, itemId: number, drugName: string, patientName: string) => {
    try {
      await api.post(`/prescriptions/${prescriptionId}/dispense-item/`, { item_id: itemId });
      toast(`${drugName} dispensed to ${patientName}. Stock updated.`);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't dispense — check stock levels.", "error");
    }
  };

  // --- Add / Edit medicine -----------------------------------------------------------
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [medForm, setMedForm] = useState<MedForm>(emptyMedForm);
  const [savingMed, setSavingMed] = useState(false);

  const openAddMedicine = () => {
    setEditingMed(null);
    setMedForm(emptyMedForm);
    setMedModalOpen(true);
  };

  const openEditMedicine = (m: Medicine) => {
    setEditingMed(m);
    setMedForm({
      name: m.name, generic_name: m.generic_name, category: m.category, dosage_form: m.dosage_form,
      strength: m.strength, manufacturer: m.manufacturer, batch_number: m.batch_number,
      unit_price: m.unit_price, reorder_level: String(m.reorder_level), expiry_date: m.expiry_date,
      initial_stock: "0",
    });
    setMedModalOpen(true);
  };

  const submitMedicine = async () => {
    setSavingMed(true);
    try {
      const payload = {
        name: medForm.name, generic_name: medForm.generic_name, category: medForm.category,
        dosage_form: medForm.dosage_form, strength: medForm.strength, manufacturer: medForm.manufacturer,
        batch_number: medForm.batch_number, unit_price: medForm.unit_price,
        reorder_level: Number(medForm.reorder_level), expiry_date: medForm.expiry_date,
      };
      if (editingMed) {
        await api.patch(`/medicines/${editingMed.id}/`, payload);
        toast(`${medForm.name} updated.`);
      } else {
        // stock_quantity is read-only on the serializer by design (every stock
        // change needs an audit trail) — a new medicine starts at 0 and, if an
        // initial quantity was given, gets a follow-up restock call.
        const created = await api.post<Medicine>("/medicines/", payload);
        const initial = Number(medForm.initial_stock) || 0;
        if (initial > 0) {
          await api.post(`/medicines/${created.id}/adjust-stock/`, { delta: initial, note: "Initial stock on creation" });
        }
        toast(`${medForm.name} added to inventory.`);
      }
      setMedModalOpen(false);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      toast(err instanceof ApiError ? err.fieldErrorSummary || err.message : "Couldn't save medicine.", "error");
    } finally {
      setSavingMed(false);
    }
  };

  const toggleMedicineActive = async (m: Medicine) => {
    try {
      // Deliberately a PATCH toggling is_active, not DELETE — the backend has
      // no custom destroy() override, so DELETE would hard-remove the row and
      // could orphan historical stock-transaction/prescription references.
      // is_active exists on the model precisely so "removing" a medicine from
      // the active inventory doesn't destroy that history.
      await api.patch(`/medicines/${m.id}/`, { is_active: !m.is_active });
      toast(`${m.name} ${m.is_active ? "removed from" : "restored to"} active inventory.`);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't update medicine.", "error");
    }
  };

  // --- Adjust stock -----------------------------------------------------------
  const [adjustTarget, setAdjustTarget] = useState<Medicine | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [savingAdjust, setSavingAdjust] = useState(false);

  const submitAdjustStock = async () => {
    if (!adjustTarget) return;
    const delta = Number(adjustDelta);
    if (!delta) return;
    setSavingAdjust(true);
    try {
      await api.post(`/medicines/${adjustTarget.id}/adjust-stock/`, { delta, note: adjustNote });
      toast(`${adjustTarget.name} stock ${delta > 0 ? "increased" : "decreased"} by ${Math.abs(delta)}.`);
      setAdjustTarget(null);
      setAdjustDelta("");
      setAdjustNote("");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't adjust stock — check the amount against current stock.", "error");
    } finally {
      setSavingAdjust(false);
    }
  };

  // --- New prescription -----------------------------------------------------------
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [rxPatient, setRxPatient] = useState("");
  const [rxDoctor, setRxDoctor] = useState("");
  const [rxItems, setRxItems] = useState<RxItemForm[]>([{ ...emptyRxItem }]);
  const [rxPatients, setRxPatients] = useState<PatientProfile[]>([]);
  const [rxDoctors, setRxDoctors] = useState<DoctorProfile[]>([]);
  const [rxMedicines, setRxMedicines] = useState<Medicine[]>([]);
  const [savingRx, setSavingRx] = useState(false);

  useEffect(() => {
    if (!rxModalOpen) return;
    api.get<Paginated<PatientProfile>>("/patients/?page_size=100").then((r) => setRxPatients(r.results)).catch(() => {});
    api.get<Paginated<Medicine>>("/medicines/?page_size=200").then((r) => setRxMedicines(r.results.filter((m) => m.is_active))).catch(() => {});
    if (user?.role === "admin") {
      api.get<Paginated<DoctorProfile>>("/doctors/?page_size=100").then((r) => setRxDoctors(r.results)).catch(() => {});
    }
  }, [rxModalOpen, user?.role]);

  const openNewPrescription = () => {
    setRxPatient("");
    setRxDoctor("");
    setRxItems([{ ...emptyRxItem }]);
    setRxModalOpen(true);
  };

  const updateRxItem = (i: number, field: keyof RxItemForm, value: string) => {
    setRxItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const submitPrescription = async () => {
    setSavingRx(true);
    try {
      const payload: Record<string, unknown> = {
        patient: Number(rxPatient),
        items_input: rxItems
          .filter((it) => it.medicine)
          .map((it) => ({
            medicine: Number(it.medicine), dosage: it.dosage, frequency: it.frequency,
            duration_days: Number(it.duration_days) || 1, quantity: Number(it.quantity) || 1,
            instructions: it.instructions,
          })),
      };
      // Only admins need to specify the doctor explicitly — the backend
      // auto-assigns the logged-in doctor's own profile when a doctor creates it.
      if (user?.role === "admin") payload.doctor = Number(rxDoctor);
      await api.post("/prescriptions/", payload);
      toast("Prescription created.");
      setRxModalOpen(false);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      toast(err instanceof ApiError ? err.fieldErrorSummary || err.message : "Couldn't create prescription.", "error");
    } finally {
      setSavingRx(false);
    }
  };

  const invColumns: Column<Medicine>[] = [
    { key: "sku", label: "SKU", render: (r) => <span className="font-data text-xs text-slate-500">{r.sku}</span> },
    {
      key: "name", label: "Medicine", sortable: true,
      render: (r) => (
        <div>
          <span className={`font-semibold ${r.is_active ? "text-slate-800" : "text-slate-400 line-through"}`}>{r.name}</span>
          {!r.is_active && <Badge className="ml-2 border-slate-200 bg-slate-100 text-slate-500">Inactive</Badge>}
        </div>
      ),
    },
    { key: "category_display", label: "Category" },
    {
      key: "stock_quantity",
      label: "Stock",
      sortable: true,
      render: (r) => (
        <span className={`font-data font-semibold ${r.is_low_stock ? "text-red-600" : "text-slate-700"}`}>
          {r.stock_quantity}
          {r.is_low_stock && <AlertTriangle className="ml-1.5 inline h-3.5 w-3.5" />}
        </span>
      ),
    },
    { key: "unit_price", label: "Unit Price", render: (r) => <span className="font-data">₦{parseFloat(r.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> },
    { key: "expiry_date", label: "Expiry", render: (r) => <span className="font-data text-xs">{r.expiry_date}</span> },
    {
      key: "actions",
      label: "",
      render: (r) =>
        canManageInventory && (
          <div className="flex items-center gap-1">
            <button onClick={() => setAdjustTarget(r)} title="Adjust stock" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-600">
              <PackagePlus className="h-4 w-4" />
            </button>
            <button onClick={() => openEditMedicine(r)} title="Edit" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-600">
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggleMedicineActive(r)}
              title={r.is_active ? "Remove from inventory" : "Restore to inventory"}
              className={`rounded-lg p-1.5 ${r.is_active ? "text-slate-400 hover:bg-red-50 hover:text-red-600" : "text-slate-400 hover:bg-green-50 hover:text-green-600"}`}
            >
              <Power className="h-4 w-4" />
            </button>
          </div>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pharmacy"
        subtitle="Inventory, prescriptions & dispensing"
        action={
          tab === "inventory"
            ? canManageInventory && <PrimaryButton icon={Plus} onClick={openAddMedicine}>Add Medicine</PrimaryButton>
            : canPrescribe && <PrimaryButton icon={Plus} onClick={openNewPrescription}>New Prescription</PrimaryButton>
        }
      />
      <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1">
        {(["inventory", "prescriptions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-colors ${tab === t ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t === "inventory" ? "Inventory" : "Prescriptions to Dispense"}
          </button>
        ))}
      </div>

      {tab === "inventory" ? (
        <DataTable
          columns={invColumns}
          data={invTable.data}
          loading={invTable.loading}
          error={invTable.error}
          count={invTable.count}
          page={invTable.page}
          totalPages={invTable.totalPages}
          onPageChange={invTable.setPage}
          searchInput={invTable.searchInput}
          onSearchChange={invTable.setSearchInput}
          ordering={invTable.ordering}
          onToggleSort={invTable.toggleSort}
          searchPlaceholder="Search medicine name..."
          rowKey="sku"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {queueLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : queueError ? (
            <EmptyState icon={AlertTriangle} title="Couldn't load the queue" subtitle={queueError} />
          ) : !queue?.results.length ? (
            <EmptyState title="Queue is empty" subtitle="No prescriptions waiting to be dispensed." />
          ) : (
            <div className="space-y-4">
              {queue.results.map((rx) => (
                <div key={rx.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{rx.patient_name}</p>
                      <p className="text-xs text-slate-500">{rx.prescription_id} · prescribed by {rx.doctor_name}</p>
                    </div>
                    <Badge className="border-amber-200 bg-amber-50 text-amber-700">{rx.status_display}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {rx.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <div className="text-sm text-slate-700">
                          <span className="font-medium">{item.medicine_name}</span> — {item.dosage}, {item.frequency}, {item.quantity} units
                        </div>
                        {item.is_dispensed ? (
                          <Badge className="border-green-200 bg-green-50 text-green-700">Dispensed</Badge>
                        ) : (
                          <PrimaryButton
                            className="!px-3 py-1.5 text-xs"
                            onClick={() => dispense(rx.id, item.id, item.medicine_name, rx.patient_name)}
                          >
                            Dispense
                          </PrimaryButton>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit medicine */}
      <Modal
        open={medModalOpen}
        onClose={() => setMedModalOpen(false)}
        title={editingMed ? `Edit ${editingMed.name}` : "Add Medicine"}
        wide
        footer={
          <>
            <SecondaryButton onClick={() => setMedModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton icon={Plus} loading={savingMed} onClick={submitMedicine}>
              {editingMed ? "Save Changes" : "Add to Inventory"}
            </PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name"><input className={inputCls} value={medForm.name} onChange={(e) => setMedForm({ ...medForm, name: e.target.value })} /></Field>
          <Field label="Generic Name"><input className={inputCls} value={medForm.generic_name} onChange={(e) => setMedForm({ ...medForm, generic_name: e.target.value })} /></Field>
          <Field label="Category">
            <select className={inputCls} value={medForm.category} onChange={(e) => setMedForm({ ...medForm, category: e.target.value })}>
              <option value="analgesic">Analgesic</option><option value="antibiotic">Antibiotic</option>
              <option value="antiviral">Antiviral</option><option value="cardiovascular">Cardiovascular</option>
              <option value="respiratory">Respiratory</option><option value="gastrointestinal">Gastrointestinal</option>
              <option value="endocrine">Endocrine</option><option value="neurological">Neurological</option>
              <option value="vitamin_supplement">Vitamin/Supplement</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Dosage Form">
            <select className={inputCls} value={medForm.dosage_form} onChange={(e) => setMedForm({ ...medForm, dosage_form: e.target.value })}>
              <option value="tablet">Tablet</option><option value="capsule">Capsule</option><option value="syrup">Syrup</option>
              <option value="injection">Injection</option><option value="ointment">Ointment</option>
              <option value="drops">Drops</option><option value="inhaler">Inhaler</option>
            </select>
          </Field>
          <Field label="Strength" hint="e.g. 500mg"><input className={inputCls} value={medForm.strength} onChange={(e) => setMedForm({ ...medForm, strength: e.target.value })} /></Field>
          <Field label="Manufacturer"><input className={inputCls} value={medForm.manufacturer} onChange={(e) => setMedForm({ ...medForm, manufacturer: e.target.value })} /></Field>
          <Field label="Batch Number"><input className={inputCls} value={medForm.batch_number} onChange={(e) => setMedForm({ ...medForm, batch_number: e.target.value })} /></Field>
          <Field label="Unit Price (₦)"><input type="number" step="0.01" className={inputCls} value={medForm.unit_price} onChange={(e) => setMedForm({ ...medForm, unit_price: e.target.value })} /></Field>
          <Field label="Reorder Level"><input type="number" className={inputCls} value={medForm.reorder_level} onChange={(e) => setMedForm({ ...medForm, reorder_level: e.target.value })} /></Field>
          <Field label="Expiry Date"><input type="date" className={inputCls} value={medForm.expiry_date} onChange={(e) => setMedForm({ ...medForm, expiry_date: e.target.value })} /></Field>
          {!editingMed && (
            <Field label="Initial Stock Quantity" hint="Recorded as a restock transaction">
              <input type="number" className={inputCls} value={medForm.initial_stock} onChange={(e) => setMedForm({ ...medForm, initial_stock: e.target.value })} />
            </Field>
          )}
        </div>
      </Modal>

      {/* Adjust stock */}
      <Modal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title={`Adjust Stock — ${adjustTarget?.name ?? ""}`}
        footer={
          <>
            <SecondaryButton onClick={() => setAdjustTarget(null)}>Cancel</SecondaryButton>
            <PrimaryButton icon={PackagePlus} loading={savingAdjust} onClick={submitAdjustStock}>Apply Adjustment</PrimaryButton>
          </>
        }
      >
        {adjustTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Current stock: <span className="font-data font-semibold text-slate-800">{adjustTarget.stock_quantity}</span></p>
            <Field label="Change Amount" hint="Positive to restock, negative to write off (e.g. expired/damaged)">
              <input type="number" className={inputCls} value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} placeholder="e.g. 50 or -10" />
            </Field>
            <Field label="Note"><input className={inputCls} value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="Reason for this adjustment" /></Field>
          </div>
        )}
      </Modal>

      {/* New prescription */}
      <Modal
        open={rxModalOpen}
        onClose={() => setRxModalOpen(false)}
        title="New Prescription"
        wide
        footer={
          <>
            <SecondaryButton onClick={() => setRxModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton icon={Plus} loading={savingRx} onClick={submitPrescription} disabled={!rxPatient}>Create Prescription</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Patient">
              <select className={inputCls} value={rxPatient} onChange={(e) => setRxPatient(e.target.value)}>
                <option value="">Select patient…</option>
                {rxPatients.map((p) => <option key={p.id} value={p.id}>{p.user.full_name} ({p.patient_id})</option>)}
              </select>
            </Field>
            {user?.role === "admin" && (
              <Field label="Prescribing Doctor">
                <select className={inputCls} value={rxDoctor} onChange={(e) => setRxDoctor(e.target.value)}>
                  <option value="">Select doctor…</option>
                  {rxDoctors.map((d) => <option key={d.id} value={d.id}>{d.user.full_name} — {d.department}</option>)}
                </select>
              </Field>
            )}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Medications</span>
              <button onClick={() => setRxItems((rows) => [...rows, { ...emptyRxItem }])} className="text-xs font-semibold text-teal-600 hover:text-teal-700">+ Add medication</button>
            </div>
            <div className="space-y-2">
              {rxItems.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 rounded-lg border border-slate-100 p-2">
                  <select className={`${inputCls} col-span-3`} value={it.medicine} onChange={(e) => updateRxItem(i, "medicine", e.target.value)}>
                    <option value="">Medicine…</option>
                    {rxMedicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <input className={`${inputCls} col-span-2`} placeholder="Dosage" value={it.dosage} onChange={(e) => updateRxItem(i, "dosage", e.target.value)} />
                  <input className={`${inputCls} col-span-2`} placeholder="Frequency" value={it.frequency} onChange={(e) => updateRxItem(i, "frequency", e.target.value)} />
                  <input type="number" className={`${inputCls} col-span-1`} placeholder="Days" value={it.duration_days} onChange={(e) => updateRxItem(i, "duration_days", e.target.value)} />
                  <input type="number" className={`${inputCls} col-span-1`} placeholder="Qty" value={it.quantity} onChange={(e) => updateRxItem(i, "quantity", e.target.value)} />
                  <input className={`${inputCls} col-span-2`} placeholder="Instructions" value={it.instructions} onChange={(e) => updateRxItem(i, "instructions", e.target.value)} />
                  <button onClick={() => setRxItems((rows) => rows.filter((_, idx) => idx !== i))} className="col-span-1 flex items-center justify-center text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
