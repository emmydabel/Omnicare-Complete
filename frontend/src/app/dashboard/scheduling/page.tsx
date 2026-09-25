"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api, ApiError } from "@/lib/api-client";
import { PageHeader, Skeleton } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { Field, inputCls } from "@/components/ui/Field";
import type { DoctorProfile, DoctorSchedule, Paginated } from "@/lib/types";

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DayRow {
  active: boolean;
  start_time: string;
  end_time: string;
  existingId: number | null;
}

interface ShiftForm {
  date: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  department: string;
  status: string;
  notes: string;
}
const emptyShiftForm: ShiftForm = { date: "", shift_type: "morning", start_time: "08:00", end_time: "16:00", department: "", status: "scheduled", notes: "" };

export default function SchedulingPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isDoctor = user?.role === "doctor";
  const canManage = user?.role === "admin";
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selected, setSelected] = useState<DoctorProfile | null>(null);
  const [schedule, setSchedule] = useState<DoctorSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const [availOpen, setAvailOpen] = useState(false);
  const [days, setDays] = useState<DayRow[]>([]);
  const [savingAvail, setSavingAvail] = useState(false);

  const [shiftOpen, setShiftOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState<ShiftForm>(emptyShiftForm);
  const [savingShift, setSavingShift] = useState(false);

  useEffect(() => {
    api
      .get<Paginated<DoctorProfile>>("/doctors/?page_size=100")
      .then((res) => {
        const list = isDoctor ? res.results.filter((d) => d.user.email === user?.email) : res.results;
        setDoctors(list);
        if (list.length) setSelected(list[0]);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoctor]);

  useEffect(() => {
    if (!selected) return;
    setSchedule(null);
    api.get<DoctorSchedule>(`/doctors/${selected.id}/schedule/`).then(setSchedule).catch(() => setSchedule({ availability: [], shifts: [] }));
  }, [selected, refreshTick]);

  const openAvailEditor = () => {
    const rows: DayRow[] = WEEKDAY_SHORT.map((_, i) => {
      const existing = schedule?.availability.find((a) => a.weekday === i);
      return {
        active: Boolean(existing),
        start_time: existing?.start_time.slice(0, 5) ?? "09:00",
        end_time: existing?.end_time.slice(0, 5) ?? "17:00",
        existingId: existing?.id ?? null,
      };
    });
    setDays(rows);
    setAvailOpen(true);
  };

  const updateDay = (i: number, patch: Partial<DayRow>) => {
    setDays((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const saveAvailability = async () => {
    if (!selected) return;
    setSavingAvail(true);
    try {
      await Promise.all(
        days.map((day, weekday) => {
          if (day.existingId) {
            return api.patch(`/doctor-availability/${day.existingId}/`, {
              start_time: day.start_time, end_time: day.end_time, is_active: day.active,
            });
          }
          if (day.active) {
            return api.post("/doctor-availability/", {
              doctor: selected.id, weekday, start_time: day.start_time, end_time: day.end_time, is_active: true,
            });
          }
          return Promise.resolve();
        })
      );
      toast("Weekly availability updated.");
      setAvailOpen(false);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't save availability.", "error");
    } finally {
      setSavingAvail(false);
    }
  };

  const saveShift = async () => {
    if (!selected) return;
    setSavingShift(true);
    try {
      await api.post("/doctor-shifts/", { doctor: selected.id, ...shiftForm });
      toast("Shift added.");
      setShiftOpen(false);
      setShiftForm(emptyShiftForm);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      toast(err instanceof ApiError ? err.fieldErrorSummary || err.message : "Couldn't add shift.", "error");
    } finally {
      setSavingShift(false);
    }
  };

  return (
    <div>
      <PageHeader title={isDoctor ? "My Schedule" : "Doctor Scheduling"} subtitle="Weekly availability & shift assignments" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {!isDoctor && (
          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-1">
            <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-slate-400">Doctors</p>
            {loading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {doctors.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelected(d)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left ${selected?.id === d.id ? "bg-teal-50" : "hover:bg-slate-50"}`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {d.user.first_name?.[0]}
                      {d.user.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${selected?.id === d.id ? "text-teal-700" : "text-slate-700"}`}>{d.user.full_name}</p>
                      <p className="truncate text-xs text-slate-400">{d.department}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={isDoctor ? "lg:col-span-4 space-y-5" : "lg:col-span-3 space-y-5"}>
          {selected && (
            <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                    {selected.user.first_name?.[0]}
                    {selected.user.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-slate-900">{selected.user.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {selected.specialization} · {selected.years_of_experience} yrs experience · ₦{Number(selected.consultation_fee).toLocaleString()}/consult
                    </p>
                  </div>
                </div>
                <Badge className="border-teal-200 bg-teal-50 text-teal-700">{selected.department}</Badge>
              </div>

              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Weekly Availability</p>
                {canManage && schedule && (
                  <button onClick={openAvailEditor} className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700">
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                )}
              </div>
              {!schedule ? (
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {WEEKDAY_SHORT.map((label, i) => {
                    const slot = schedule.availability.find((a) => a.weekday === i);
                    return (
                      <div key={label} className={`rounded-xl p-2.5 text-center ${slot ? "bg-teal-50" : "bg-slate-50"}`}>
                        <p className="text-xs font-bold text-slate-500">{label}</p>
                        <p className={`mt-1 text-xs font-semibold ${slot ? "text-teal-700" : "text-slate-400"}`}>
                          {slot ? `${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}` : "Off"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Upcoming Shifts</p>
              {canManage && selected && (
                <button onClick={() => setShiftOpen(true)} className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700">
                  <Plus className="h-3 w-3" /> Add Shift
                </button>
              )}
            </div>
            {!schedule ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : schedule.shifts.length === 0 ? (
              <p className="text-sm text-slate-500">No shifts scheduled.</p>
            ) : (
              <div className="space-y-2">
                {schedule.shifts.slice(0, 8).map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-2.5">
                    <span className="text-sm text-slate-700">
                      {new Date(s.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {s.shift_type_display} ·{" "}
                      {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                    </span>
                    <Badge className={s.status === "scheduled" ? "border-blue-200 bg-blue-50 text-blue-700" : s.status === "completed" ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-100 text-slate-500"}>
                      {s.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={availOpen}
        onClose={() => setAvailOpen(false)}
        title={`Edit Weekly Availability — ${selected?.user.full_name ?? ""}`}
        wide
        footer={
          <>
            <SecondaryButton onClick={() => setAvailOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton loading={savingAvail} onClick={saveAvailability}>
              Save Availability
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-2">
          {WEEKDAY_SHORT.map((label, i) => (
            <div key={label} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5">
              <label className="flex w-24 items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={days[i]?.active ?? false} onChange={(e) => updateDay(i, { active: e.target.checked })} />
                {label}
              </label>
              <input
                type="time"
                className={inputCls}
                disabled={!days[i]?.active}
                value={days[i]?.start_time ?? "09:00"}
                onChange={(e) => updateDay(i, { start_time: e.target.value })}
              />
              <span className="text-slate-400">to</span>
              <input
                type="time"
                className={inputCls}
                disabled={!days[i]?.active}
                value={days[i]?.end_time ?? "17:00"}
                onChange={(e) => updateDay(i, { end_time: e.target.value })}
              />
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={shiftOpen}
        onClose={() => setShiftOpen(false)}
        title={`Add Shift — ${selected?.user.full_name ?? ""}`}
        wide
        footer={
          <>
            <SecondaryButton onClick={() => setShiftOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton icon={Plus} loading={savingShift} onClick={saveShift}>
              Add Shift
            </PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date">
            <input type="date" className={inputCls} value={shiftForm.date} onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })} />
          </Field>
          <Field label="Shift Type">
            <select className={inputCls} value={shiftForm.shift_type} onChange={(e) => setShiftForm({ ...shiftForm, shift_type: e.target.value })}>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
              <option value="on_call">On-Call</option>
            </select>
          </Field>
          <Field label="Start Time">
            <input type="time" className={inputCls} value={shiftForm.start_time} onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })} />
          </Field>
          <Field label="End Time">
            <input type="time" className={inputCls} value={shiftForm.end_time} onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })} />
          </Field>
          <Field label="Department">
            <input className={inputCls} value={shiftForm.department} onChange={(e) => setShiftForm({ ...shiftForm, department: e.target.value })} placeholder={selected?.department} />
          </Field>
          <Field label="Status">
            <select className={inputCls} value={shiftForm.status} onChange={(e) => setShiftForm({ ...shiftForm, status: e.target.value })}>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes" hint="Optional">
              <input className={inputCls} value={shiftForm.notes} onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
