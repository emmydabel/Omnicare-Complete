import {
  LayoutDashboard, Users, Stethoscope, CalendarDays, FileText, Receipt, Pill,
  FlaskConical, Sparkles, UserCog, type LucideIcon,
} from "lucide-react";
import type { UserRole } from "./types";

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  nurse: "Nurse",
  pharmacist: "Pharmacist",
  patient: "Patient",
};

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  admin: [
    { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { key: "patients", label: "Patients", href: "/dashboard/patients", icon: Users },
    { key: "staff", label: "Staff & Users", href: "/dashboard/staff", icon: UserCog },
    { key: "scheduling", label: "Doctor Scheduling", href: "/dashboard/scheduling", icon: Stethoscope },
    { key: "appointments", label: "Appointments", href: "/dashboard/appointments", icon: CalendarDays },
    { key: "emr", label: "Medical Records", href: "/dashboard/emr", icon: FileText },
    { key: "billing", label: "Billing & Insurance", href: "/dashboard/billing", icon: Receipt },
    { key: "pharmacy", label: "Pharmacy", href: "/dashboard/pharmacy", icon: Pill },
    { key: "labs", label: "Lab Results", href: "/dashboard/labs", icon: FlaskConical },
    { key: "aria", label: "ARIA Assistant", href: "/dashboard/aria", icon: Sparkles },
  ],
  doctor: [
    { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { key: "scheduling", label: "My Schedule", href: "/dashboard/scheduling", icon: Stethoscope },
    { key: "appointments", label: "Appointments", href: "/dashboard/appointments", icon: CalendarDays },
    { key: "patients", label: "Patients", href: "/dashboard/patients", icon: Users },
    { key: "emr", label: "Medical Records", href: "/dashboard/emr", icon: FileText },
    { key: "labs", label: "Lab Results", href: "/dashboard/labs", icon: FlaskConical },
    { key: "aria", label: "ARIA Assistant", href: "/dashboard/aria", icon: Sparkles },
  ],
  nurse: [
    { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { key: "patients", label: "Patients", href: "/dashboard/patients", icon: Users },
    { key: "appointments", label: "Appointments", href: "/dashboard/appointments", icon: CalendarDays },
    { key: "emr", label: "Medical Records", href: "/dashboard/emr", icon: FileText },
    { key: "labs", label: "Lab Results", href: "/dashboard/labs", icon: FlaskConical },
    { key: "aria", label: "ARIA Assistant", href: "/dashboard/aria", icon: Sparkles },
  ],
  pharmacist: [
    { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { key: "pharmacy", label: "Pharmacy & Prescriptions", href: "/dashboard/pharmacy", icon: Pill },
    { key: "aria", label: "ARIA Assistant", href: "/dashboard/aria", icon: Sparkles },
  ],
  patient: [
    { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { key: "appointments", label: "My Appointments", href: "/dashboard/appointments", icon: CalendarDays },
    { key: "emr", label: "My Records", href: "/dashboard/emr", icon: FileText },
    { key: "billing", label: "Billing", href: "/dashboard/billing", icon: Receipt },
    { key: "aria", label: "ARIA Assistant", href: "/dashboard/aria", icon: Sparkles },
  ],
};

export const APPOINTMENT_STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-teal-50 text-teal-700 border-teal-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  no_show: "bg-red-50 text-red-700 border-red-200",
};

export const INVOICE_STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-500 border-slate-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  refunded: "bg-purple-50 text-purple-700 border-purple-200",
};

export const CLAIM_STATUS_STYLE: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  under_review: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  paid: "bg-teal-50 text-teal-700 border-teal-200",
};

export const LAB_STATUS_STYLE: Record<string, string> = {
  requested: "bg-blue-50 text-blue-700 border-blue-200",
  sample_collected: "bg-purple-50 text-purple-700 border-purple-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

export const LAB_PRIORITY_STYLE: Record<string, string> = {
  routine: "bg-slate-100 text-slate-600 border-slate-200",
  urgent: "bg-amber-50 text-amber-700 border-amber-200",
  stat: "bg-red-50 text-red-700 border-red-200",
};

export const PRESCRIPTION_STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  partially_dispensed: "bg-blue-50 text-blue-700 border-blue-200",
  dispensed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

export const ADMISSION_STATUS_STYLE: Record<string, string> = {
  outpatient: "bg-green-50 text-green-700 border-green-200",
  admitted: "bg-amber-50 text-amber-700 border-amber-200",
  discharged: "bg-slate-100 text-slate-500 border-slate-200",
};
