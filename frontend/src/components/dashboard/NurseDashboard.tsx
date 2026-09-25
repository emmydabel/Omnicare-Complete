"use client";

import { BedDouble, AlertTriangle, FlaskConical } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { StatCard } from "@/components/ui/StatCard";
import { CardSkeleton, EmptyState } from "@/components/ui/EmptyState";
import { VitalsMonitor } from "./VitalsMonitor";
import { RecentAppointmentsFeed } from "./RecentAppointmentsFeed";
import type { LabResult, PatientStats } from "@/lib/types";

export function NurseDashboard() {
  const { data: patientStats, loading: l1 } = useFetch<PatientStats>("/patients/stats/");
  const { data: criticalLabs, loading: l2 } = useFetch<LabResult[]>("/lab-results/critical/");
  const loading = l1 || l2;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={BedDouble} label="Admitted Patients" value={patientStats?.admitted ?? 0} tint="bg-blue-50 text-blue-600" />
            <StatCard icon={AlertTriangle} label="Critical Lab Flags" value={criticalLabs?.length ?? 0} tint="bg-red-50 text-red-600" />
            <StatCard icon={BedDouble} label="Outpatients Today" value={patientStats?.outpatient ?? 0} tint="bg-teal-50 text-teal-600" />
            <StatCard icon={FlaskConical} label="Discharged (Total)" value={patientStats?.discharged ?? 0} tint="bg-slate-100 text-slate-600" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VitalsMonitor />
        </div>
        <div className="animate-in rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
            <h3 className="font-display text-sm font-bold text-red-800">Critical Lab Values</h3>
          </div>
          {loading ? (
            <div className="h-24 animate-pulse rounded-xl bg-white/60" />
          ) : !criticalLabs?.length ? (
            <p className="text-sm text-red-700">No unreviewed critical results right now.</p>
          ) : (
            <div className="space-y-2.5">
              {criticalLabs.slice(0, 4).map((r) => (
                <div key={r.id} className="rounded-xl bg-white p-3">
                  <p className="text-sm font-semibold text-slate-800">Result #{r.id}</p>
                  <p className="text-xs text-red-600">
                    {r.parameters.filter((p) => p.is_critical).map((p) => p.parameter_name).join(", ") || "Flagged value"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RecentAppointmentsFeed />
    </div>
  );
}
