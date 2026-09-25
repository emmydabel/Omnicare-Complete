import { Check } from "lucide-react";
import { Badge } from "./Badge";
import { APPOINTMENT_STATUS_STYLE } from "@/lib/constants";
import { APPOINTMENT_STEPS, type AppointmentStatus } from "@/lib/types";

const STEP_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
};

export function StatusStepper({ current, compact }: { current: AppointmentStatus; compact?: boolean }) {
  if (current === "cancelled" || current === "no_show") {
    return <Badge className={APPOINTMENT_STATUS_STYLE[current]}>{current === "cancelled" ? "Cancelled" : "No Show"}</Badge>;
  }
  const idx = APPOINTMENT_STEPS.indexOf(current);
  return (
    <div className="flex items-center">
      {APPOINTMENT_STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                i < idx
                  ? "border-teal-600 bg-teal-600 text-white"
                  : i === idx
                    ? "border-teal-600 bg-white text-teal-600"
                    : "border-slate-200 bg-white text-slate-300"
              }`}
            >
              {i < idx ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            {!compact && <span className={`mt-1 text-xs font-medium ${i <= idx ? "text-slate-600" : "text-slate-300"}`}>{STEP_LABELS[step]}</span>}
          </div>
          {i < APPOINTMENT_STEPS.length - 1 && <div className={`h-0.5 w-6 sm:w-10 ${i < idx ? "bg-teal-600" : "bg-slate-200"}`} />}
        </div>
      ))}
    </div>
  );
}
