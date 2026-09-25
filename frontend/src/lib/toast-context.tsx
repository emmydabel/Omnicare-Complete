"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type ToastVariant = "success" | "error" | "info";
interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

type PushToast = (message: string, variant?: ToastVariant) => void;
const ToastContext = createContext<PushToast | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<PushToast>((message, variant = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const iconFor = { success: CheckCircle2, error: XCircle, info: AlertCircle } as const;
  const colorFor = { success: "text-teal-400", error: "text-red-400", info: "text-blue-400" } as const;

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
        style={{ width: "calc(100% - 2rem)" }}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => {
          const Icon = iconFor[t.variant];
          return (
            <div key={t.id} className="toast-in flex items-start gap-2.5 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl">
              <Icon className={`h-4.5 w-4.5 mt-0.5 shrink-0 ${colorFor[t.variant]}`} />
              <p className="text-sm font-medium leading-snug">{t.message}</p>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): PushToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
