"use client";

import { CalendarDays, Clock, Receipt, Sparkles } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { StatusStepper } from "@/components/ui/StatusStepper";
import { SecondaryButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import type { Allergy, Appointment, Invoice, Paginated } from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function PatientDashboard() {
  const { data: appts, loading: l1 } = useFetch<Paginated<Appointment>>("/appointments/?ordering=scheduled_start&page_size=20");
  const { data: invoices, loading: l2 } = useFetch<Paginated<Invoice>>("/invoices/?ordering=-created_at&page_size=20");
  const { data: allergies, loading: l3 } = useFetch<Paginated<Allergy>>("/allergies/");

  const upcoming = appts?.results.find((a) => !["completed", "cancelled", "no_show"].includes(a.status));
  const balanceDue = invoices?.results.reduce((sum, inv) => sum + parseFloat(inv.balance_due || "0"), 0) ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 animate-in rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-600 to-teal-700 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-100">Upcoming Appointment</p>
          {l1 ? (
            <div className="mt-3 h-16 animate-pulse rounded-lg bg-white/10" />
          ) : !upcoming ? (
            <p className="mt-3 text-teal-50">No upcoming appointments booked.</p>
          ) : (
            <>
              <h3 className="font-display mt-2 text-xl font-bold">{upcoming.reason || upcoming.visit_type_display}</h3>
              <p className="mt-1 text-teal-100">
                {upcoming.doctor_name} · {upcoming.department}
              </p>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" /> {fmtDate(upcoming.scheduled_start)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {fmtTime(upcoming.scheduled_start)}
                </span>
              </div>
              <div className="mt-4">
                <StatusStepper current={upcoming.status} compact />
              </div>
            </>
          )}
        </div>
        <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display mb-3 text-sm font-bold text-slate-900">Outstanding Balance</h3>
          {l2 ? (
            <div className="h-9 w-24 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="font-data text-3xl font-bold text-slate-900">₦{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          )}
          <p className={`mt-1 text-xs font-semibold ${balanceDue > 0 ? "text-amber-600" : "text-green-600"}`}>
            {balanceDue > 0 ? "Payment due" : "All invoices paid"}
          </p>
          <a href="/dashboard/billing">
            <SecondaryButton className="mt-4 w-full" icon={Receipt}>
              View Billing History
            </SecondaryButton>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display mb-4 text-sm font-bold text-slate-900">Your Appointments</h3>
          {l1 ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : !appts?.results.length ? (
            <EmptyState icon={CalendarDays} title="No appointments yet" subtitle="Book your first appointment to see it here." />
          ) : (
            <div className="space-y-2.5">
              {appts.results.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{a.doctor_name}</p>
                    <p className="text-xs text-slate-500">{fmtDate(a.scheduled_start)} · {fmtTime(a.scheduled_start)}</p>
                  </div>
                  <StatusStepper current={a.status} compact />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display mb-3 text-sm font-bold text-slate-900">Known Allergies</h3>
          {l3 ? (
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ) : !allergies?.results.length ? (
            <p className="text-sm text-slate-500">No allergies on file.</p>
          ) : (
            allergies.results.map((a) => (
              <div key={a.id} className="mb-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-bold text-amber-800">{a.allergen}</p>
                <Badge className="mt-1 border-amber-300 bg-white text-amber-700">{a.severity}</Badge>
              </div>
            ))
          )}
          <a href="/dashboard/aria">
            <SecondaryButton className="mt-2 w-full" icon={Sparkles}>
              Ask ARIA about this
            </SecondaryButton>
          </a>
        </div>
      </div>
    </div>
  );
}
