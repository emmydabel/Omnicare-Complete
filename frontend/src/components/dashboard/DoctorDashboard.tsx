"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CalendarDays, FlaskConical, AlertTriangle } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { StatCard } from "@/components/ui/StatCard";
import { CardSkeleton, EmptyState } from "@/components/ui/EmptyState";
import { StatusStepper } from "@/components/ui/StatusStepper";
import { VitalsMonitor } from "./VitalsMonitor";
import type { Appointment, LabStats, Paginated } from "@/lib/types";

export function DoctorDashboard() {
  const { data: today, loading: l1 } = useFetch<Paginated<Appointment>>("/appointments/today/");
  const { data: labStats, loading: l2 } = useFetch<LabStats>("/lab-requests/stats/");
  const loading = l1 || l2;

  const remaining = today?.results.filter((a) => !["completed", "cancelled", "no_show"].includes(a.status)).length ?? 0;
  const byHour = (today?.results ?? []).map((a) => ({
    time: new Date(a.scheduled_start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    patient: a.patient_name,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={CalendarDays} label="Today's Appointments" value={today?.count ?? 0} delta={`${remaining} remaining`} tint="bg-teal-50 text-teal-600" />
            <StatCard icon={FlaskConical} label="Pending Lab Requests" value={labStats?.pending ?? 0} tint="bg-amber-50 text-amber-600" />
            <StatCard icon={AlertTriangle} label="STAT Priority Labs" value={labStats?.stat_priority ?? 0} tint="bg-red-50 text-red-600" />
            <StatCard icon={FlaskConical} label="Labs Completed Today" value={labStats?.completed_today ?? 0} tint="bg-green-50 text-green-600" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display mb-4 text-sm font-bold text-slate-900">Today&apos;s Schedule</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : !today?.results.length ? (
            <EmptyState icon={CalendarDays} title="No appointments today" subtitle="Your schedule is clear for today." />
          ) : (
            <div className="space-y-3">
              {today.results.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="font-data w-14 text-xs font-bold text-slate-500">
                      {new Date(a.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{a.patient_name}</p>
                      <p className="text-xs text-slate-500">{a.reason}</p>
                    </div>
                  </div>
                  <StatusStepper current={a.status} compact />
                </div>
              ))}
            </div>
          )}
        </div>
        <VitalsMonitor />
      </div>
    </div>
  );
}
