"use client";

import { useEffect, useState } from "react";
import { Heart, Droplets, Activity, Thermometer } from "lucide-react";
import { api } from "@/lib/api-client";
import { EKGTrace } from "@/components/layout/PulseChip";
import { EmptyState } from "@/components/ui/EmptyState";
import type { VitalSign } from "@/lib/types";

const POLL_MS = 20000;

export function VitalsMonitor() {
  const [feed, setFeed] = useState<VitalSign[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .get<VitalSign[]>("/vitals/live_feed/")
        .then((data) => {
          if (!cancelled) {
            setFeed(data);
            setError(false);
          }
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const latest = feed?.[0];

  return (
    <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <h3 className="font-display text-sm font-bold text-slate-900">Live Vitals Monitor</h3>
        </div>
        {latest && <span className="text-xs font-semibold text-slate-400">{latest.patient_name}</span>}
      </div>

      {feed === null && !error ? (
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      ) : !latest ? (
        <EmptyState icon={Heart} title="No vitals recorded yet" subtitle="Readings entered by clinical staff will appear here in near real time." />
      ) : (
        <>
          <div className="mb-4 rounded-xl bg-slate-950 p-3">
            <EKGTrace containerClassName="h-14 w-full" stroke="#4ade80" strokeWidth={2.5} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <VitalTile icon={Heart} label="Heart Rate" value={latest.heart_rate ?? "—"} unit="bpm" color="text-rose-500 bg-rose-50" />
            <VitalTile icon={Droplets} label="SpO₂" value={latest.oxygen_saturation ?? "—"} unit="%" color="text-blue-500 bg-blue-50" />
            <VitalTile
              icon={Activity}
              label="Blood Pressure"
              value={latest.blood_pressure_systolic && latest.blood_pressure_diastolic ? `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic}` : "—"}
              unit="mmHg"
              color="text-purple-500 bg-purple-50"
            />
            <VitalTile icon={Thermometer} label="Temperature" value={latest.temperature_celsius ?? "—"} unit="°C" color="text-amber-500 bg-amber-50" />
          </div>
          {latest.is_critical && (
            <p className="mt-3 text-xs font-semibold text-red-600">⚠ This reading is outside the safe threshold — flagged critical.</p>
          )}
        </>
      )}
    </div>
  );
}

function VitalTile({ icon: Icon, label, value, unit, color }: { icon: typeof Heart; label: string; value: string | number; unit: string; color: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="font-data text-lg font-bold text-slate-900">
        {value}
        <span className="ml-1 text-xs font-medium text-slate-400">{unit}</span>
      </p>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
    </div>
  );
}
