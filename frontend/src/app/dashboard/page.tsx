"use client";

import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/ui/EmptyState";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { DoctorDashboard } from "@/components/dashboard/DoctorDashboard";
import { NurseDashboard } from "@/components/dashboard/NurseDashboard";
import { PharmacistDashboard } from "@/components/dashboard/PharmacistDashboard";
import { PatientDashboard } from "@/components/dashboard/PatientDashboard";

const GREETING: Record<string, string> = {
  admin: "Here's what's happening across OMNICARE today.",
  doctor: "Here's your day at a glance.",
  nurse: "Here's what needs your attention.",
  pharmacist: "Here's today's pharmacy overview.",
  patient: "Here's your health at a glance.",
};

export default function DashboardHomePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div>
      <PageHeader title={`Welcome, ${user.first_name || user.full_name}`} subtitle={GREETING[user.role]} />
      {user.role === "admin" && <AdminDashboard />}
      {user.role === "doctor" && <DoctorDashboard />}
      {user.role === "nurse" && <NurseDashboard />}
      {user.role === "pharmacist" && <PharmacistDashboard />}
      {user.role === "patient" && <PatientDashboard />}
    </div>
  );
}
