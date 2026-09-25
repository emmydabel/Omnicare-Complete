import React from "react";

export function PulseChip({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-teal-500/10 px-2.5 py-1">
      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />
      {!compact && <span className="text-[10px] font-medium uppercase tracking-wider text-teal-300">Online</span>}
    </div>
  );
}
