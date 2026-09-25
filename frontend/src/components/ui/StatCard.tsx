import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  delta?: string;
  deltaUp?: boolean;
  tint: string;
}

export function StatCard({ icon: Icon, label, value, delta, deltaUp, tint }: StatCardProps) {
  return (
    <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="font-data mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {delta && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-semibold ${deltaUp ? "text-green-600" : "text-red-500"}`}>
          {deltaUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {delta}
        </div>
      )}
    </div>
  );
}
