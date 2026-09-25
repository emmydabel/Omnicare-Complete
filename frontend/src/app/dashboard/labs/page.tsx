"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TestTube, Plus, X, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useServerTable } from "@/lib/useServerTable";
import { useToast } from "@/lib/toast-context";
import { api, ApiError } from "@/lib/api-client";
import { PageHeader, EmptyState } from "@/components/ui/EmptyState";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { Field, inputCls } from "@/components/ui/Field";
import { LAB_STATUS_STYLE, LAB_PRIORITY_STYLE } from "@/lib/constants";
import type { LabTestRequest, LabResult, PatientProfile, Paginated } from "@/lib/types";

const TEST_TYPE_LABEL: Record<string, string> = {
  cbc: "Complete Blood Count", blood_glucose: "Blood Glucose", lipid_panel: "Lipid Panel",
  liver_function: "Liver Function Panel", kidney_function: "Kidney Function Panel", thyroid_panel: "Thyroid Panel",
  electrolytes: "Electrolyte Panel", urinalysis: "Urinalysis", coagulation: "Coagulation Panel",
  culture_sensitivity: "Culture & Sensitivity", xray: "X-Ray", ct_scan: "CT Scan", mri: "MRI",
  covid_pcr: "COVID-19 PCR", other: "Other",
};

interface RequestForm {
  patient: string;
  test_type: string;
  priority: string;
  clinical_notes: string;
}
const emptyRequestForm: RequestForm = { patient: "", test_type: "cbc", priority: "routine", clinical_notes: "" };

interface ParamRow {
  parameter_name: string;
  value: string;
  unit: string;
  reference_range_low: string;
  reference_range_high: string;
}
const emptyParamRow: ParamRow = { parameter_name: "", value: "", unit: "", reference_range_low: "", reference_range_high: "" };

export default function LabResultsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isDoctor = user?.role === "doctor";
  // Matches the backend's IsAdminOrClinicalStaff = role_permission("admin", "doctor", "nurse") —
  // verified against the actual permission class rather than assumed.
  const canEnterResult = user?.role === "admin" || user?.role === "doctor" || user?.role === "nurse";
  const table = useServerTable<LabTestRequest>({ endpoint: "/lab-requests/", pageSize: 7, filterParam: "status" });
  const [detail, setDetail] = useState<LabTestRequest | null>(null);

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestForm>(emptyRequestForm);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [savingRequest, setSavingRequest] = useState(false);

  const [resultOpen, setResultOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [params, setParams] = useState<ParamRow[]>([{ ...emptyParamRow }]);
  const [resultAttachment, setResultAttachment] = useState<File | null>(null);
  const [savingResult, setSavingResult] = useState(false);

  useEffect(() => {
    if (!requestOpen) return;
    api.get<Paginated<PatientProfile>>("/patients/?page_size=100").then((r) => setPatients(r.results)).catch(() => {});
  }, [requestOpen]);

  const criticalCount = table.data.filter((r) => r.result?.has_critical_values).length;

  const submitRequest = async () => {
    setSavingRequest(true);
    try {
      await api.post("/lab-requests/", { ...requestForm, patient: Number(requestForm.patient) });
      toast("Lab test requested.");
      setRequestOpen(false);
      setRequestForm(emptyRequestForm);
      table.refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.fieldErrorSummary || err.message : "Couldn't request test.", "error");
    } finally {
      setSavingRequest(false);
    }
  };

  const openResultEntry = () => {
    setSummary("");
    setParams([{ ...emptyParamRow }]);
    setResultAttachment(null);
    setResultOpen(true);
  };

  const updateParam = (i: number, field: keyof ParamRow, value: string) => {
    setParams((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const submitResult = async () => {
    if (!detail) return;
    setSavingResult(true);
    try {
      // Two requests, deliberately: the nested `parameters` array needs a
      // real JSON body to be parsed correctly by the backend's nested
      // writable serializer — multipart/form-data can't carry a nested
      // array the same way, so if there's a file we attach it in a
      // follow-up PATCH instead of trying to cram everything into one
      // multipart request.
      const created = await api.post<LabResult>("/lab-results/", {
        test_request: detail.id,
        summary,
        parameters: params
          .filter((p) => p.parameter_name.trim())
          .map((p) => ({
            parameter_name: p.parameter_name,
            value: p.value,
            unit: p.unit,
            reference_range_low: p.reference_range_low || null,
            reference_range_high: p.reference_range_high || null,
          })),
      });
      if (resultAttachment) {
        const form = new FormData();
        form.append("attachment", resultAttachment);
        await api.patchForm(`/lab-results/${created.id}/`, form);
      }
      toast("Result entered — request marked completed.");
      setResultOpen(false);
      setResultAttachment(null);
      setDetail(null);
      table.refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.fieldErrorSummary || err.message : "Couldn't save result.", "error");
    } finally {
      setSavingResult(false);
    }
  };

  const columns: Column<LabTestRequest>[] = [
    { key: "request_id", label: "Request", render: (r) => <span className="font-data text-xs text-slate-500">{r.request_id}</span> },
    { key: "patient_name", label: "Patient", sortable: true },
    { key: "test_type", label: "Test", render: (r) => <span>{TEST_TYPE_LABEL[r.test_type] || r.test_type}</span> },
    { key: "priority", label: "Priority", render: (r) => <Badge className={LAB_PRIORITY_STYLE[r.priority]}>{r.priority}</Badge> },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <Badge className={LAB_STATUS_STYLE[r.status]}>{r.status.replace("_", " ")}</Badge>
          {r.result?.has_critical_values && (
            <Badge className="border-red-300 bg-red-100 text-red-700">
              <AlertTriangle className="h-3 w-3" /> Critical
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <button onClick={() => setDetail(r)} className="text-xs font-semibold text-teal-600 hover:text-teal-700">
          View {r.result ? "Result" : "Status"}
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Lab Results"
        subtitle="Test requests, results, and critical value flagging"
        action={
          isDoctor && (
            <PrimaryButton icon={Plus} onClick={() => setRequestOpen(true)}>
              Request Test
            </PrimaryButton>
          )
        }
      />

      {criticalCount > 0 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-800">
            {criticalCount} result(s) on this page flagged with a critical value — review recommended.
          </p>
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
        filterOptions={{
          param: "status",
          options: [
            { value: "requested", label: "Requested" },
            { value: "sample_collected", label: "Sample Collected" },
            { value: "in_progress", label: "In Progress" },
            { value: "completed", label: "Completed" },
          ],
        }}
        filterValue={table.filterValue}
        onFilterChange={table.setFilterValue}
        searchPlaceholder="Search patient or request ID..."
      />

      {/* Request a new test (doctor) */}
      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request Lab Test"
        wide
        footer={
          <>
            <SecondaryButton onClick={() => setRequestOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton icon={Plus} loading={savingRequest} onClick={submitRequest}>
              Submit Request
            </PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Patient">
            <select className={inputCls} value={requestForm.patient} onChange={(e) => setRequestForm({ ...requestForm, patient: e.target.value })}>
              <option value="">Select patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.full_name} ({p.patient_id})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Test Type">
            <select className={inputCls} value={requestForm.test_type} onChange={(e) => setRequestForm({ ...requestForm, test_type: e.target.value })}>
              {Object.entries(TEST_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select className={inputCls} value={requestForm.priority} onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT (Immediate)</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Clinical Notes" hint="Reason for test / clinical context">
              <textarea className={inputCls} rows={2} value={requestForm.clinical_notes} onChange={(e) => setRequestForm({ ...requestForm, clinical_notes: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>

      {/* View result / enter result */}
      <Modal
        open={!!detail}
        onClose={() => {
          setDetail(null);
          setResultOpen(false);
        }}
        title={detail ? `${TEST_TYPE_LABEL[detail.test_type] || detail.test_type} — ${detail.patient_name}` : ""}
        wide
      >
        {detail?.result ? (
          <div className="space-y-3">
            {detail.result.summary && <p className="text-sm text-slate-600">{detail.result.summary}</p>}
            {detail.result.parameters.map((p) => (
              <div key={p.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${p.is_critical ? "border-red-200 bg-red-50" : "border-slate-100"}`}>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.parameter_name}</p>
                  {(p.reference_range_low || p.reference_range_high) && (
                    <p className="text-xs text-slate-500">
                      Reference: {p.reference_range_low ?? "—"} – {p.reference_range_high ?? "—"} {p.unit}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`font-data text-base font-bold ${p.is_critical ? "text-red-600" : "text-slate-800"}`}>
                    {p.value} <span className="text-xs font-medium text-slate-400">{p.unit}</span>
                  </p>
                  {p.is_critical && <Badge className="mt-1 border-red-300 bg-red-100 text-red-700">Critical</Badge>}
                </div>
              </div>
            ))}
          </div>
        ) : detail && !resultOpen ? (
          <EmptyState
            icon={TestTube}
            title="Result not yet available"
            subtitle={`This request is currently: ${detail.status.replace("_", " ")}`}
            action={
              canEnterResult && (
                <PrimaryButton className="mt-4" icon={Plus} onClick={openResultEntry}>
                  Enter Result
                </PrimaryButton>
              )
            }
          />
        ) : (
          detail && (
            <div className="space-y-4">
              <Field label="Summary">
                <textarea className={inputCls} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Overall interpretation..." />
              </Field>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Parameters</span>
                  <button
                    onClick={() => setParams((rows) => [...rows, { ...emptyParamRow }])}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    + Add parameter
                  </button>
                </div>
                <div className="space-y-2">
                  {params.map((p, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1.5 rounded-lg border border-slate-100 p-2">
                      <input className={`${inputCls} col-span-4`} placeholder="Parameter (e.g. Hemoglobin)" value={p.parameter_name} onChange={(e) => updateParam(i, "parameter_name", e.target.value)} />
                      <input className={`${inputCls} col-span-2`} placeholder="Value" value={p.value} onChange={(e) => updateParam(i, "value", e.target.value)} />
                      <input className={`${inputCls} col-span-2`} placeholder="Unit" value={p.unit} onChange={(e) => updateParam(i, "unit", e.target.value)} />
                      <input className={`${inputCls} col-span-2`} placeholder="Range low" value={p.reference_range_low} onChange={(e) => updateParam(i, "reference_range_low", e.target.value)} />
                      <input className={`${inputCls} col-span-1`} placeholder="High" value={p.reference_range_high} onChange={(e) => updateParam(i, "reference_range_high", e.target.value)} />
                      <button onClick={() => setParams((rows) => rows.filter((_, idx) => idx !== i))} className="col-span-1 flex items-center justify-center text-slate-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-400">A value outside the low/high range is auto-flagged critical by the backend.</p>
              </div>
              <Field label="Attachment" hint="Optional — e.g. imaging or a scanned report">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-100">
                  <Upload className="h-4 w-4" />
                  {resultAttachment ? resultAttachment.name : "Choose a file..."}
                  <input type="file" className="hidden" onChange={(e) => setResultAttachment(e.target.files?.[0] ?? null)} />
                </label>
              </Field>
              <div className="flex justify-end gap-2">
                <SecondaryButton onClick={() => setResultOpen(false)}>Back</SecondaryButton>
                <PrimaryButton icon={Plus} loading={savingResult} onClick={submitResult}>
                  Save Result
                </PrimaryButton>
              </div>
            </div>
          )
        )}
      </Modal>
    </div>
  );
}
