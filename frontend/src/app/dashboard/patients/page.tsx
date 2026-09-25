"use client";

import { useState } from "react";
import { Plus, Eye, Pencil, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useServerTable } from "@/lib/useServerTable";
import { useToast } from "@/lib/toast-context";
import { api, ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/EmptyState";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { Field, inputCls } from "@/components/ui/Field";
import { ADMISSION_STATUS_STYLE } from "@/lib/constants";
import type { PatientProfile } from "@/lib/types";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];

interface NewPatientForm {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
}

const emptyForm: NewPatientForm = { first_name: "", last_name: "", email: "", password: "", phone_number: "", date_of_birth: "", gender: "" };

export default function PatientsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const table = useServerTable<PatientProfile>({ endpoint: "/patients/", pageSize: 8 });
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<NewPatientForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<PatientProfile | null>(null);

  const canManage = user?.role === "admin";

  const columns: Column<PatientProfile>[] = [
    {
      key: "patient_id",
      label: "Patient ID",
      sortable: true,
      render: (r) => <span className="font-data text-xs font-semibold text-slate-500">{r.patient_id}</span>,
    },
    {
      key: "user",
      label: "Name",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">
            {r.user.first_name?.[0]}
            {r.user.last_name?.[0]}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{r.user.full_name}</p>
            <p className="text-xs text-slate-400">
              {r.age ?? "—"} yrs · {r.gender || "—"}
            </p>
          </div>
        </div>
      ),
    },
    { key: "blood_group", label: "Blood", render: (r) => <Badge className="border-slate-200 bg-slate-50 text-slate-600">{r.blood_group}</Badge> },
    {
      key: "admission_status",
      label: "Status",
      sortable: true,
      render: (r) => <Badge className={ADMISSION_STATUS_STYLE[r.admission_status]}>{r.admission_status}</Badge>,
    },
    { key: "ward", label: "Ward", render: (r) => <span>{r.ward || "—"}</span> },
    { key: "admitting_doctor_name", label: "Doctor", render: (r) => <span>{r.admitting_doctor_name || "—"}</span> },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setDetail(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-600">
            <Eye className="h-4 w-4" />
          </button>
          {canManage && (
            <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-600">
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const submitNewPatient = async () => {
    setSaving(true);
    try {
      await api.post("/auth/register/", form);
      toast(`${form.first_name} ${form.last_name} added as a new patient.`);
      setAddOpen(false);
      setForm(emptyForm);
      table.refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.fieldErrorSummary || err.message : "Couldn't add patient.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Patient Management"
        subtitle={`${table.count} patients on record`}
        action={
          canManage && (
            <PrimaryButton icon={Plus} onClick={() => setAddOpen(true)}>
              Add Patient
            </PrimaryButton>
          )
        }
      />

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
        filterOptions={{
          param: "admission_status",
          options: [
            { value: "outpatient", label: "Outpatient" },
            { value: "admitted", label: "Admitted" },
            { value: "discharged", label: "Discharged" },
          ],
        }}
        filterValue={table.filterValue}
        onFilterChange={table.setFilterValue}
        searchPlaceholder="Search by name, ID, phone..."
        emptyTitle="No patients found"
      />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add New Patient"
        wide
        footer={
          <>
            <SecondaryButton onClick={() => setAddOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton icon={Check} loading={saving} onClick={submitNewPatient}>
              Save Patient
            </PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First Name">
            <input className={inputCls} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </Field>
          <Field label="Last Name">
            <input className={inputCls} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Temporary Password" hint="Patient can change this after first login.">
            <input type="text" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Phone Number">
            <input className={inputCls} value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          </Field>
          <Field label="Date of Birth">
            <input type="date" className={inputCls} value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
          </Field>
          <Field label="Gender">
            <select className={inputCls} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.user.full_name ?? ""} wide>
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <InfoField label="Patient ID" value={detail.patient_id} />
              <InfoField label="Age" value={detail.age?.toString() ?? "—"} />
              <InfoField label="Blood Group" value={detail.blood_group} />
              <InfoField label="Phone" value={detail.user.phone_number || "—"} />
              <InfoField label="Insurance" value={detail.insurance_provider || "—"} />
              <InfoField label="Policy #" value={detail.insurance_policy_number || "—"} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Address</p>
              <p className="mt-1 text-sm text-slate-700">{detail.address || "Not on file"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Emergency Contact</p>
              <p className="mt-1 text-sm text-slate-700">
                {detail.emergency_contact_name ? `${detail.emergency_contact_name} · ${detail.emergency_contact_phone}` : "Not on file"}
              </p>
            </div>
            {BLOOD_GROUPS.length > 0 && detail.admission_status === "admitted" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Admitted to {detail.ward} {detail.bed_number && `· Bed ${detail.bed_number}`}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 text-slate-800">{value}</p>
    </div>
  );
}
