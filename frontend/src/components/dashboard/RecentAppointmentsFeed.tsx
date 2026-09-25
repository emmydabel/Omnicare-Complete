"use client";

import { CalendarClock } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Appointment, Paginated } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  scheduled: "text-blue-600 bg-blue-50",
  confirmed: "text-teal-600 bg-teal-50",
  in_progress: "text-amber-600 bg-amber-50",
  completed: "text-green-600 bg-green-50",
  cancelled: "text-slate-500 bg-slate-100",
  no_show: "text-red-600 bg-red-50",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/**
 * There's no dedicated activity-log endpoint in the backend, so this
 * synthesizes a "recent activity" feed from the most recently updated
 * appointments — real data, just composed client-side rather than pulled
 * from a purpose-built audit log. A true activity feed spanning every
 * module (labs, billing, pharmacy...) would need a new backend endpoint;
 * noted as a gap in PROGRESS.md.
 */
export function RecentAppointmentsFeed() {
  const { data, loading } = useFetch<Paginated<Appointment>>("/appointments/?ordering=-updated_at&page_size=6");

  return (
    <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-display mb-4 text-sm font-bold text-slate-900">Recent Appointment Activity</h3>
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : !data?.results.length ? (
        <EmptyState icon={CalendarClock} title="No activity yet" subtitle="Recent appointment updates will show up here." />
      ) : (
        <div className="space-y-4">
          {data.results.map((a) => (
            <div key={a.id} className="flex gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${STATUS_COLOR[a.status] || "text-slate-500 bg-slate-100"}`}>
                <CalendarClock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm leading-snug text-slate-700">
                  {a.patient_name} with {a.doctor_name} — <span className="font-medium">{a.status_display}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(a.updated_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
