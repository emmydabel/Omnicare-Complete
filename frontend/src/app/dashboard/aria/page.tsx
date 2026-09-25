"use client";

import { MessageCircle, Sparkles, BadgeCheck, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useFetch } from "@/lib/useFetch";
import { PageHeader, EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { PulseChip } from "@/components/layout/PulseChip";
import type { ChatMessage } from "@/lib/types";

export default function AriaPage() {
  const { user } = useAuth();
  const isStaff = user?.role !== "patient";
  const { data: flags, loading } = useFetch<ChatMessage[]>(isStaff ? "/ai-assistant/urgent-flags/" : null);

  return (
    <div>
      <PageHeader title="ARIA Assistant" subtitle="Built directly into OMNICARE · native conversation history, no third-party framework" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 animate-in flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ height: 420 }}>
          <div className="mb-4"><PulseChip /></div>
          <MessageCircle className="h-8 w-8 text-slate-300" />
          <p className="font-display mt-3 text-base font-semibold text-slate-700">Use the chat bubble</p>
          <p className="mt-1 max-w-sm text-center text-sm text-slate-500">
            Tap the floating ARIA button in the bottom-right corner of any screen to start a live conversation — it stays with you across the whole app.
          </p>
        </div>
        <div className="space-y-5">
          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-display mb-3 text-sm font-bold text-slate-900">What ARIA can do</h3>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li className="flex gap-2">
                <BadgeCheck className="h-4 w-4 shrink-0 text-teal-600" /> Triage symptoms & suggest care level
              </li>
              <li className="flex gap-2">
                <BadgeCheck className="h-4 w-4 shrink-0 text-teal-600" /> Answer general medical questions
              </li>
              <li className="flex gap-2">
                <BadgeCheck className="h-4 w-4 shrink-0 text-teal-600" /> Auto-flag urgent language for care teams
              </li>
              <li className="flex gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-teal-600" /> Summarize a patient&apos;s chart (ask from a patient&apos;s page)
              </li>
            </ul>
          </div>

          {isStaff && (
            <div className="animate-in rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
                <h3 className="font-display text-sm font-bold text-red-800">Urgent Flags Feed</h3>
              </div>
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : !flags?.length ? (
                <p className="text-sm text-red-700">No patient conversations flagged urgent recently.</p>
              ) : (
                <div className="space-y-2">
                  {flags.slice(0, 5).map((f) => (
                    <div key={f.id} className="rounded-lg bg-white p-2.5 text-xs text-red-700">
                      <span className="font-semibold">{f.patient_name}:</span> &ldquo;{f.content.slice(0, 80)}
                      {f.content.length > 80 ? "…" : ""}&rdquo;
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!isStaff && (
        <div className="mt-5">
          <EmptyState
            icon={Sparkles}
            title="Your conversations are private"
            subtitle="Only you can see your ARIA chat history. If something you say looks urgent, your care team is notified so they can follow up."
          />
        </div>
      )}
    </div>
  );
}
