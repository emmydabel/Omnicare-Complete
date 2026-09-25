"use client";

import { useState } from "react";
import { UserPlus, Power } from "lucide-react";
import { useServerTable } from "@/lib/useServerTable";
import { useToast } from "@/lib/toast-context";
import { api, ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/EmptyState";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { Field, inputCls } from "@/components/ui/Field";
import { ROLE_LABEL } from "@/lib/constants";
import type { User, UserRole } from "@/lib/types";

interface StaffForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: "doctor" | "nurse" | "pharmacist" | "admin";
  specialization: string;
  license_number: string;
  department: string;
  years_of_experience: string;
  consultation_fee: string;
  shift: string;
  pharmacy_branch: string;
}

const emptyStaffForm: StaffForm = {
  email: "", password: "", first_name: "", last_name: "", phone_number: "", role: "doctor",
  specialization: "", license_number: "", department: "", years_of_experience: "0",
  consultation_fee: "0", shift: "morning", pharmacy_branch: "",
};

const ROLE_BADGE: Record<string, string> = {
  admin: "border-purple-200 bg-purple-50 text-purple-700",
  doctor: "border-teal-200 bg-teal-50 text-teal-700",
  nurse: "border-blue-200 bg-blue-50 text-blue-700",
  pharmacist: "border-amber-200 bg-amber-50 text-amber-700",
  patient: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function StaffPage() {
  const toast = useToast();
  const table = useServerTable<User>({ endpoint: "/auth/users/", pageSize: 8, filterParam: "role" });
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<StaffForm>(emptyStaffForm);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof StaffForm>(key: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value as StaffForm[K] }));

  const toggleActive = async (u: User) => {
    try {
      await api.post(`/auth/users/${u.id}/toggle-active/`, {});
      toast(`${u.full_name} ${u.is_active ? "deactivated" : "reactivated"}.`);
      table.refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't update account status.", "error");
    }
  };

  const submitStaff = async () => {
    setSaving(true);
    try {
      await api.post("/auth/staff/create/", {
        ...form,
        years_of_experience: Number(form.years_of_experience) || 0,
        consultation_fee: Number(form.consultation_fee) || 0,
      });
      toast(`${form.first_name} ${form.last_name} added as ${ROLE_LABEL[form.role as UserRole]}.`);
      setAddOpen(false);
      setForm(emptyStaffForm);
      table.refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.fieldErrorSummary || err.message : "Couldn't create account.", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: "full_name",
      label: "Name",
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-800">{r.full_name}</p>
          <p className="text-xs text-slate-400">{r.email}</p>
        </div>
      ),
    },
    { key: "role", label: "Role", render: (r) => <Badge className={ROLE_BADGE[r.role]}>{ROLE_LABEL[r.role]}</Badge> },
    { key: "phone_number", label: "Phone", render: (r) => <span>{r.phone_number || "—"}</span> },
    { key: "date_joined", label: "Joined", sortable: true, render: (r) => <span className="font-data text-xs">{new Date(r.date_joined).toLocaleDateString()}</span> },
    {
      key: "is_active",
      label: "Status",
      render: (r) => <Badge className={r.is_active ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}>{r.is_active ? "Active" : "Inactive"}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <button
          onClick={() => toggleActive(r)}
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${
            r.is_active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-700 hover:bg-green-50"
          }`}
        >
          <Power className="h-3 w-3" />
          {r.is_active ? "Deactivate" : "Reactivate"}
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Staff & Users"
        subtitle={`${table.count} accounts`}
        action={
          <PrimaryButton icon={UserPlus} onClick={() => setAddOpen(true)}>
            Add Staff Account
          </PrimaryButton>
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
          param: "role",
          options: [
            { value: "admin", label: "Admin" },
            { value: "doctor", label: "Doctor" },
            { value: "nurse", label: "Nurse" },
            { value: "pharmacist", label: "Pharmacist" },
            { value: "patient", label: "Patient" },
          ],
        }}
        filterValue={table.filterValue}
        onFilterChange={table.setFilterValue}
        searchPlaceholder="Search name or email..."
      />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Staff Account"
        wide
        footer={
          <>
            <SecondaryButton onClick={() => setAddOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton icon={UserPlus} loading={saving} onClick={submitStaff}>
              Create Account
            </PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Role">
            <select className={inputCls} value={form.role} onChange={update("role")}>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={form.email} onChange={update("email")} />
          </Field>
          <Field label="First Name">
            <input className={inputCls} value={form.first_name} onChange={update("first_name")} />
          </Field>
          <Field label="Last Name">
            <input className={inputCls} value={form.last_name} onChange={update("last_name")} />
          </Field>
          <Field label="Temporary Password">
            <input type="text" className={inputCls} value={form.password} onChange={update("password")} />
          </Field>
          <Field label="Phone Number">
            <input className={inputCls} value={form.phone_number} onChange={update("phone_number")} />
          </Field>

          {form.role === "doctor" && (
            <>
              <Field label="Specialization">
                <input className={inputCls} value={form.specialization} onChange={update("specialization")} />
              </Field>
              <Field label="Department">
                <input className={inputCls} value={form.department} onChange={update("department")} />
              </Field>
              <Field label="License Number">
                <input className={inputCls} value={form.license_number} onChange={update("license_number")} />
              </Field>
              <Field label="Years of Experience">
                <input type="number" className={inputCls} value={form.years_of_experience} onChange={update("years_of_experience")} />
              </Field>
              <Field label="Consultation Fee ($)">
                <input type="number" step="0.01" className={inputCls} value={form.consultation_fee} onChange={update("consultation_fee")} />
              </Field>
            </>
          )}

          {form.role === "nurse" && (
            <>
              <Field label="Department">
                <input className={inputCls} value={form.department} onChange={update("department")} />
              </Field>
              <Field label="Shift">
                <select className={inputCls} value={form.shift} onChange={update("shift")}>
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </Field>
              <Field label="License Number">
                <input className={inputCls} value={form.license_number} onChange={update("license_number")} />
              </Field>
            </>
          )}

          {form.role === "pharmacist" && (
            <>
              <Field label="Pharmacy Branch">
                <input className={inputCls} value={form.pharmacy_branch} onChange={update("pharmacy_branch")} />
              </Field>
              <Field label="License Number">
                <input className={inputCls} value={form.license_number} onChange={update("license_number")} />
              </Field>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
