"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AriaWidget } from "@/components/aria/AriaWidget";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/patients": "Patient Management",
  "/dashboard/staff": "Staff & Users",
  "/dashboard/scheduling": "Doctor Scheduling",
  "/dashboard/appointments": "Appointments",
  "/dashboard/emr": "Medical Records",
  "/dashboard/billing": "Billing & Insurance",
  "/dashboard/pharmacy": "Pharmacy",
  "/dashboard/labs": "Lab Results",
  "/dashboard/aria": "ARIA Assistant",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Safety net beyond proxy.ts: proxy only checks cookie *presence*, so an
    // expired/invalid session that fails hydration needs a client-side bounce.
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const title = TITLES[pathname] ?? "Dashboard";

  return (
    <div className="flex h-screen bg-slate-50">
      <a
        href="#main-content"
        className="fixed left-2 top-2 z-[60] -translate-y-16 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} onOpenMobile={() => setMobileOpen(true)} />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-6 outline-none">
          {children}
        </main>
      </div>
      <AriaWidget />
    </div>
  );
}
