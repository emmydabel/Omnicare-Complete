"use client";

import { useEffect, useState } from "react";
import { Plus, CalendarDays, CalendarClock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useServerTable } from "@/lib/useServerTable";
import { useToast } from "@/lib/toast-context";
import { api, ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/EmptyState";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusStepper } from "@/components/ui/StatusStepper";
import { Modal } from "@/components/ui/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { Field, inputCls } from "@/components/ui/Field";
import { APPOINTMENT_STEPS } from "@/lib/types";
import type { Appointment, DoctorProfile, PatientProfile, Paginated } from "@/lib/types";

const NEXT_STATUS: Record<string, string | null> = {
  scheduled: "confirmed",
  confirmed: "in_progress",
  in_progress: "completed",
  completed: null,
};

interface BookingForm {
  patient: string;
  doctor: string;
  scheduled_start: string;
  scheduled_end: string;
  visit_type: string;
  reason: string;
}
const emptyBooking: BookingForm = { patient: "", doctor: "", scheduled_start: "", scheduled_end: "", visit_type: "consultation", reason: "" };

/** Formats an ISO datetime string for a <input type="datetime-local"> value,
 * using local-time getters (not UTC) since that's how datetime-local inputs
 * are conventionally interpreted by the browser. */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const table = useServerTable<Appointment>({ endpoint: "/appointments/", pageSize: 8, filterParam: "status" });

  const [bookOpen, setBookOpen] = useState(false);
  const [form, setForm] = useState<BookingForm>(emptyBooking);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);

  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  // Matches the backend's CanManageAppointments = role_permission("admin", "doctor", "nurse") —
  // patients can cancel their own booking but reschedule needs staff involvement.
  const canManage = user?.role === "admin" || user?.role === "doctor" || user?.role === "nurse";

  useEffect(() => {
    if (!bookOpen) return;
    api.get<Paginated<PatientProfile>>("/patients/?page_size=100").then((r) => setPatients(r.results)).catch(() => {});
    api.get<Paginated<DoctorProfile>>("/doctors/?page_size=100").then((r) => setDoctors(r.results)).catch(() => {});
  }, [bookOpen]);

  const advance = async (appt: Appointment) => {
    const next = NEXT_STATUS[appt.status];
    if (!next) return;
    try {
      await api.post(`/appointments/${appt.id}/transition/`, { status: next });
      toast(`${appt.patient_name}'s appointment moved to ${next.replace("_", " ")}.`);
      table.refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't update status.", "error");
    }
  };

  const cancel = async (appt: Appointment) => {
    try {
      await api.post(`/appointments/${appt.id}/cancel/`, {});
      toast(`${appt.patient_name}'s appointment cancelled.`, "info");
      table.refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't cancel appointment.", "error");
    }
  };

  const openReschedule = (appt: Appointment) => {
    setRescheduleTarget(appt);
    setNewStart(toDatetimeLocal(appt.scheduled_start));
    setNewEnd(toDatetimeLocal(appt.scheduled_end));
  };

  const submitReschedule = async () => {
    if (!rescheduleTarget) return;
    setRescheduling(true);
    try {
      await api.patch(`/appointments/${rescheduleTarget.id}/`, {
        scheduled_start: newStart,
        scheduled_end: newEnd,
      });
      toast(`${rescheduleTarget.patient_name}'s appointment rescheduled.`);
      setRescheduleTarget(null);
      table.refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.fieldErrorSummary || err.message : "Couldn't reschedule appointment.", "error");
    } finally {
      setRescheduling(false);
    }
  };

  const submitBooking = async () => {
    setSaving(true);
    try {
      await api.post("/appointments/", {
        patient: Number(form.patient),
        doctor: Number(form.doctor),
        scheduled_start: form.scheduled_start,
        scheduled_end: form.scheduled_end,
        visit_type: form.visit_type,
        reason: form.reason,
      });
      toast("Appointment booked.");
      setBookOpen(false);
      setForm(emptyBooking);
      table.refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.fieldErrorSummary || err.message : "Couldn't book appointment.", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Appointment>[] = [
    { key: "appointment_id", label: "ID", render: (r) => <span className="font-data text-xs text-slate-500">{r.appointment_id}</span> },
    { key: "patient_name", label: "Patient", sortable: true },
    { key: "doctor_name", label: "Doctor", sortable: true },
    {
      key: "scheduled_start",
      label: "Date",
      sortable: true,
      render: (r) => (
        <span className="font-data text-xs">
          {new Date(r.scheduled_start).toLocaleDateString()} · {new Date(r.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    { key: "reason", label: "Reason" },
    { key: "status", label: "Status", render: (r) => <StatusStepper current={r.status} compact /> },
    {
      key: "actions",
      label: "",
      render: (r) =>
        !["completed", "cancelled", "no_show"].includes(r.status) && (
          <div className="flex items-center gap-1.5">
            {NEXT_STATUS[r.status] && (
              <button onClick={() => advance(r)} className="rounded-lg border border-teal-200 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                Advance
              </button>
            )}
            {canManage && (
              <button onClick={() => openReschedule(r)} className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                Reschedule
              </button>
            )}
            <button onClick={() => cancel(r)} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
              Cancel
            </button>
          </div>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={user?.role === "patient" ? "My Appointments" : "Appointments"}
        subtitle="Scheduled → Confirmed → In Progress → Completed"
        action={
          <PrimaryButton icon={Plus} onClick={() => setBookOpen(true)}>
            Book Appointment
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
          param: "status",
          options: [...APPOINTMENT_STEPS, "cancelled", "no_show"].map((s) => ({ value: s, label: s.replace("_", " ") })),
        }}
        filterValue={table.filterValue}
        onFilterChange={table.setFilterValue}
        searchPlaceholder="Search patient, doctor, ID..."
        emptyTitle="No appointments found"
      />

      <Modal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title="Book Appointment"
        wide
        footer={
          <>
            <SecondaryButton onClick={() => setBookOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton icon={CalendarDays} loading={saving} onClick={submitBooking}>
              Book Appointment
            </PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Patient">
            <select className={inputCls} value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })}>
              <option value="">Select patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.full_name} ({p.patient_id})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Doctor">
            <select className={inputCls} value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })}>
              <option value="">Select doctor…</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.full_name} — {d.department}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start Time">
            <input type="datetime-local" className={inputCls} value={form.scheduled_start} onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} />
          </Field>
          <Field label="End Time">
            <input type="datetime-local" className={inputCls} value={form.scheduled_end} onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} />
          </Field>
          <Field label="Visit Type">
            <select className={inputCls} value={form.visit_type} onChange={(e) => setForm({ ...form, visit_type: e.target.value })}>
              <option value="consultation">Consultation</option>
              <option value="follow_up">Follow-up</option>
              <option value="routine_checkup">Routine Checkup</option>
              <option value="procedure">Procedure</option>
              <option value="emergency">Emergency</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Reason for Visit">
              <textarea className={inputCls} rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        title={`Reschedule — ${rescheduleTarget?.patient_name ?? ""}`}
        footer={
          <>
            <SecondaryButton onClick={() => setRescheduleTarget(null)}>Cancel</SecondaryButton>
            <PrimaryButton icon={CalendarClock} loading={rescheduling} onClick={submitReschedule}>
              Save New Time
            </PrimaryButton>
          </>
        }
      >
        {rescheduleTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Currently: {new Date(rescheduleTarget.scheduled_start).toLocaleString()} with {rescheduleTarget.doctor_name}
            </p>
            <Field label="New Start Time">
              <input type="datetime-local" className={inputCls} value={newStart} onChange={(e) => setNewStart(e.target.value)} />
            </Field>
            <Field label="New End Time">
              <input type="datetime-local" className={inputCls} value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
