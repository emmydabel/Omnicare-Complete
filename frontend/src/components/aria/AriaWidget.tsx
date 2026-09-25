"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, CircleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api-client";
import { PulseChip } from "./PulseChip";
import type { ChatMessage, SendMessageResponse } from "@/lib/types";

const SUGGESTIONS: Record<string, string[]> = {
  patient: ["I've had a headache since this morning", "What does my last lab result mean?", "Help me prepare questions for my next visit"],
  doctor: ["Summarize this patient's chart", "Differential for productive cough + fever", "Draft a discharge note"],
  nurse: ["What does an SpO2 of 91% indicate?", "Escalation checklist for tachycardia"],
  pharmacist: ["Interaction check: Lisinopril + Ibuprofen", "Max daily dose for Metformin"],
  admin: ["Summarize this week's occupancy", "Draft a staffing shortage notice"],
};

export function AriaWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, open]);

  if (!user) return null;

  const send = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || sending) return;
    setInput("");
    setError(null);

    // Optimistically show the user's own message immediately.
    const optimisticUser: ChatMessage = {
      id: Date.now(),
      session: sessionId ?? 0,
      role: "user",
      content: value,
      is_urgent: false,
      created_at: new Date().toISOString(),
      patient_name: user.full_name,
    };
    setMessages((m) => [...m, optimisticUser]);
    setSending(true);

    try {
      const res = await api.post<SendMessageResponse>("/ai-assistant/chat/", {
        session_id: sessionId,
        message: value,
      });
      setSessionId(res.session.id);
      setMessages((m) => [...m, res.message]);
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : "ARIA is unreachable right now.";
      setError(detail);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-600/30 transition-transform hover:scale-105 active:scale-95"
        aria-label={open ? "Close ARIA assistant" : "Open ARIA assistant"}
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Sparkles className="h-6 w-6" aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="ARIA assistant chat"
          className="animate-in fixed inset-x-3 bottom-24 z-40 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-auto sm:bottom-24 sm:right-5 sm:w-96"
          style={{ height: "70vh", maxHeight: 560 }}
        >
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500/20">
                <Sparkles className="h-4.5 w-4.5 text-teal-300" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-sm font-bold text-white">ARIA</p>
                <p className="text-xs text-slate-400">OMNICARE Intelligence · Healthcare Assistant</p>
              </div>
            </div>
            <PulseChip compact />
          </div>

          <div ref={scrollRef} role="log" aria-live="polite" aria-label="Conversation with ARIA" className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700">
                Hi, I&apos;m ARIA — OMNICARE&apos;s AI assistant. How can I help?
              </div>
            )}
            {messages.map((m, i) => (
              <div key={m.id ?? i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  style={{ maxWidth: "85%" }}
                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-teal-600 text-white"
                      : m.is_urgent
                        ? "rounded-bl-sm border border-red-200 bg-red-50 text-red-800"
                        : "rounded-bl-sm border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {m.is_urgent && (
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-red-600">
                      <CircleAlert className="h-3.5 w-3.5" /> Urgent — flagged for care team
                    </div>
                  )}
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: "0s" }} />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: "0.15s" }} />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">{error}</div>
            )}
          </div>

          {messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-3 py-2.5">
              {(SUGGESTIONS[user.role] || []).map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask ARIA anything..."
              aria-label="Message to ARIA"
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />
            <button
              onClick={() => send()}
              disabled={sending}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
