"use client";

import { Menu, Bell, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PulseChip } from "./PulseChip";

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "U";
}

export function TopBar({ title, onOpenMobile }: { title: string; onOpenMobile: () => void }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
      <button className="text-slate-500 hover:text-slate-800 lg:hidden" onClick={onOpenMobile} aria-label="Open menu">
        <Menu className="h-5.5 w-5.5" />
      </button>
      <h2 className="font-display hidden text-base font-bold text-slate-900 sm:block">{title}</h2>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <PulseChip compact />
        <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 md:flex">
          <Search className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search OMNICARE"
            placeholder="Search OMNICARE..."
            className="w-40 bg-transparent text-xs text-slate-600 outline-none placeholder:text-slate-400"
          />
        </div>
        <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
          <Bell className="h-4.5 w-4.5" />
        </button>
        {user && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
            {initials(user.first_name, user.last_name)}
          </div>
        )}
      </div>
    </header>
  );
}
