"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LogOut, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { NAV_BY_ROLE, ROLE_LABEL } from "@/lib/constants";

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "U";
}

export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  if (!user) return null;

  const items = NAV_BY_ROLE[user.role];

  const content = (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20">
          <Activity className="h-5 w-5 text-teal-400" />
        </div>
        <span className="font-display text-lg font-bold text-white">OMNICARE</span>
        <button className="ml-auto text-slate-400 hover:text-white lg:hidden" onClick={onCloseMobile} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onCloseMobile}
              aria-current={isActive ? "page" : undefined}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-teal-600/15 text-teal-300" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <item.icon className={`h-4.5 w-4.5 ${isActive ? "text-teal-400" : "text-slate-500 group-hover:text-slate-300"}`} />
              {item.label}
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
            {initials(user.first_name, user.last_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.full_name || user.email}</p>
            <p className="truncate text-xs text-slate-400">{ROLE_LABEL[user.role]}</p>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-red-400" aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:w-64 lg:shrink-0">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={onCloseMobile} />
          <div className="relative h-full w-72 animate-in">{content}</div>
        </div>
      )}
    </>
  );
}
