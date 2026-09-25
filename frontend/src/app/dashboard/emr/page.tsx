"use client";

import { useEffect, useState } from "react";
import { CircleAlert, FileText, Paperclip, Plus, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast-context";
import { PageHeader, EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { Field, inputCls } from "@/components/ui/Field";
import type { PatientChart, PatientProfile, Paginated } from "@/lib/types";

interface RecordForm {
  record_type: string;
  visit_date: string;
  diagnosis: string;
  treatment_plan: string;
  doctor_notes: string;
  icd_code: string;
}
const emptyRecordForm: RecordForm = {
  record_type: "diagnosis", visit_date: new Date().toISOString().slice(0, 10),
  diagnosis: "", treatment_plan: "", doctor_notes: "", icd_code: "",
};
export default function EmrPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isPatient = user?.role === "patient";
  const canAddRecord = user?.role === "doctor" || user?.role === "admin";
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [selected, setSelected] = useState<PatientProfile | null>(null);
  const [chart, setChart] = useState<PatientChart | null>(null);
  const [loadingList, setLoadingList] = useState(!isPatient);
  const [loadingChart, setLoadingChart] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [recordForm, setRecordForm] = useState<RecordForm>(emptyRecordForm);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [chartRefreshTick, setChartRefreshTick] = useState(0);

  useEffect(() => {
    if (isPatient) return;
    api
      .get<Paginated<PatientProfile>>("/patients/?page_size=100")
      .then((res) => {
        setPatients(res.results);
        if (res.results.length) setSelected(res.results[0]);
      })
      .finally(() => setLoadingList(false));
  }, [isPatient]);

  useEffect(() => {
    // For a patient, we need their own PatientProfile id first — fetch via /auth/me/-adjacent
    // patients list scoped to self (backend scopes PatientProfileViewSet to the logged-in
    // patient automatically), then load that record's chart.
    if (isPatient) {
      api
        .get<Paginated<PatientProfile>>("/patients/")
        .then((res) => {
          if (res.results.length) setSelected(res.results[0]);
        })
        .finally(() => setLoadingList(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPatient]);

  useEffect(() => {
    if (!selected) return;
    setLoadingChart(true);
    api
      .get<PatientChart>(`/medical-records/patient-chart/${selected.id}/`)
      .then(setChart)
      .catch(() => setChart({ records: [], allergies: [], recent_vitals: [] }))
      .finally(() => setLoadingChart(false));
  }, [selected, chartRefreshTick]);

  const submitRecord = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append("patient", String(selected.id));
      Object.entries(recordForm).forEach(([key, value]) => form.append(key, String(value)));
      if (attachment) form.append("attachment", attachment);
      await api.postForm("/medical-records/", form);
      toast("Medical record added.");
      setAddOpen(false);
      setRecordForm(emptyRecordForm);
      setAttachment(null);
      setChartRefreshTick((t) => t + 1);
    } catch (err) {
      toast(err instanceof ApiError ? err.fieldErrorSummary || err.message : "Couldn't save record.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={isPatient ? "My Medical Records" : "Electronic Medical Records"}
        subtitle="Diagnosis history, treatment plans, allergies & documents"
        action={
          canAddRecord &&
          selected && (
            <PrimaryButton icon={Plus} onClick={() => setAddOpen(true)}>
              Add Record
            </PrimaryButton>
          )
        }
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {!isPatient && (
          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-1" style={{ maxHeight: 520, overflowY: "auto" }}>
            {loadingList ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left ${selected?.id === p.id ? "bg-teal-50" : "hover:bg-slate-50"}`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {p.user.first_name?.[0]}
                    {p.user.last_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${selected?.id === p.id ? "text-teal-700" : "text-slate-700"}`}>{p.user.full_name}</p>
                    <p className="truncate text-xs text-slate-400">{p.patient_id}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        <div className={isPatient ? "lg:col-span-3 space-y-5" : "lg:col-span-2 space-y-5"}>
          <div className="animate-in rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <CircleAlert className="h-4.5 w-4.5 text-amber-600" />
              <h3 className="font-display text-sm font-bold text-amber-800">Allergies</h3>
            </div>
            {loadingChart ? (
              <Skeleton className="h-6 w-40" />
            ) : chart?.allergies.length ? (
              <div className="flex flex-wrap gap-2">
                {chart.allergies.map((a) => (
                  <Badge key={a.id} className="border-amber-300 bg-white text-amber-700">
                    {a.allergen} — {a.severity}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-700">No known allergies on file.</p>
            )}
          </div>

          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-display mb-4 text-sm font-bold text-slate-900">Diagnosis History</h3>
            {loadingChart ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !chart?.records.length ? (
              <EmptyState icon={FileText} title="No records yet" subtitle="Diagnosis history will appear here after the first visit." />
            ) : (
              <div className="space-y-4">
                {chart.records.map((r) => (
                  <div key={r.id} className="flex gap-3 border-l-2 border-teal-200 pl-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className="border-slate-200 bg-slate-50 text-slate-600">{r.record_type_display}</Badge>
                        <span className="font-data text-xs text-slate-400">{r.visit_date}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-700">{r.diagnosis || r.treatment_plan || r.doctor_notes}</p>
                      {r.treatment_plan && r.diagnosis && <p className="mt-1 text-xs text-slate-500">Plan: {r.treatment_plan}</p>}
                      <p className="mt-1 text-xs text-slate-400">{r.doctor_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-display mb-3 text-sm font-bold text-slate-900">Recent Vitals</h3>
            {loadingChart ? (
              <Skeleton className="h-16 w-full" />
            ) : !chart?.recent_vitals.length ? (
              <p className="text-sm text-slate-500">No vitals recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {chart.recent_vitals.slice(0, 3).map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-2.5 text-sm">
                    <span className="font-data text-xs text-slate-500">{new Date(v.recorded_at).toLocaleString()}</span>
                    <span className="text-slate-700">
                      HR {v.heart_rate ?? "—"} · BP {v.blood_pressure_systolic ?? "—"}/{v.blood_pressure_diastolic ?? "—"} · SpO2 {v.oxygen_saturation ?? "—"}%
                    </span>
                    {v.is_critical && <Badge className="border-red-200 bg-red-50 text-red-700">Critical</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-display mb-3 text-sm font-bold text-slate-900">Documents</h3>
            {(() => {
              const docs = chart?.records.filter((r) => r.attachment_url) ?? [];
              return docs.length ? (
                <div className="space-y-2">
                  {docs.map((r) => (
                    <a
                      key={r.id}
                      href={r.attachment_url!}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-2.5 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <Paperclip className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {r.record_type_display} · {r.visit_date}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-teal-600">Open</span>
                    </a>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Paperclip} title="No documents uploaded" subtitle="Scans, PDFs, and imaging results attached to a record will appear here." />
              );
            })()}
          </div>
        </div>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={`Add Medical Record — ${selected?.user.full_name ?? ""}`}
        wide
        footer={
          <>
            <SecondaryButton onClick={() => setAddOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton icon={Plus} loading={saving} onClick={submitRecord}>
              Save Record
            </PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Record Type">
            <select className={inputCls} value={recordForm.record_type} onChange={(e) => setRecordForm({ ...recordForm, record_type: e.target.value })}>
              <option value="diagnosis">Diagnosis</option>
              <option value="treatment_plan">Treatment Plan</option>
              <option value="progress_note">Progress Note</option>
              <option value="discharge_summary">Discharge Summary</option>
              <option value="lab_summary">Lab Summary</option>
            </select>
          </Field>
          <Field label="Visit Date">
            <input type="date" className={inputCls} value={recordForm.visit_date} onChange={(e) => setRecordForm({ ...recordForm, visit_date: e.target.value })} />
          </Field>
          <Field label="ICD Code" hint="Optional">
            <input className={inputCls} value={recordForm.icd_code} onChange={(e) => setRecordForm({ ...recordForm, icd_code: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Diagnosis">
              <input className={inputCls} value={recordForm.diagnosis} onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Treatment Plan">
              <textarea className={inputCls} rows={2} value={recordForm.treatment_plan} onChange={(e) => setRecordForm({ ...recordForm, treatment_plan: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Doctor's Notes">
              <textarea className={inputCls} rows={3} value={recordForm.doctor_notes} onChange={(e) => setRecordForm({ ...recordForm, doctor_notes: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Attachment" hint="Optional — scan, PDF, or image">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-100">
                <Upload className="h-4 w-4" />
                {attachment ? attachment.name : "Choose a file..."}
                <input type="file" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
              </label>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
