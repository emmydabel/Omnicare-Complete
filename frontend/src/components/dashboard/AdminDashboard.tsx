"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { Users, Stethoscope, DollarSign, BedDouble } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { StatCard } from "@/components/ui/StatCard";
import { CardSkeleton } from "@/components/ui/EmptyState";
import { VitalsMonitor } from "./VitalsMonitor";
import { RecentAppointmentsFeed } from "./RecentAppointmentsFeed";
import type { AppointmentStats, FinancialSummary, PatientStats } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6", confirmed: "#0d9488", in_progress: "#f59e0b",
  completed: "#22c55e", cancelled: "#94a3b8", no_show: "#ef4444",
};

export function AdminDashboard() {
  const { data: patientStats, loading: l1 } = useFetch<PatientStats>("/patients/stats/");
  const { data: apptStats, loading: l2 } = useFetch<AppointmentStats>("/appointments/stats/");
  const { data: finance, loading: l3 } = useFetch<FinancialSummary>("/invoices/financial_summary/");
  const loading = l1 || l2 || l3;

  const statusData = apptStats
    ? Object.entries(apptStats.by_status)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({ name: status.replace("_", " "), value: count, color: STATUS_COLORS[status] || "#94a3b8" }))
    : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={Users} label="Total Patients" value={patientStats?.total ?? "—"} tint="bg-blue-50 text-blue-600" />
            <StatCard icon={BedDouble} label="Currently Admitted" value={patientStats?.admitted ?? "—"} tint="bg-amber-50 text-amber-600" />
            <StatCard icon={Stethoscope} label="Appointments (All Time)" value={apptStats?.total ?? "—"} tint="bg-teal-50 text-teal-600" />
            <StatCard
              icon={DollarSign}
              label="Revenue Collected"
              value={finance ? `₦${finance.total_collected.toLocaleString()}` : "—"}
              delta={finance ? `₦${finance.outstanding_balance.toLocaleString()} outstanding` : undefined}
              tint="bg-green-50 text-green-600"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="font-display text-sm font-bold text-slate-900">Revenue Trend</h3>
          <p className="text-xs text-slate-500">Last 6 months, collected payments</p>
          <div style={{ width: "100%", height: 260 }} className="mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={finance?.monthly_revenue ?? []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display text-sm font-bold text-slate-900">Appointment Status Mix</h3>
          <div style={{ width: "100%", height: 260 }} className="mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {statusData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VitalsMonitor />
        </div>
        <RecentAppointmentsFeed />
      </div>
    </div>
  );
}
