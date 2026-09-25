"use client";

import { Pill, AlertTriangle, ClipboardList, DollarSign } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { StatCard } from "@/components/ui/StatCard";
import { CardSkeleton, EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import type { Medicine, Paginated, PharmacyStats, Prescription } from "@/lib/types";

export function PharmacistDashboard() {
  const { data: stats, loading: l1 } = useFetch<PharmacyStats>("/medicines/stats/");
  const { data: lowStock, loading: l2 } = useFetch<Medicine[]>("/medicines/low-stock/");
  const { data: queue, loading: l3 } = useFetch<Paginated<Prescription>>("/prescriptions/queue/");
  const loading = l1 || l2 || l3;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={Pill} label="Total SKUs" value={stats?.total_items ?? 0} tint="bg-blue-50 text-blue-600" />
            <StatCard icon={AlertTriangle} label="Low Stock Alerts" value={stats?.low_stock_count ?? 0} tint="bg-red-50 text-red-600" />
            <StatCard icon={ClipboardList} label="Pending Prescriptions" value={queue?.count ?? 0} tint="bg-amber-50 text-amber-600" />
            <StatCard
              icon={DollarSign}
              label="Inventory Value"
              value={stats ? `₦${stats.inventory_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              tint="bg-green-50 text-green-600"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display mb-4 text-sm font-bold text-slate-900">Low Stock Alerts</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : !lowStock?.length ? (
            <EmptyState icon={Pill} title="Stock levels healthy" subtitle="No items are at or below their reorder point." />
          ) : (
            <div className="space-y-2.5">
              {lowStock.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 px-3.5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-500">{m.category_display} · Reorder at {m.reorder_level}</p>
                  </div>
                  <Badge className="border-red-200 bg-red-100 text-red-700">{m.stock_quantity} left</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display mb-4 text-sm font-bold text-slate-900">Prescription Queue</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : !queue?.results.length ? (
            <EmptyState icon={ClipboardList} title="Queue is empty" subtitle="No prescriptions waiting to be dispensed." />
          ) : (
            <div className="space-y-2.5">
              {queue.results.slice(0, 6).map((rx) => (
                <div key={rx.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{rx.patient_name}</p>
                    <p className="text-xs text-slate-500">{rx.doctor_name} · {rx.items.length} item(s)</p>
                  </div>
                  <Badge className="border-amber-200 bg-amber-50 text-amber-700">{rx.status_display}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
