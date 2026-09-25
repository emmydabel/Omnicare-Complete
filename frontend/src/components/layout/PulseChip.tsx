"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

const EKG_PATH =
  "M0,32 L24,32 L34,26 L44,34 L54,32 L74,32 L86,32 L94,36 L100,6 L106,54 L114,32 L134,32 L150,32 L162,22 L178,22 L190,32 L300,32" +
  " L324,32 L334,26 L344,34 L354,32 L374,32 L386,32 L394,36 L400,6 L406,54 L414,32 L434,32 L450,32 L462,22 L478,22 L490,32 L600,32";

export function EKGTrace({
  containerClassName = "h-9 w-28 sm:w-40 md:w-48",
  stroke = "#2dd4bf",
  strokeWidth = 2.5,
}: {
  containerClassName?: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      <svg
        width="600"
        height="60"
        viewBox="0 0 600 60"
        className="absolute inset-y-0 left-0 ekg-track"
        style={{ filter: `drop-shadow(0 0 4px ${stroke}99)` }}
      >
        <path d={EKG_PATH} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** OMNICARE's signature header element: a live-looking cardiac monitor chip. */
export function PulseChip({ compact = false }: { compact?: boolean }) {
  const [bpm, setBpm] = useState(74);

  useEffect(() => {
    const id = setInterval(() => {
      setBpm((b) => Math.max(64, Math.min(96, b + Math.round((Math.random() - 0.5) * 6))));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`flex items-center gap-2 rounded-full bg-slate-900 ${compact ? "px-2.5 py-1" : "px-3.5 py-1.5"} shadow-inner`}>
      <Heart className="h-3.5 w-3.5 text-rose-400 animate-pulse" fill="currentColor" />
      <EKGTrace containerClassName={compact ? "h-5 w-16" : "h-6 w-20 sm:w-28"} stroke="#2dd4bf" strokeWidth={3} />
      {!compact && <span className="font-data text-xs font-semibold text-teal-300">{bpm} bpm</span>}
    </div>
  );
}
