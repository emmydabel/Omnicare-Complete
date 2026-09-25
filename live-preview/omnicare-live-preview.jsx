import { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  LayoutDashboard, Users, UserRound, Stethoscope, CalendarDays, CalendarClock, FileText,
  Receipt, Pill, FlaskConical, MessageCircle, Search, Bell, ChevronDown, ChevronLeft,
  ChevronRight, Menu, X, Plus, SlidersHorizontal, ArrowUpDown, Activity, TrendingUp,
  TrendingDown, AlertTriangle, CheckCircle2, Clock, XCircle, Send, Sparkles, LogOut,
  Heart, Thermometer, Wind, Droplets, Wallet, ClipboardList, ShieldCheck, BedDouble,
  Building2, Phone, Mail, MapPin, Download, Eye, Pencil, Trash2, ArrowRight, AlertCircle,
  Loader2, BadgeCheck, TestTube, CreditCard, DollarSign, BarChart3, UserPlus, Paperclip,
  Upload, ChevronsUpDown, Check, CircleAlert, UserCog, Power,
} from "lucide-react";

/* ============================================================================
   GLOBAL STYLE — fonts + the EKG signature animation. Plain CSS so it works
   regardless of Tailwind's JIT (this preview only has the pre-built default
   utility classes available, no arbitrary-value compiler).
   ========================================================================== */
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
      .font-display { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif; }
      .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
      .font-data { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace; font-variant-numeric: tabular-nums; }
      * { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
      .ekg-scroll { animation: ekgScroll 2.6s linear infinite; }
      @keyframes ekgScroll { from { transform: translateX(0); } to { transform: translateX(-300px); } }
      @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      .animate-in { animation: fadeSlideIn 0.25s ease-out both; }
      @keyframes toastIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
      .toast-in { animation: toastIn 0.22s ease-out both; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      @keyframes typingDot { 0%, 60%, 100% { opacity: 0.25; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-2px); } }
      .typing-dot { animation: typingDot 1.1s ease-in-out infinite; }
    `}</style>
  );
}

const EKG_PATH =
  "M0,32 L24,32 L34,26 L44,34 L54,32 L74,32 L86,32 L94,36 L100,6 L106,54 L114,32 L134,32 L150,32 L162,22 L178,22 L190,32 L300,32" +
  " L324,32 L334,26 L344,34 L354,32 L374,32 L386,32 L394,36 L400,6 L406,54 L414,32 L434,32 L450,32 L462,22 L478,22 L490,32 L600,32";

function EKGTrace({ containerClass = "h-9 w-28 sm:w-40 md:w-48", stroke = "#2dd4bf", strokeWidth = 2.5 }) {
  return (
    <div className={`relative overflow-hidden ${containerClass}`}>
      <svg
        width="600" height="60" viewBox="0 0 600 60"
        className="absolute inset-y-0 left-0 ekg-scroll"
        style={{ filter: `drop-shadow(0 0 4px ${stroke}99)` }}
      >
        <path d={EKG_PATH} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function PulseChip({ compact = false }) {
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
      <EKGTrace containerClass={compact ? "h-5 w-16" : "h-6 w-20 sm:w-28"} stroke="#2dd4bf" strokeWidth={3} />
      {!compact && <span className="font-data text-xs font-semibold text-teal-300">{bpm} bpm</span>}
    </div>
  );
}

/* ============================================================================
   TOAST SYSTEM
   ========================================================================== */
const ToastContext = createContext(null);
function useToast() { return useContext(ToastContext); }

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = (message, variant = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  };
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" style={{ width: "calc(100% - 2rem)" }}>
        {toasts.map((t) => {
          const styles = {
            success: { icon: CheckCircle2, cls: "bg-slate-900 text-white", iconCls: "text-teal-400" },
            error: { icon: XCircle, cls: "bg-slate-900 text-white", iconCls: "text-red-400" },
            info: { icon: AlertCircle, cls: "bg-slate-900 text-white", iconCls: "text-blue-400" },
          }[t.variant];
          const Icon = styles.icon;
          return (
            <div key={t.id} className={`toast-in flex items-start gap-2.5 rounded-xl ${styles.cls} px-4 py-3 shadow-xl`}>
              <Icon className={`h-4.5 w-4.5 mt-0.5 shrink-0 ${styles.iconCls}`} />
              <p className="text-sm font-medium leading-snug">{t.message}</p>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/* ============================================================================
   MOCK DATA
   ========================================================================== */
const DEPARTMENTS = ["Cardiology", "General Medicine", "Pediatrics", "Orthopedics", "Emergency", "ICU"];

const DOCTORS = [
  { id: "D-000001", name: "Dr. Ngozi Eze", dept: "Cardiology", spec: "Interventional Cardiology", exp: 12, fee: 18000, patients: 184, rating: 4.9 },
  { id: "D-000002", name: "Dr. Chukwuemeka Nwosu", dept: "General Medicine", spec: "Internal Medicine", exp: 8, fee: 12000, patients: 231, rating: 4.7 },
  { id: "D-000003", name: "Dr. Adaeze Okonkwo", dept: "Pediatrics", spec: "Pediatric Care", exp: 6, fee: 13500, patients: 156, rating: 4.9 },
  { id: "D-000004", name: "Dr. Ikechukwu Obi", dept: "Orthopedics", spec: "Sports Medicine", exp: 15, fee: 22000, patients: 142, rating: 4.8 },
  { id: "D-000005", name: "Dr. Chidinma Anyanwu", dept: "Emergency", spec: "Emergency Medicine", exp: 10, fee: 16000, patients: 310, rating: 4.6 },
];

const STAFF_USERS = [
  { id: 1, name: "Amara Okafor", email: "admin@omnicare.dev", role: "admin", phone: "+234 803 214 7765", joined: "2025-01-14", active: true },
  { id: 2, name: "Dr. Ngozi Eze", email: "doctor@omnicare.dev", role: "doctor", phone: "+234 806 552 3391", joined: "2025-02-03", active: true },
  { id: 3, name: "Dr. Chukwuemeka Nwosu", email: "c.nwosu@omnicare.dev", role: "doctor", phone: "+234 802 771 4408", joined: "2025-03-11", active: true },
  { id: 4, name: "Amaka Nwachukwu", email: "nurse@omnicare.dev", role: "nurse", phone: "+234 807 345 1123", joined: "2025-02-20", active: true },
  { id: 5, name: "Ijeoma Madu", email: "i.madu@omnicare.dev", role: "nurse", phone: "+234 809 662 5587", joined: "2025-04-08", active: true },
  { id: 6, name: "Kelechi Ibe", email: "pharmacist@omnicare.dev", role: "pharmacist", phone: "+234 812 490 3312", joined: "2025-02-27", active: true },
  { id: 7, name: "Chukwudi Okoye", email: "patient@omnicare.dev", role: "patient", phone: "+234 803 214 9876", joined: "2025-05-19", active: true },
  { id: 8, name: "Obiageli Okafor", email: "o.okafor@omnicare.dev", role: "nurse", phone: "+234 810 227 6634", joined: "2025-06-02", active: false },
];

const PATIENTS = [
  { id: "P-000101", name: "Chukwudi Okoye", age: 36, gender: "Male", blood: "O+", status: "Outpatient", ward: "—", phone: "+234 803 214 9876", doctor: "Dr. Ngozi Eze", lastVisit: "2026-06-18" },
  { id: "P-000102", name: "Nkechi Ibekwe", age: 41, gender: "Female", blood: "A+", status: "Outpatient", ward: "—", phone: "+234 805 337 2210", doctor: "Dr. Chukwuemeka Nwosu", lastVisit: "2026-06-20" },
  { id: "P-000103", name: "Emeka Nwankwo", age: 54, gender: "Male", blood: "B-", status: "Admitted", ward: "General B-204", phone: "+234 807 119 4432", doctor: "Dr. Chukwuemeka Nwosu", lastVisit: "2026-06-30" },
  { id: "P-000104", name: "Adaobi Chukwu", age: 25, gender: "Female", blood: "AB+", status: "Outpatient", ward: "—", phone: "+234 802 173 6650", doctor: "Dr. Adaeze Okonkwo", lastVisit: "2026-06-15" },
  { id: "P-000105", name: "Uchenna Onyema", age: 68, gender: "Female", blood: "O-", status: "Admitted", ward: "ICU-3", phone: "+234 806 155 8823", doctor: "Dr. Ngozi Eze", lastVisit: "2026-07-01" },
  { id: "P-000106", name: "Nnamdi Okorie", age: 47, gender: "Male", blood: "A-", status: "Outpatient", ward: "—", phone: "+234 809 198 4471", doctor: "Dr. Ikechukwu Obi", lastVisit: "2026-06-22" },
  { id: "P-000107", name: "Chinwe Anozie", age: 32, gender: "Female", blood: "B+", status: "Outpatient", ward: "—", phone: "+234 803 161 7729", doctor: "Dr. Adaeze Okonkwo", lastVisit: "2026-06-27" },
  { id: "P-000108", name: "Obinna Ejiofor", age: 59, gender: "Male", blood: "O+", status: "Discharged", ward: "—", phone: "+234 807 134 9012", doctor: "Dr. Ikechukwu Obi", lastVisit: "2026-06-10" },
  { id: "P-000109", name: "Chiamaka Nnamani", age: 29, gender: "Female", blood: "A+", status: "Outpatient", ward: "—", phone: "+234 805 177 3345", doctor: "Dr. Ngozi Eze", lastVisit: "2026-06-24" },
  { id: "P-000110", name: "Kelechukwu Iwuchukwu", age: 44, gender: "Male", blood: "AB-", status: "Outpatient", ward: "—", phone: "+234 802 122 6689", doctor: "Dr. Chukwuemeka Nwosu", lastVisit: "2026-06-19" },
  { id: "P-000111", name: "Adanna Nwafor", age: 51, gender: "Female", blood: "B+", status: "Discharged", ward: "—", phone: "+234 809 189 4456", doctor: "Dr. Chidinma Anyanwu", lastVisit: "2026-06-05" },
  { id: "P-000112", name: "Chibuike Uzoma", age: 38, gender: "Male", blood: "O+", status: "Outpatient", ward: "—", phone: "+234 806 146 7723", doctor: "Dr. Ngozi Eze", lastVisit: "2026-06-29" },
];

const STATUS_STYLES = {
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Confirmed: "bg-teal-50 text-teal-700 border-teal-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  Completed: "bg-green-50 text-green-700 border-green-200",
  Cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  "No Show": "bg-red-50 text-red-700 border-red-200",
};
const APPT_STEPS = ["Scheduled", "Confirmed", "In Progress", "Completed"];

const APPOINTMENTS = [
  { id: "A-000201", patient: "Chukwudi Okoye", doctor: "Dr. Ngozi Eze", dept: "Cardiology", date: "2026-07-03", time: "09:30", status: "Confirmed", reason: "Follow-up: blood pressure check" },
  { id: "A-000202", patient: "Nkechi Ibekwe", doctor: "Dr. Chukwuemeka Nwosu", dept: "General Medicine", date: "2026-07-03", time: "11:00", status: "Scheduled", reason: "Annual physical" },
  { id: "A-000203", patient: "Adaobi Chukwu", doctor: "Dr. Adaeze Okonkwo", dept: "Pediatrics", date: "2026-07-04", time: "10:15", status: "Scheduled", reason: "Vaccination" },
  { id: "A-000204", patient: "Nnamdi Okorie", doctor: "Dr. Ikechukwu Obi", dept: "Orthopedics", date: "2026-06-27", time: "14:00", status: "Completed", reason: "Knee pain evaluation" },
  { id: "A-000205", patient: "Uchenna Onyema", doctor: "Dr. Ngozi Eze", dept: "Cardiology", date: "2026-07-02", time: "08:00", status: "In Progress", reason: "Cardiac consult — admitted patient" },
  { id: "A-000206", patient: "Emeka Nwankwo", doctor: "Dr. Chukwuemeka Nwosu", dept: "General Medicine", date: "2026-07-01", time: "16:30", status: "Completed", reason: "Pneumonia admission workup" },
  { id: "A-000207", patient: "Nkechi Ibekwe", doctor: "Dr. Ngozi Eze", dept: "Cardiology", date: "2026-06-22", time: "09:00", status: "Cancelled", reason: "Routine checkup" },
  { id: "A-000208", patient: "Chinwe Anozie", doctor: "Dr. Adaeze Okonkwo", dept: "Pediatrics", date: "2026-07-05", time: "13:45", status: "Scheduled", reason: "Skin rash consult" },
  { id: "A-000209", patient: "Kelechukwu Iwuchukwu", doctor: "Dr. Chukwuemeka Nwosu", dept: "General Medicine", date: "2026-07-06", time: "15:00", status: "Confirmed", reason: "Diabetes management" },
  { id: "A-000210", patient: "Chiamaka Nnamani", doctor: "Dr. Ngozi Eze", dept: "Cardiology", date: "2026-06-18", time: "10:00", status: "No Show", reason: "Follow-up" },
];

const MEDICINES = [
  { sku: "MED-000001", name: "Amoxicillin 500mg", category: "Antibiotic", stock: 320, reorder: 50, price: 850, expiry: "2027-03-01" },
  { sku: "MED-000002", name: "Lisinopril 10mg", category: "Cardiovascular", stock: 210, reorder: 40, price: 600, expiry: "2027-05-12" },
  { sku: "MED-000003", name: "Ibuprofen 200mg", category: "Analgesic", stock: 15, reorder: 100, price: 350, expiry: "2026-11-08" },
  { sku: "MED-000004", name: "Metformin 500mg", category: "Endocrine", stock: 180, reorder: 60, price: 550, expiry: "2027-01-20" },
  { sku: "MED-000005", name: "Salbutamol Inhaler", category: "Respiratory", stock: 8, reorder: 25, price: 2200, expiry: "2026-09-30" },
  { sku: "MED-000006", name: "Omeprazole 20mg", category: "Gastrointestinal", stock: 150, reorder: 40, price: 750, expiry: "2027-04-15" },
  { sku: "MED-000007", name: "Atorvastatin 20mg", category: "Cardiovascular", stock: 95, reorder: 30, price: 1100, expiry: "2027-02-18" },
  { sku: "MED-000008", name: "Paracetamol 500mg", category: "Analgesic", stock: 500, reorder: 100, price: 150, expiry: "2027-08-01" },
  { sku: "MED-000009", name: "Insulin Glargine", category: "Endocrine", stock: 12, reorder: 20, price: 8500, expiry: "2026-10-05" },
  { sku: "MED-000010", name: "Vitamin D3 1000IU", category: "Supplement", stock: 240, reorder: 50, price: 650, expiry: "2027-06-22" },
];

const PRESCRIPTIONS_QUEUE = [
  { id: "RX-000301", patient: "Chukwudi Okoye", doctor: "Dr. Ngozi Eze", drug: "Lisinopril 10mg", qty: 30, status: "Pending", date: "2026-07-01" },
  { id: "RX-000302", patient: "Emeka Nwankwo", doctor: "Dr. Chukwuemeka Nwosu", drug: "Amoxicillin 500mg", qty: 21, status: "Pending", date: "2026-07-01" },
  { id: "RX-000303", patient: "Adaobi Chukwu", doctor: "Dr. Adaeze Okonkwo", drug: "Paracetamol 500mg", qty: 20, status: "Dispensed", date: "2026-06-29" },
  { id: "RX-000304", patient: "Nnamdi Okorie", doctor: "Dr. Ikechukwu Obi", drug: "Ibuprofen 200mg", qty: 24, status: "Dispensed", date: "2026-06-27" },
];

const INVOICES = [
  { id: "INV-000401", patient: "Chukwudi Okoye", date: "2026-06-27", amount: 95000.0, status: "Paid", method: "Card" },
  { id: "INV-000402", patient: "Emeka Nwankwo", date: "2026-07-01", amount: 420000.0, status: "Pending", method: "Insurance" },
  { id: "INV-000403", patient: "Nkechi Ibekwe", date: "2026-06-20", amount: 48000.0, status: "Paid", method: "Cash" },
  { id: "INV-000404", patient: "Uchenna Onyema", date: "2026-07-02", amount: 780000.0, status: "Overdue", method: "Insurance" },
  { id: "INV-000405", patient: "Chinwe Anozie", date: "2026-06-25", amount: 32000.0, status: "Paid", method: "Card" },
  { id: "INV-000406", patient: "Kelechukwu Iwuchukwu", date: "2026-06-30", amount: 110000.0, status: "Pending", method: "Bank Transfer" },
];

const CLAIMS = [
  { id: "CLM-000501", patient: "Emeka Nwankwo", provider: "Hygeia HMO", amount: 420000.0, status: "Under Review" },
  { id: "CLM-000502", patient: "Uchenna Onyema", provider: "Avon Healthcare", amount: 780000.0, status: "Approved" },
];

const LAB_REQUESTS = [
  { id: "LAB-000601", patient: "Emeka Nwankwo", test: "Complete Blood Count", priority: "Urgent", status: "Completed", doctor: "Dr. Chukwuemeka Nwosu", critical: true },
  { id: "LAB-000602", patient: "Chukwudi Okoye", test: "Lipid Panel", priority: "Routine", status: "Requested", doctor: "Dr. Ngozi Eze", critical: false },
  { id: "LAB-000603", patient: "Uchenna Onyema", test: "Electrolyte Panel", priority: "STAT", status: "In Progress", doctor: "Dr. Ngozi Eze", critical: false },
  { id: "LAB-000604", patient: "Adaobi Chukwu", test: "Urinalysis", priority: "Routine", status: "Completed", doctor: "Dr. Adaeze Okonkwo", critical: false },
  { id: "LAB-000605", patient: "Nnamdi Okorie", test: "X-Ray — Left Knee", priority: "Routine", status: "Sample Collected", doctor: "Dr. Ikechukwu Obi", critical: false },
];

const LAB_PARAMS_SAMPLE = [
  { name: "White Blood Cell Count", value: "14.8", unit: "x10⁹/L", range: "4.0 – 11.0", critical: true },
  { name: "Hemoglobin", value: "13.1", unit: "g/dL", range: "12.0 – 17.0", critical: false },
  { name: "Platelets", value: "410", unit: "x10⁹/L", range: "150 – 400", critical: true },
];

const EMR_RECORDS = {
  "P-000101": {
    allergies: [{ allergen: "Penicillin", severity: "Severe", reaction: "Hives, swelling" }],
    diagnoses: [
      { date: "2026-06-18", type: "Diagnosis", text: "Essential hypertension (I10)", doctor: "Dr. Ngozi Eze" },
      { date: "2026-05-02", type: "Progress Note", text: "BP trending down since last visit, patient adherent to medication.", doctor: "Dr. Ngozi Eze" },
    ],
    treatment: "Lifestyle changes + Lisinopril 10mg daily. Re-check in 4 weeks.",
    documents: [{ name: "ECG_2026-06-18.pdf", size: "412 KB" }, { name: "Blood_Panel_2026-05-02.pdf", size: "218 KB" }],
  },
  "P-000103": {
    allergies: [],
    diagnoses: [{ date: "2026-06-30", type: "Progress Note", text: "Community-acquired pneumonia — right lower lobe infiltrate on CXR.", doctor: "Dr. Chukwuemeka Nwosu" }],
    treatment: "IV antibiotics (Amoxicillin), monitor O2 saturation, reassess in 48h.",
    documents: [{ name: "Chest_XRay_2026-06-30.pdf", size: "1.1 MB" }],
  },
};

const ACTIVITY_FEED = [
  { icon: CalendarClock, text: "Appointment confirmed for Chukwudi Okoye with Dr. Ngozi Eze", time: "8 min ago", color: "text-teal-600 bg-teal-50" },
  { icon: FlaskConical, text: "Critical lab result flagged — Emeka Nwankwo, CBC panel", time: "24 min ago", color: "text-red-600 bg-red-50" },
  { icon: UserPlus, text: "New patient registered — Chinwe Anozie", time: "1 hr ago", color: "text-blue-600 bg-blue-50" },
  { icon: Pill, text: "Prescription dispensed — RX-000304 to Nnamdi Okorie", time: "2 hr ago", color: "text-purple-600 bg-purple-50" },
  { icon: Receipt, text: "Invoice INV-000401 marked as Paid", time: "3 hr ago", color: "text-green-600 bg-green-50" },
  { icon: AlertTriangle, text: "Low stock alert — Salbutamol Inhaler (8 units left)", time: "5 hr ago", color: "text-amber-600 bg-amber-50" },
];

const REVENUE_TREND = [
  { month: "Feb", revenue: 28000000 }, { month: "Mar", revenue: 31000000 }, { month: "Apr", revenue: 29500000 },
  { month: "May", revenue: 34000000 }, { month: "Jun", revenue: 37000000 }, { month: "Jul", revenue: 21000000 },
];
const APPTS_BY_DEPT = DEPARTMENTS.slice(0, 5).map((d, i) => ({ dept: d, count: [42, 38, 27, 19, 33][i] }));
const ADMISSION_MIX = [
  { name: "Outpatient", value: 68, color: "#0d9488" }, { name: "Admitted", value: 21, color: "#f59e0b" }, { name: "Discharged", value: 11, color: "#94a3b8" },
];
const WEEKLY_LOAD = [
  { day: "Mon", appts: 14 }, { day: "Tue", appts: 18 }, { day: "Wed", appts: 11 }, { day: "Thu", appts: 21 }, { day: "Fri", appts: 16 }, { day: "Sat", appts: 6 }, { day: "Sun", appts: 3 },
];
const STOCK_LEVELS = MEDICINES.slice(0, 6).map((m) => ({ name: m.name.split(" ")[0], stock: m.stock, reorder: m.reorder }));

const ROLE_META = {
  admin: { label: "Administrator", name: "Amara Okafor", initials: "AO", email: "admin@omnicare.dev" },
  doctor: { label: "Doctor", name: "Dr. Ngozi Eze", initials: "NE", email: "doctor@omnicare.dev" },
  nurse: { label: "Nurse", name: "Amaka Nwachukwu", initials: "AN", email: "nurse@omnicare.dev" },
  pharmacist: { label: "Pharmacist", name: "Kelechi Ibe", initials: "KI", email: "pharmacist@omnicare.dev" },
  patient: { label: "Patient", name: "Chukwudi Okoye", initials: "CO", email: "patient@omnicare.dev" },
};

const NAV_BY_ROLE = {
  admin: [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "patients", label: "Patients", icon: Users },
    { key: "staff", label: "Staff & Users", icon: UserCog },
    { key: "scheduling", label: "Doctor Scheduling", icon: Stethoscope },
    { key: "appointments", label: "Appointments", icon: CalendarDays },
    { key: "emr", label: "Medical Records", icon: FileText },
    { key: "billing", label: "Billing & Insurance", icon: Receipt },
    { key: "pharmacy", label: "Pharmacy", icon: Pill },
    { key: "labs", label: "Lab Results", icon: FlaskConical },
    { key: "aria", label: "ARIA Assistant", icon: Sparkles },
  ],
  doctor: [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "scheduling", label: "My Schedule", icon: Stethoscope },
    { key: "appointments", label: "Appointments", icon: CalendarDays },
    { key: "patients", label: "Patients", icon: Users },
    { key: "emr", label: "Medical Records", icon: FileText },
    { key: "labs", label: "Lab Results", icon: FlaskConical },
    { key: "aria", label: "ARIA Assistant", icon: Sparkles },
  ],
  nurse: [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "patients", label: "Patients", icon: Users },
    { key: "appointments", label: "Appointments", icon: CalendarDays },
    { key: "emr", label: "Medical Records", icon: FileText },
    { key: "labs", label: "Lab Results", icon: FlaskConical },
    { key: "aria", label: "ARIA Assistant", icon: Sparkles },
  ],
  pharmacist: [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "pharmacy", label: "Pharmacy & Prescriptions", icon: Pill },
    { key: "aria", label: "ARIA Assistant", icon: Sparkles },
  ],
  patient: [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "appointments", label: "My Appointments", icon: CalendarDays },
    { key: "emr", label: "My Records", icon: FileText },
    { key: "billing", label: "Billing", icon: Receipt },
    { key: "aria", label: "ARIA Assistant", icon: Sparkles },
  ],
};

/* ============================================================================
   SMALL PRIMITIVES
   ========================================================================== */
function Badge({ children, className = "" }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}>{children}</span>;
}

function StatCard({ icon: Icon, label, value, delta, deltaUp, tint }) {
  return (
    <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="font-data mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {delta && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-semibold ${deltaUp ? "text-green-600" : "text-red-500"}`}>
          {deltaUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {delta}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon = ClipboardList, title = "Nothing here yet", subtitle = "New records will show up here once added.", action }) {
  return (
    <div className="animate-in flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <p className="mt-4 font-display text-base font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{subtitle}</p>
      {action}
    </div>
  );
}

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-7 w-24" />
      <Skeleton className="mt-3 h-3 w-16" />
    </div>
  );
}

function SectionHeading({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function PrimaryButton({ children, onClick, icon: Icon, className = "", type = "button", iconSpin = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 active:bg-teal-800 ${className}`}
    >
      {Icon && <Icon className={`h-4 w-4 ${iconSpin ? "animate-spin" : ""}`} />}
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, icon: Icon, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 ${className}`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

function Modal({ open, onClose, title, children, footer, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className={`animate-in w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl flex flex-col`}
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-display text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}
const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

function StatusStepper({ current, compact }) {
  if (current === "Cancelled" || current === "No Show") {
    return <Badge className={STATUS_STYLES[current]}>{current}</Badge>;
  }
  const idx = APPT_STEPS.indexOf(current);
  return (
    <div className="flex items-center">
      {APPT_STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
                i < idx ? "border-teal-600 bg-teal-600 text-white" : i === idx ? "border-teal-600 bg-white text-teal-600" : "border-slate-200 bg-white text-slate-300"
              }`}
            >
              {i < idx ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            {!compact && <span className={`mt-1 text-xs font-medium ${i <= idx ? "text-slate-600" : "text-slate-300"}`}>{step}</span>}
          </div>
          {i < APPT_STEPS.length - 1 && <div className={`h-0.5 w-6 sm:w-10 ${i < idx ? "bg-teal-600" : "bg-slate-200"}`} />}
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   DATA TABLE — generic search / filter / sort / paginate
   ========================================================================== */
function DataTable({ columns, data, searchKeys = [], filterOptions, pageSize = 6, emptyTitle, emptySubtitle, rowKey = "id" }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = useMemo(() => {
    let rows = [...data];
    if (filterOptions && activeFilter !== "All") {
      rows = rows.filter((r) => filterOptions.getValue(r) === activeFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q)));
    }
    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (av === bv) return 0;
        const cmp = av > bv ? 1 : -1;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, query, sortKey, sortDir, activeFilter]);

  useEffect(() => setPage(1), [query, activeFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
        </div>
        {filterOptions && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
            {["All", ...filterOptions.options].map((opt) => (
              <button
                key={opt}
                onClick={() => setActiveFilter(opt)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeFilter === opt ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      {pageRows.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={Search} title={emptyTitle || "No matching records"} subtitle={emptySubtitle || "Try a different search term or filter."} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {columns.map((col) => (
                  <th key={col.key} className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {col.sortable ? (
                      <button onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 hover:text-slate-800">
                        {col.label} <ArrowUpDown className="h-3 w-3" />
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row[rowKey]} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  {columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-4 py-3.5 text-slate-700">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{pageRows.length}</span> of{" "}
          <span className="font-semibold text-slate-700">{filtered.length}</span> records
        </p>
        <div className="flex items-center gap-1.5">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-30 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs font-semibold text-slate-600">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-30 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   VITALS MONITOR — live-feeling widget
   ========================================================================== */
function useJitter(base, spread, min, max, intervalMs = 2500) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const id = setInterval(() => {
      setVal((v) => Math.max(min, Math.min(max, Math.round((v + (Math.random() - 0.5) * spread) * 10) / 10)));
    }, intervalMs);
    return () => clearInterval(id);
  }, [spread, min, max, intervalMs]);
  return val;
}

function VitalsMonitor() {
  const hr = useJitter(78, 6, 60, 100);
  const spo2 = useJitter(98, 1.4, 92, 100);
  const sys = useJitter(120, 4, 100, 140);
  const dia = useJitter(80, 3, 65, 95);
  const temp = useJitter(36.8, 0.2, 36.0, 38.5, 3200);

  const tiles = [
    { icon: Heart, label: "Heart Rate", value: hr, unit: "bpm", color: "text-rose-500 bg-rose-50" },
    { icon: Droplets, label: "SpO₂", value: spo2, unit: "%", color: "text-blue-500 bg-blue-50" },
    { icon: Activity, label: "Blood Pressure", value: `${Math.round(sys)}/${Math.round(dia)}`, unit: "mmHg", color: "text-purple-500 bg-purple-50" },
    { icon: Thermometer, label: "Temperature", value: temp.toFixed(1), unit: "°C", color: "text-amber-500 bg-amber-50" },
  ];

  return (
    <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <h3 className="font-display text-sm font-bold text-slate-900">Live Vitals Monitor</h3>
        </div>
        <span className="text-xs font-semibold text-slate-400">Uchenna Onyema · ICU-3</span>
      </div>
      <div className="mb-4 rounded-xl bg-slate-950 p-3">
        <EKGTrace containerClass="h-14 w-full" stroke="#4ade80" strokeWidth={2.5} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-slate-50 p-3">
            <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${t.color}`}>
              <t.icon className="h-3.5 w-3.5" />
            </div>
            <p className="font-data text-lg font-bold text-slate-900">{t.value}<span className="ml-1 text-xs font-medium text-slate-400">{t.unit}</span></p>
            <p className="text-xs font-medium text-slate-500">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   ARIA CHAT WIDGET
   ========================================================================== */
const ARIA_SUGGESTIONS = {
  patient: ["I've had a headache since this morning", "What does my last lab result mean?", "Help me prepare questions for my next visit"],
  doctor: ["Summarize Emeka Nwankwo's chart", "Differential for productive cough + fever", "Draft a discharge note"],
  nurse: ["Summarize Uchenna Onyema's latest vitals trend", "What does an SpO2 of 91% indicate?", "Escalation checklist for tachycardia"],
  pharmacist: ["Interaction check: Lisinopril + Ibuprofen", "Max daily dose for Metformin", "Storage requirements for Insulin Glargine"],
  admin: ["Summarize this week's occupancy", "Which department has the most no-shows?", "Draft a staffing shortage notice"],
};

function ariaReplyFor(role, text) {
  const t = text.toLowerCase();
  if (/chest pain|can'?t breathe|severe bleeding|unconscious|suicid/.test(t)) {
    return {
      urgent: true,
      body:
        "That sounds potentially serious. Please seek in-person care right away — call your local emergency number or go to the nearest emergency department now. If you're in crisis, the 988 Suicide & Crisis Lifeline (call or text 988 in the US) is available 24/7.",
    };
  }
  if (role === "patient" && /headache/.test(t)) {
    return { urgent: false, body: "A headache since this morning is usually not an emergency on its own. Watch for red flags — sudden 'worst headache of your life', fever with stiff neck, vision changes, or confusion. If those appear, seek care immediately. Otherwise, rest, hydrate, and consider a routine visit if it persists past 48 hours. Want me to help you schedule a follow-up?" };
  }
  if (role === "patient" && /lab result/.test(t)) {
    return { urgent: false, body: "Looking at your most recent panel — your values are within the reference ranges your doctor set, with nothing flagged. I've included plain-language notes next to each value on your Lab Results page. Would you like me to walk through any specific number?" };
  }
  if (role === "doctor" && /summarize|summary/.test(t)) {
    return { urgent: false, body: "Emeka Nwankwo (P-000103), 54M: admitted 06/30 for community-acquired pneumonia, right lower lobe infiltrate on CXR. On IV amoxicillin. Latest CBC shows elevated WBC (14.8, flagged) consistent with active infection; O2 sat trending 91-94%. No known drug allergies on file. Recommend reassessing antibiotic response at 48h." };
  }
  if (role === "doctor" && /differential|cough/.test(t)) {
    return { urgent: false, body: "For productive cough + fever, reasonable differentials include community-acquired pneumonia, acute bronchitis, and (if risk factors present) COVID-19 or influenza. I'd suggest CXR if hypoxic or exam findings are focal, plus CBC and consider sputum culture if not improving on empiric therapy." };
  }
  if (role === "nurse" && /vitals|trend/.test(t)) {
    return { urgent: false, body: "Uchenna Onyema's last 3 readings: HR 88→92→95 bpm (rising), SpO2 96→94→94% (stable-low), BP 138/88 (stable). The upward HR trend combined with low-normal SpO2 is worth flagging to the attending if it continues — nothing acutely critical yet." };
  }
  if (role === "pharmacist" && /interaction/.test(t)) {
    return { urgent: false, body: "Lisinopril + Ibuprofen: NSAIDs can reduce the antihypertensive effect of ACE inhibitors like Lisinopril and, with prolonged use, increase renal impairment risk — especially in patients with reduced kidney function or on diuretics. Not an absolute contraindication, but worth a short-course caution note and a BP/renal function check if used beyond a few days." };
  }
  if (role === "admin" && /occupancy|no-?show/.test(t)) {
    return { urgent: false, body: "This week's average bed occupancy is 79% (ICU running hottest at 91%). No-shows are concentrated in the General Medicine department (11% of scheduled slots) — mostly Monday morning appointments. A reminder SMS 24h prior has cut no-shows by ~30% in similar systems, if you'd like a recommendation written up." };
  }
  return {
    urgent: false,
    body: "Got it — I can help with that. This is a UI preview of ARIA running on simulated responses; wired to the real backend, this same message would be sent to our AI engine along with this conversation's rolling history and, for clinical roles, any patient chart context you attach.",
  };
}

function AriaWidget({ role }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "model", text: `Hi, I'm ARIA — OMNICARE's AI assistant. I'm here to help with ${role === "patient" ? "your health questions" : "clinical and administrative reference support"}. How can I help?` },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing, open]);

  const send = (text = undefined) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setMessages((m) => [...m, { role: "user", text: value }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const reply = ariaReplyFor(role, value);
      setMessages((m) => [...m, { role: "model", text: reply.body, urgent: reply.urgent }]);
      setTyping(false);
    }, 1000 + Math.random() * 600);
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-600/30 transition-transform hover:scale-105 active:scale-95"
        aria-label="Open ARIA assistant"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>

      {open && (
        <div
          className="animate-in fixed inset-x-3 bottom-24 z-40 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-auto sm:bottom-24 sm:right-5 sm:w-96"
          style={{ height: "70vh", maxHeight: 560 }}
        >
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500/20">
                <Sparkles className="h-4.5 w-4.5 text-teal-300" />
              </div>
              <div>
                <p className="font-display text-sm font-bold text-white">ARIA</p>
                <p className="text-xs text-slate-400">OMNICARE Intelligence · Healthcare Assistant</p>
              </div>
            </div>
            <PulseChip compact />
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  style={{ maxWidth: "85%" }}
                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-teal-600 text-white"
                      : m.urgent
                      ? "rounded-bl-sm border border-red-200 bg-red-50 text-red-800"
                      : "rounded-bl-sm border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {m.urgent && (
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-red-600">
                      <CircleAlert className="h-3.5 w-3.5" /> Urgent — flagged for care team
                    </div>
                  )}
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: "0s" }} />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: "0.15s" }} />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            )}
          </div>

          {messages.length < 2 && (
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-3 py-2.5">
              {(ARIA_SUGGESTIONS[role] || []).map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
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
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />
            <button onClick={() => send()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white hover:bg-teal-700">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================================
   LOGIN VIEW
   ========================================================================== */
function LoginView({ onLogin }) {
  const [selected, setSelected] = useState("patient");
  const [loading, setLoading] = useState(false);
  const roleCards = [
    { key: "admin", icon: ShieldCheck, blurb: "Full system oversight" },
    { key: "doctor", icon: Stethoscope, blurb: "Patients & clinical care" },
    { key: "nurse", icon: Heart, blurb: "Ward care & vitals" },
    { key: "pharmacist", icon: Pill, blurb: "Inventory & dispensing" },
    { key: "patient", icon: UserRound, blurb: "My health, in one place" },
  ];

  const handleLogin = (role) => {
    setSelected(role);
    setLoading(true);
    setTimeout(() => onLogin(role), 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-body lg:flex">
      <GlobalStyles />
      {/* Hero */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-8 py-10 lg:w-1/2 lg:px-16 lg:py-16">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20">
            <Activity className="h-5 w-5 text-teal-400" />
          </div>
          <span className="font-display text-lg font-bold text-white">OMNICARE</span>
        </div>

        <div className="relative mt-16 lg:mt-0">
          <PulseChip />
          <h1 className="font-display mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl">
            Hospital operations,<br />on one clear pulse.
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            Patients, scheduling, records, billing, pharmacy, and labs — unified for every role,
            with ARIA watching for what needs attention first.
          </p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-4">
            {[["12,480", "Patients cared for"], ["98.7%", "Uptime this quarter"], ["4.2s", "Avg. ARIA response"]].map(([v, l]) => (
              <div key={l}>
                <p className="font-data text-xl font-bold text-white">{v}</p>
                <p className="mt-0.5 text-xs text-slate-500">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative hidden text-xs text-slate-600 lg:block">© 2026 OMNICARE Health Systems — Enugu, Nigeria</p>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12 lg:py-16">
        <div className="w-full max-w-md">
          <h2 className="font-display text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">This is a live design preview — pick a role to explore its dashboard instantly.</p>

          <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {roleCards.map((r) => (
              <button
                key={r.key}
                disabled={loading}
                onClick={() => handleLogin(r.key)}
                className={`flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected === r.key ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected === r.key ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <r.icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{ROLE_META[r.key].label}</p>
                  <p className="truncate text-xs text-slate-500">{r.blurb}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Field label="Email">
              <input readOnly value={ROLE_META[selected].email} className={inputCls + " bg-slate-50"} />
            </Field>
            <Field label="Password">
              <input readOnly type="password" value="DemoPass123!" className={inputCls + " bg-slate-50"} />
            </Field>
            <PrimaryButton type="button" className="w-full" icon={loading ? Loader2 : ArrowRight} iconSpin={loading} onClick={() => handleLogin(selected)}>
              {loading ? "Signing in..." : `Continue as ${ROLE_META[selected].label}`}
            </PrimaryButton>
            <p className="text-center text-xs text-slate-400">JWT + role-based access control secures every request in the real backend.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   SIDEBAR + TOPBAR
   ========================================================================== */
function Sidebar({ role, active, onNavigate, mobileOpen, setMobileOpen, onLogout }) {
  const items = NAV_BY_ROLE[role];
  const meta = ROLE_META[role];

  const content = (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20">
          <Activity className="h-5 w-5 text-teal-400" />
        </div>
        <span className="font-display text-lg font-bold text-white">OMNICARE</span>
        <button className="ml-auto text-slate-400 hover:text-white lg:hidden" onClick={() => setMobileOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-teal-600/15 text-teal-300" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <item.icon className={`h-4.5 w-4.5 ${isActive ? "text-teal-400" : "text-slate-500 group-hover:text-slate-300"}`} />
              {item.label}
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-400" />}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">{meta.initials}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{meta.name}</p>
            <p className="truncate text-xs text-slate-400">{meta.label}</p>
          </div>
          <button onClick={onLogout} className="text-slate-400 hover:text-red-400" aria-label="Log out">
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
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-72 animate-in">{content}</div>
        </div>
      )}
    </>
  );
}

function TopBar({ title, role, setMobileOpen }) {
  const meta = ROLE_META[role];
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
      <button className="text-slate-500 hover:text-slate-800 lg:hidden" onClick={() => setMobileOpen(true)}>
        <Menu className="h-5.5 w-5.5" />
      </button>
      <h2 className="font-display hidden text-base font-bold text-slate-900 sm:block">{title}</h2>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <PulseChip compact />
        <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 md:flex">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input placeholder="Search OMNICARE..." className="w-40 bg-transparent text-xs text-slate-600 outline-none placeholder:text-slate-400" />
        </div>
        <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">{meta.initials}</div>
      </div>
    </header>
  );
}

/* ============================================================================
   DASHBOARDS (role-specific)
   ========================================================================== */
function ChartCard({ title, subtitle, children, height = 260 }) {
  return (
    <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-display text-sm font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div style={{ width: "100%", height }} className="mt-3">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

function ActivityFeed({ items = ACTIVITY_FEED }) {
  return (
    <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-display mb-4 text-sm font-bold text-slate-900">Recent Activity</h3>
      <div className="space-y-4">
        {items.map((a, i) => (
          <div key={i} className="flex gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.color}`}>
              <a.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm leading-snug text-slate-700">{a.text}</p>
              <p className="mt-0.5 text-xs text-slate-400">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard({ loading }) {
  if (loading) return <DashboardSkeleton />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Patients" value="1,248" delta="+4.2% this month" deltaUp tint="bg-blue-50 text-blue-600" />
        <StatCard icon={Stethoscope} label="Active Doctors" value="52" delta="+2 this month" deltaUp tint="bg-teal-50 text-teal-600" />
        <StatCard icon={DollarSign} label="Revenue (MTD)" value="₦55,800,000" delta="+9.4%" deltaUp tint="bg-green-50 text-green-600" />
        <StatCard icon={BedDouble} label="Bed Occupancy" value="79%" delta="-3.1% vs last wk" tint="bg-amber-50 text-amber-600" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard title="Revenue Trend" subtitle="Last 6 months" height={260}>
          <AreaChart data={REVENUE_TREND}>
            <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} /><stop offset="100%" stopColor="#0d9488" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2.5} fill="url(#rev)" />
          </AreaChart>
        </ChartCard>
        <ChartCard title="Appointments by Dept." height={260}>
          <BarChart data={APPTS_BY_DEPT}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="dept" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Patient Status Mix" height={260}>
          <PieChart>
            <Pie data={ADMISSION_MIX} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
              {ADMISSION_MIX.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ChartCard>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2"><VitalsMonitor /></div>
        <ActivityFeed />
      </div>
    </div>
  );
}

function DoctorDashboard({ loading }) {
  if (loading) return <DashboardSkeleton />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="Today's Appointments" value="8" delta="2 remaining" tint="bg-teal-50 text-teal-600" />
        <StatCard icon={Users} label="My Patients" value="184" delta="+6 this month" deltaUp tint="bg-blue-50 text-blue-600" />
        <StatCard icon={FlaskConical} label="Pending Lab Reviews" value="3" tint="bg-amber-50 text-amber-600" />
        <StatCard icon={FileText} label="Notes to Complete" value="2" tint="bg-purple-50 text-purple-600" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard title="Weekly Patient Load" subtitle="Appointments per day" height={240}>
          <BarChart data={WEEKLY_LOAD}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="appts" fill="#0d9488" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
        <div className="lg:col-span-2"><VitalsMonitor /></div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display mb-4 text-sm font-bold text-slate-900">Today's Schedule</h3>
          <div className="space-y-3">
            {APPOINTMENTS.filter((a) => a.doctor === "Dr. Ngozi Eze").slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3">
                <div className="flex items-center gap-3">
                  <div className="font-data w-14 text-xs font-bold text-slate-500">{a.time}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{a.patient}</p>
                    <p className="text-xs text-slate-500">{a.reason}</p>
                  </div>
                </div>
                <Badge className={STATUS_STYLES[a.status]}>{a.status}</Badge>
              </div>
            ))}
          </div>
        </div>
        <ActivityFeed items={ACTIVITY_FEED.slice(0, 4)} />
      </div>
    </div>
  );
}

function NurseDashboard({ loading }) {
  if (loading) return <DashboardSkeleton />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={BedDouble} label="Assigned Patients" value="14" tint="bg-blue-50 text-blue-600" />
        <StatCard icon={AlertTriangle} label="Critical Alerts" value="1" tint="bg-red-50 text-red-600" />
        <StatCard icon={Pill} label="Meds Due (2hr)" value="6" tint="bg-purple-50 text-purple-600" />
        <StatCard icon={CheckCircle2} label="Tasks Completed" value="19/23" delta="83%" deltaUp tint="bg-green-50 text-green-600" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2"><VitalsMonitor /></div>
        <div className="animate-in rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
            <h3 className="font-display text-sm font-bold text-red-800">Needs Attention</h3>
          </div>
          <div className="space-y-2.5">
            <div className="rounded-xl bg-white p-3">
              <p className="text-sm font-semibold text-slate-800">Emeka Nwankwo — B-204</p>
              <p className="text-xs text-red-600">Elevated temp (38.9°C) + low SpO2 (91%)</p>
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="text-sm font-semibold text-slate-800">Uchenna Onyema — ICU-3</p>
              <p className="text-xs text-amber-600">HR trending up, monitor closely</p>
            </div>
          </div>
        </div>
      </div>
      <ActivityFeed />
    </div>
  );
}

function PharmacistDashboard({ loading }) {
  if (loading) return <DashboardSkeleton />;
  const lowStock = MEDICINES.filter((m) => m.stock <= m.reorder);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Pill} label="Total SKUs" value={MEDICINES.length} tint="bg-blue-50 text-blue-600" />
        <StatCard icon={AlertTriangle} label="Low Stock Alerts" value={lowStock.length} tint="bg-red-50 text-red-600" />
        <StatCard icon={ClipboardList} label="Pending Prescriptions" value={PRESCRIPTIONS_QUEUE.filter((p) => p.status === "Pending").length} tint="bg-amber-50 text-amber-600" />
        <StatCard icon={CheckCircle2} label="Dispensed Today" value="27" delta="+5 vs avg" deltaUp tint="bg-green-50 text-green-600" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard title="Stock Levels vs. Reorder Point" height={260}>
          <BarChart data={STOCK_LEVELS} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} width={90} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="stock" fill="#0d9488" radius={[0, 6, 6, 0]} />
            <Bar dataKey="reorder" fill="#fecaca" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartCard>
        <div className="lg:col-span-2 animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display mb-4 text-sm font-bold text-slate-900">Low Stock Alerts</h3>
          <div className="space-y-2.5">
            {lowStock.map((m) => (
              <div key={m.sku} className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 px-3.5 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.category} · Reorder at {m.reorder}</p>
                </div>
                <Badge className="border-red-200 bg-red-100 text-red-700">{m.stock} left</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ActivityFeed items={ACTIVITY_FEED.filter((a) => a.icon === Pill || a.icon === AlertTriangle)} />
    </div>
  );
}

function PatientDashboard({ loading }) {
  if (loading) return <DashboardSkeleton />;
  const upcoming = APPOINTMENTS.find((a) => a.patient === "Chukwudi Okoye" && a.status !== "Completed" && a.status !== "Cancelled");
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 animate-in rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-600 to-teal-700 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-100">Upcoming Appointment</p>
          <h3 className="font-display mt-2 text-xl font-bold">{upcoming?.reason}</h3>
          <p className="mt-1 text-teal-100">{upcoming?.doctor} · {upcoming?.dept}</p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {upcoming?.date}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {upcoming?.time}</span>
          </div>
          <div className="mt-4"><StatusStepper current={upcoming?.status} compact /></div>
        </div>
        <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display mb-3 text-sm font-bold text-slate-900">Outstanding Balance</h3>
          <p className="font-data text-3xl font-bold text-slate-900">₦0.00</p>
          <p className="mt-1 text-xs text-green-600 font-semibold">All invoices paid</p>
          <SecondaryButton className="mt-4 w-full" icon={Receipt}>View Billing History</SecondaryButton>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display mb-4 text-sm font-bold text-slate-900">My Recent Vitals</h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[{ d: "Mar", hr: 74 }, { d: "Apr", hr: 76 }, { d: "May", hr: 71 }, { d: "Jun", hr: 78 }, { d: "Jul", hr: 75 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="d" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 90]} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Line type="monotone" dataKey="hr" name="Resting HR" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display mb-3 text-sm font-bold text-slate-900">Known Allergies</h3>
          {EMR_RECORDS["P-000101"].allergies.map((a) => (
            <div key={a.allergen} className="mb-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-bold text-amber-800">{a.allergen}</p>
              <p className="text-xs text-amber-700">{a.severity} · {a.reaction}</p>
            </div>
          ))}
          <SecondaryButton className="mt-2 w-full" icon={Sparkles}>Ask ARIA about this</SecondaryButton>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
            <Skeleton className="h-4 w-32" /><Skeleton className="mt-4 h-52 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   STAFF & USERS MODULE (admin)
   ========================================================================== */
const ROLE_BADGE_STYLE = {
  admin: "border-purple-200 bg-purple-50 text-purple-700",
  doctor: "border-teal-200 bg-teal-50 text-teal-700",
  nurse: "border-blue-200 bg-blue-50 text-blue-700",
  pharmacist: "border-amber-200 bg-amber-50 text-amber-700",
  patient: "border-slate-200 bg-slate-100 text-slate-600",
};

function StaffView() {
  const toast = useToast();
  const [users, setUsers] = useState(STAFF_USERS);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", role: "doctor", department: "", license_number: "" });

  const toggleActive = (u) => {
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)));
    toast(`${u.name} ${u.active ? "deactivated" : "reactivated"}.`);
  };

  const columns = [
    { key: "name", label: "Name", sortable: true, render: (r) => (
      <div><p className="font-semibold text-slate-800">{r.name}</p><p className="text-xs text-slate-400">{r.email}</p></div>
    )},
    { key: "role", label: "Role", render: (r) => <Badge className={ROLE_BADGE_STYLE[r.role]}>{r.role[0].toUpperCase() + r.role.slice(1)}</Badge> },
    { key: "phone", label: "Phone" },
    { key: "joined", label: "Joined", sortable: true, render: (r) => <span className="font-data text-xs">{r.joined}</span> },
    { key: "active", label: "Status", render: (r) => (
      <Badge className={r.active ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}>{r.active ? "Active" : "Inactive"}</Badge>
    )},
    { key: "actions", label: "", render: (r) => (
      <button onClick={() => toggleActive(r)} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${r.active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-700 hover:bg-green-50"}`}>
        <Power className="h-3 w-3" /> {r.active ? "Deactivate" : "Reactivate"}
      </button>
    )},
  ];

  return (
    <div>
      <SectionHeading
        title="Staff & Users"
        subtitle={`${users.length} accounts`}
        action={<PrimaryButton icon={UserPlus} onClick={() => setAddOpen(true)}>Add Staff Account</PrimaryButton>}
      />
      <DataTable
        columns={columns}
        data={users}
        searchKeys={["name", "email"]}
        filterOptions={{ options: ["admin", "doctor", "nurse", "pharmacist", "patient"], getValue: (r) => r.role }}
        pageSize={7}
      />
      <Modal
        open={addOpen} onClose={() => setAddOpen(false)} title="Add Staff Account" wide
        footer={<>
          <SecondaryButton onClick={() => setAddOpen(false)}>Cancel</SecondaryButton>
          <PrimaryButton icon={UserPlus} onClick={() => {
            setUsers((list) => [...list, { id: list.length + 1, name: `${form.first_name} ${form.last_name}`, email: form.email, role: form.role, phone: "—", joined: new Date().toISOString().slice(0, 10), active: true }]);
            toast(`${form.first_name} ${form.last_name} added as ${form.role[0].toUpperCase() + form.role.slice(1)}.`);
            setAddOpen(false);
            setForm({ first_name: "", last_name: "", email: "", role: "doctor", department: "", license_number: "" });
          }}>Create Account</PrimaryButton>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Role">
            <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="Email"><input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="First Name"><input className={inputCls} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
          <Field label="Last Name"><input className={inputCls} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
          {form.role !== "admin" && (
            <Field label={form.role === "pharmacist" ? "Pharmacy Branch" : "Department"}>
              <input className={inputCls} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </Field>
          )}
          <Field label="License Number"><input className={inputCls} value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================================
   PATIENTS MODULE
   ========================================================================== */
function PatientsView({ role }) {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", gender: "Male", blood: "O+", phone: "" });

  const columns = [
    { key: "id", label: "Patient ID", sortable: true, render: (r) => <span className="font-data text-xs font-semibold text-slate-500">{r.id}</span> },
    { key: "name", label: "Name", sortable: true, render: (r) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">{r.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</div>
        <div><p className="font-semibold text-slate-800">{r.name}</p><p className="text-xs text-slate-400">{r.age} yrs · {r.gender}</p></div>
      </div>
    )},
    { key: "blood", label: "Blood", render: (r) => <Badge className="border-slate-200 bg-slate-50 text-slate-600">{r.blood}</Badge> },
    { key: "status", label: "Status", sortable: true, render: (r) => (
      <Badge className={r.status === "Admitted" ? "border-amber-200 bg-amber-50 text-amber-700" : r.status === "Discharged" ? "border-slate-200 bg-slate-100 text-slate-500" : "border-green-200 bg-green-50 text-green-700"}>{r.status}</Badge>
    )},
    { key: "ward", label: "Ward" },
    { key: "doctor", label: "Assigned Doctor" },
    { key: "lastVisit", label: "Last Visit", sortable: true, render: (r) => <span className="font-data text-xs">{r.lastVisit}</span> },
    { key: "actions", label: "", render: () => (
      <div className="flex items-center gap-1">
        <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-600"><Eye className="h-4 w-4" /></button>
        <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-600"><Pencil className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <SectionHeading
        title="Patient Management"
        subtitle={`${PATIENTS.length} patients on record`}
        action={role !== "patient" && (
          <PrimaryButton icon={Plus} onClick={() => setModalOpen(true)}>Add Patient</PrimaryButton>
        )}
      />
      <DataTable
        columns={columns}
        data={PATIENTS}
        searchKeys={["name", "id", "doctor", "phone"]}
        filterOptions={{ options: ["Outpatient", "Admitted", "Discharged"], getValue: (r) => r.status }}
        pageSize={7}
      />
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Patient"
        wide
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton
              icon={Check}
              onClick={() => { setModalOpen(false); toast(`${form.name || "New patient"} added to the system.`); setForm({ name: "", gender: "Male", blood: "O+", phone: "" }); }}
            >
              Save Patient
            </PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jordan Ellis" /></Field>
          <Field label="Phone Number"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555-0100" /></Field>
          <Field label="Date of Birth"><input type="date" className={inputCls} /></Field>
          <Field label="Gender">
            <select className={inputCls} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </Field>
          <Field label="Blood Group">
            <select className={inputCls} value={form.blood} onChange={(e) => setForm({ ...form, blood: e.target.value })}>
              {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Emergency Contact"><input className={inputCls} placeholder="Name & phone" /></Field>
          <div className="sm:col-span-2"><Field label="Address"><textarea className={inputCls} rows={2} /></Field></div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================================
   APPOINTMENTS MODULE
   ========================================================================== */
function AppointmentsView({ role }) {
  const toast = useToast();
  const [bookOpen, setBookOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const canManage = role === "admin" || role === "doctor" || role === "nurse";
  const scoped = role === "patient" ? APPOINTMENTS.filter((a) => a.patient === "Chukwudi Okoye") : role === "doctor" ? APPOINTMENTS.filter((a) => a.doctor === "Dr. Ngozi Eze") : APPOINTMENTS;

  const openReschedule = (appt) => {
    setRescheduleTarget(appt);
    setNewDate(appt.date);
    setNewTime(appt.time);
  };

  const columns = [
    { key: "id", label: "ID", render: (r) => <span className="font-data text-xs text-slate-500">{r.id}</span> },
    { key: "patient", label: "Patient", sortable: true },
    { key: "doctor", label: "Doctor", sortable: true },
    { key: "date", label: "Date", sortable: true, render: (r) => <span className="font-data text-xs">{r.date} · {r.time}</span> },
    { key: "reason", label: "Reason" },
    { key: "status", label: "Status", render: (r) => <StatusStepper current={r.status} compact /> },
    { key: "actions", label: "", render: (r) => (
      !["Completed", "Cancelled", "No Show"].includes(r.status) && (
        <div className="flex items-center gap-1.5">
          {canManage && <button onClick={() => openReschedule(r)} className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">Reschedule</button>}
          <button onClick={() => toast(`${r.id} cancelled.`, "error")} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Cancel</button>
        </div>
      )
    )},
  ];

  return (
    <div>
      <SectionHeading
        title={role === "patient" ? "My Appointments" : "Appointments"}
        subtitle="Scheduled → Confirmed → In Progress → Completed"
        action={<PrimaryButton icon={Plus} onClick={() => setBookOpen(true)}>Book Appointment</PrimaryButton>}
      />
      <DataTable
        columns={columns}
        data={scoped}
        searchKeys={["patient", "doctor", "id", "reason"]}
        filterOptions={{ options: APPT_STEPS.concat(["Cancelled", "No Show"]), getValue: (r) => r.status }}
        pageSize={7}
        emptyTitle="No appointments found"
      />
      <Modal
        open={bookOpen} onClose={() => setBookOpen(false)} title="Book Appointment" wide
        footer={<>
          <SecondaryButton onClick={() => setBookOpen(false)}>Cancel</SecondaryButton>
          <PrimaryButton icon={CalendarDays} onClick={() => { setBookOpen(false); toast("Appointment booked and marked Scheduled."); }}>Book Appointment</PrimaryButton>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {role !== "patient" && <Field label="Patient"><select className={inputCls}>{PATIENTS.map((p) => <option key={p.id}>{p.name}</option>)}</select></Field>}
          <Field label="Doctor"><select className={inputCls}>{DOCTORS.map((d) => <option key={d.id}>{d.name} — {d.dept}</option>)}</select></Field>
          <Field label="Date"><input type="date" className={inputCls} /></Field>
          <Field label="Time"><input type="time" className={inputCls} /></Field>
          <Field label="Visit Type">
            <select className={inputCls}><option>Consultation</option><option>Follow-up</option><option>Routine Checkup</option><option>Procedure</option><option>Emergency</option></select>
          </Field>
          <div className="sm:col-span-2"><Field label="Reason for Visit"><textarea className={inputCls} rows={2} placeholder="Briefly describe the reason for this visit" /></Field></div>
        </div>
      </Modal>
      <Modal
        open={!!rescheduleTarget} onClose={() => setRescheduleTarget(null)} title={`Reschedule — ${rescheduleTarget?.patient ?? ""}`}
        footer={<>
          <SecondaryButton onClick={() => setRescheduleTarget(null)}>Cancel</SecondaryButton>
          <PrimaryButton icon={CalendarClock} onClick={() => { toast(`${rescheduleTarget.id} rescheduled to ${newDate} · ${newTime}.`); setRescheduleTarget(null); }}>Save New Time</PrimaryButton>
        </>}
      >
        {rescheduleTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Currently: {rescheduleTarget.date} · {rescheduleTarget.time} with {rescheduleTarget.doctor}</p>
            <Field label="New Date"><input type="date" className={inputCls} value={newDate} onChange={(e) => setNewDate(e.target.value)} /></Field>
            <Field label="New Time"><input type="time" className={inputCls} value={newTime} onChange={(e) => setNewTime(e.target.value)} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================================================================
   DOCTOR SCHEDULING MODULE
   ========================================================================== */
function SchedulingView({ role }) {
  const toast = useToast();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const scopedDoctors = role === "doctor" ? DOCTORS.filter((d) => d.name === "Dr. Ngozi Eze") : DOCTORS;
  const [selectedDoc, setSelectedDoc] = useState(scopedDoctors[0]);
  const canManage = role === "admin";

  const [availabilityByDoc, setAvailabilityByDoc] = useState(() => {
    const initial = {};
    DOCTORS.forEach((d) => { initial[d.id] = [true, true, true, true, true, false, false].map((active) => ({ active, start: "09:00", end: "17:00" })); });
    return initial;
  });
  const [shiftsByDoc, setShiftsByDoc] = useState(() => {
    const initial = {};
    DOCTORS.forEach((d) => { initial[d.id] = [
      { date: "Today", type: "Morning Shift", start: "08:00", end: "16:00", status: "Scheduled" },
      { date: "Tomorrow", type: "Morning Shift", start: "08:00", end: "16:00", status: "Scheduled" },
      { date: "Wed", type: "On-Call", start: "16:00", end: "08:00", status: "Scheduled" },
    ]; });
    return initial;
  });

  const [availOpen, setAvailOpen] = useState(false);
  const [draftAvail, setDraftAvail] = useState([]);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({ date: "", type: "Morning Shift", start: "08:00", end: "16:00" });

  const availability = availabilityByDoc[selectedDoc.id] || [];
  const shifts = shiftsByDoc[selectedDoc.id] || [];

  const openAvailEditor = () => {
    setDraftAvail(availability.map((d) => ({ ...d })));
    setAvailOpen(true);
  };

  const saveAvailability = () => {
    setAvailabilityByDoc((prev) => ({ ...prev, [selectedDoc.id]: draftAvail }));
    setAvailOpen(false);
    toast("Weekly availability updated.");
  };

  const saveShift = () => {
    setShiftsByDoc((prev) => ({
      ...prev,
      [selectedDoc.id]: [...(prev[selectedDoc.id] || []), { date: shiftForm.date || "TBD", type: shiftForm.type, start: shiftForm.start, end: shiftForm.end, status: "Scheduled" }],
    }));
    setShiftOpen(false);
    setShiftForm({ date: "", type: "Morning Shift", start: "08:00", end: "16:00" });
    toast("Shift added.");
  };

  return (
    <div>
      <SectionHeading title={role === "doctor" ? "My Schedule" : "Doctor Scheduling"} subtitle="Weekly availability & shift assignments" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {role !== "doctor" && (
          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-1">
            <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-slate-400">Doctors</p>
            <div className="space-y-1">
              {scopedDoctors.map((d) => (
                <button key={d.id} onClick={() => setSelectedDoc(d)} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left ${selectedDoc.id === d.id ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{d.name.split(" ").slice(-1)[0][0]}{d.name.split(" ")[1]?.[0]}</div>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${selectedDoc.id === d.id ? "text-teal-700" : "text-slate-700"}`}>{d.name}</p>
                    <p className="truncate text-xs text-slate-400">{d.dept}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className={role !== "doctor" ? "lg:col-span-3 space-y-5" : "lg:col-span-4 space-y-5"}>
          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">{selectedDoc.name.split(" ").slice(-1)[0][0]}</div>
                <div>
                  <p className="font-display text-sm font-bold text-slate-900">{selectedDoc.name}</p>
                  <p className="text-xs text-slate-500">{selectedDoc.spec} · {selectedDoc.exp} yrs experience · ₦{selectedDoc.fee.toLocaleString()}/consult</p>
                </div>
              </div>
              <Badge className="border-teal-200 bg-teal-50 text-teal-700">{selectedDoc.dept}</Badge>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Weekly Availability</p>
              {canManage && <button onClick={openAvailEditor} className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"><Pencil className="h-3 w-3" /> Edit</button>}
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {days.map((d, i) => (
                <div key={d} className={`rounded-xl p-2.5 text-center ${availability[i]?.active ? "bg-teal-50" : "bg-slate-50"}`}>
                  <p className="text-xs font-bold text-slate-500">{d}</p>
                  <p className={`mt-1 text-xs font-semibold ${availability[i]?.active ? "text-teal-700" : "text-slate-400"}`}>{availability[i]?.active ? `${availability[i].start}–${availability[i].end}` : "Off"}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Upcoming Shifts</p>
              {canManage && <button onClick={() => setShiftOpen(true)} className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"><Plus className="h-3 w-3" /> Add Shift</button>}
            </div>
            <div className="space-y-2">
              {shifts.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-2.5">
                  <span className="text-sm text-slate-700">{s.date} · {s.type} · {s.start}–{s.end}</span>
                  <Badge className="border-blue-200 bg-blue-50 text-blue-700">{s.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={availOpen} onClose={() => setAvailOpen(false)} title={`Edit Weekly Availability — ${selectedDoc.name}`} wide
        footer={<><SecondaryButton onClick={() => setAvailOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={saveAvailability}>Save Availability</PrimaryButton></>}
      >
        <div className="space-y-2">
          {days.map((label, i) => (
            <div key={label} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5">
              <label className="flex w-24 items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={draftAvail[i]?.active ?? false} onChange={(e) => setDraftAvail((rows) => rows.map((r, idx) => idx === i ? { ...r, active: e.target.checked } : r))} />
                {label}
              </label>
              <input type="time" className={inputCls} disabled={!draftAvail[i]?.active} value={draftAvail[i]?.start ?? "09:00"} onChange={(e) => setDraftAvail((rows) => rows.map((r, idx) => idx === i ? { ...r, start: e.target.value } : r))} />
              <span className="text-slate-400">to</span>
              <input type="time" className={inputCls} disabled={!draftAvail[i]?.active} value={draftAvail[i]?.end ?? "17:00"} onChange={(e) => setDraftAvail((rows) => rows.map((r, idx) => idx === i ? { ...r, end: e.target.value } : r))} />
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={shiftOpen} onClose={() => setShiftOpen(false)} title={`Add Shift — ${selectedDoc.name}`} wide
        footer={<><SecondaryButton onClick={() => setShiftOpen(false)}>Cancel</SecondaryButton><PrimaryButton icon={Plus} onClick={saveShift}>Add Shift</PrimaryButton></>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date"><input type="date" className={inputCls} onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })} /></Field>
          <Field label="Shift Type">
            <select className={inputCls} value={shiftForm.type} onChange={(e) => setShiftForm({ ...shiftForm, type: e.target.value })}>
              <option>Morning Shift</option><option>Evening Shift</option><option>Night Shift</option><option>On-Call</option>
            </select>
          </Field>
          <Field label="Start Time"><input type="time" className={inputCls} value={shiftForm.start} onChange={(e) => setShiftForm({ ...shiftForm, start: e.target.value })} /></Field>
          <Field label="End Time"><input type="time" className={inputCls} value={shiftForm.end} onChange={(e) => setShiftForm({ ...shiftForm, end: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================================
   EMR MODULE
   ========================================================================== */
function EMRView({ role }) {
  const toast = useToast();
  const patientList = role === "patient" ? PATIENTS.filter((p) => p.id === "P-000101") : PATIENTS;
  const [selected, setSelected] = useState(patientList[0]);
  const [recordsState, setRecordsState] = useState(EMR_RECORDS);
  const record = recordsState[selected.id] || { allergies: [], diagnoses: [], treatment: "No treatment plan on file.", documents: [] };
  const canEdit = role === "doctor" || role === "admin";

  const [addOpen, setAddOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({ type: "Diagnosis", date: new Date().toISOString().slice(0, 10), text: "", file: null });

  const submitRecord = () => {
    setRecordsState((prev) => {
      const existing = prev[selected.id] || { allergies: [], diagnoses: [], treatment: "No treatment plan on file.", documents: [] };
      const newDiagnoses = [{ date: recordForm.date, type: recordForm.type, text: recordForm.text, doctor: "Dr. Ngozi Eze" }, ...existing.diagnoses];
      const newDocuments = recordForm.file ? [{ name: recordForm.file, size: "—" }, ...existing.documents] : existing.documents;
      return { ...prev, [selected.id]: { ...existing, diagnoses: newDiagnoses, documents: newDocuments } };
    });
    toast("Medical record added.");
    setAddOpen(false);
    setRecordForm({ type: "Diagnosis", date: new Date().toISOString().slice(0, 10), text: "", file: null });
  };

  return (
    <div>
      <SectionHeading
        title={role === "patient" ? "My Medical Records" : "Electronic Medical Records"}
        subtitle="Diagnosis history, treatment plans, allergies & documents"
        action={canEdit && <PrimaryButton icon={Plus} onClick={() => setAddOpen(true)}>Add Record</PrimaryButton>}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {role !== "patient" && (
          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-1 overflow-y-auto" style={{ maxHeight: 520 }}>
            {patientList.map((p) => (
              <button key={p.id} onClick={() => setSelected(p)} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left ${selected.id === p.id ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div>
                <div className="min-w-0">
                  <p className={`truncate text-sm font-semibold ${selected.id === p.id ? "text-teal-700" : "text-slate-700"}`}>{p.name}</p>
                  <p className="truncate text-xs text-slate-400">{p.id}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className={role !== "patient" ? "lg:col-span-2 space-y-5" : "lg:col-span-3 space-y-5"}>
          <div className="animate-in rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="mb-2 flex items-center gap-2"><CircleAlert className="h-4.5 w-4.5 text-amber-600" /><h3 className="font-display text-sm font-bold text-amber-800">Allergies</h3></div>
            {record.allergies.length ? (
              <div className="flex flex-wrap gap-2">
                {record.allergies.map((a) => <Badge key={a.allergen} className="border-amber-300 bg-white text-amber-700">{a.allergen} — {a.severity}</Badge>)}
              </div>
            ) : <p className="text-sm text-amber-700">No known allergies on file.</p>}
          </div>

          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-display mb-4 text-sm font-bold text-slate-900">Diagnosis History</h3>
            {record.diagnoses.length ? (
              <div className="space-y-4">
                {record.diagnoses.map((d, i) => (
                  <div key={i} className="flex gap-3 border-l-2 border-teal-200 pl-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2"><Badge className="border-slate-200 bg-slate-50 text-slate-600">{d.type}</Badge><span className="font-data text-xs text-slate-400">{d.date}</span></div>
                      <p className="mt-1.5 text-sm text-slate-700">{d.text}</p>
                      <p className="mt-1 text-xs text-slate-400">{d.doctor}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={FileText} title="No records yet" subtitle="Diagnosis history will appear here after the first visit." />}
          </div>

          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-display mb-2 text-sm font-bold text-slate-900">Treatment Plan</h3>
            <p className="text-sm text-slate-600">{record.treatment}</p>
          </div>

          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-slate-900">Documents</h3>
              {canEdit && (
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700">
                  <Upload className="h-3.5 w-3.5" /> Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setRecordsState((prev) => {
                        const existing = prev[selected.id] || { allergies: [], diagnoses: [], treatment: "No treatment plan on file.", documents: [] };
                        return { ...prev, [selected.id]: { ...existing, documents: [{ name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB` }, ...existing.documents] } };
                      });
                      toast(`${file.name} uploaded to patient record.`);
                    }}
                  />
                </label>
              )}
            </div>
            {record.documents.length ? (
              <div className="space-y-2">
                {record.documents.map((doc) => (
                  <div key={doc.name} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5"><Paperclip className="h-4 w-4 text-slate-400" /><span className="text-sm text-slate-700">{doc.name}</span></div>
                    <div className="flex items-center gap-3"><span className="text-xs text-slate-400">{doc.size}</span><Download className="h-3.5 w-3.5 cursor-pointer text-slate-400 hover:text-teal-600" /></div>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={Paperclip} title="No documents uploaded" subtitle="Scans, PDFs, and imaging results will appear here." />}
          </div>
        </div>
      </div>

      <Modal
        open={addOpen} onClose={() => setAddOpen(false)} title={`Add Medical Record — ${selected.name}`} wide
        footer={<><SecondaryButton onClick={() => setAddOpen(false)}>Cancel</SecondaryButton><PrimaryButton icon={Plus} onClick={submitRecord}>Save Record</PrimaryButton></>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Record Type">
            <select className={inputCls} value={recordForm.type} onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}>
              <option>Diagnosis</option><option>Treatment Plan</option><option>Progress Note</option><option>Discharge Summary</option><option>Lab Summary</option>
            </select>
          </Field>
          <Field label="Visit Date"><input type="date" className={inputCls} value={recordForm.date} onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label="Details"><textarea className={inputCls} rows={3} value={recordForm.text} onChange={(e) => setRecordForm({ ...recordForm, text: e.target.value })} placeholder="Diagnosis, treatment plan, or notes..." /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Attachment" hint="Optional — scan, PDF, or image">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-100">
                <Upload className="h-4 w-4" />
                {recordForm.file || "Choose a file..."}
                <input type="file" className="hidden" onChange={(e) => setRecordForm({ ...recordForm, file: e.target.files?.[0]?.name || null })} />
              </label>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================================
   BILLING MODULE
   ========================================================================== */
function BillingView({ role }) {
  const toast = useToast();
  const [invoices, setInvoices] = useState(INVOICES);
  const scoped = role === "patient" ? invoices.filter((i) => i.patient === "Chukwudi Okoye") : invoices;
  const invStatusCls = { Paid: "border-green-200 bg-green-50 text-green-700", Pending: "border-amber-200 bg-amber-50 text-amber-700", Overdue: "border-red-200 bg-red-50 text-red-700" };

  const [createOpen, setCreateOpen] = useState(false);
  const [invPatient, setInvPatient] = useState("");
  const [invItems, setInvItems] = useState([{ type: "Consultation", description: "", qty: "1", price: "0" }]);
  const estimatedTotal = invItems.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  const updateInvItem = (i, field, value) => setInvItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const createInvoice = () => {
    const newId = `INV-${String(400 + invoices.length + 1).padStart(6, "0")}`;
    setInvoices((list) => [{ id: newId, patient: invPatient || "Unassigned", date: new Date().toISOString().slice(0, 10), amount: estimatedTotal, status: "Pending", method: "Bank Transfer" }, ...list]);
    toast("Invoice created.");
    setCreateOpen(false);
    setInvPatient("");
    setInvItems([{ type: "Consultation", description: "", qty: "1", price: "0" }]);
  };

  const columns = [
    { key: "id", label: "Invoice", render: (r) => <span className="font-data text-xs font-semibold text-slate-600">{r.id}</span> },
    { key: "patient", label: "Patient", sortable: true },
    { key: "date", label: "Date", sortable: true, render: (r) => <span className="font-data text-xs">{r.date}</span> },
    { key: "amount", label: "Amount", sortable: true, render: (r) => <span className="font-data font-semibold text-slate-800">₦{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> },
    { key: "method", label: "Method" },
    { key: "status", label: "Status", render: (r) => <Badge className={invStatusCls[r.status]}>{r.status}</Badge> },
    { key: "actions", label: "", render: (r) => (
      <div className="flex items-center gap-1.5">
        <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-600"><Download className="h-4 w-4" /></button>
        {r.status !== "Paid" && role !== "patient" && (
          <button onClick={() => toast(`${r.id} marked as Paid.`)} className="rounded-lg border border-teal-200 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">Record Payment</button>
        )}
      </div>
    )},
  ];

  const totalRevenue = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <SectionHeading
        title="Billing & Insurance"
        subtitle="Invoices, payments, and insurance claims"
        action={role === "admin" && <PrimaryButton icon={Plus} onClick={() => setCreateOpen(true)}>New Invoice</PrimaryButton>}
      />
      {role !== "patient" && (
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={DollarSign} label="Collected" value={`₦${totalRevenue.toLocaleString()}`} tint="bg-green-50 text-green-600" />
          <StatCard icon={Wallet} label="Outstanding" value={`₦${outstanding.toLocaleString()}`} tint="bg-amber-50 text-amber-600" />
          <StatCard icon={Receipt} label="Invoices (MTD)" value={invoices.length} tint="bg-blue-50 text-blue-600" />
          <StatCard icon={CreditCard} label="Active Claims" value={CLAIMS.length} tint="bg-purple-50 text-purple-600" />
        </div>
      )}
      <DataTable columns={columns} data={scoped} searchKeys={["id", "patient"]} filterOptions={{ options: ["Paid", "Pending", "Overdue"], getValue: (r) => r.status }} pageSize={6} />

      {role !== "patient" && (
        <div className="mt-5 animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display mb-4 text-sm font-bold text-slate-900">Insurance Claims</h3>
          <div className="space-y-2.5">
            {CLAIMS.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{c.id} · {c.patient}</p>
                  <p className="text-xs text-slate-500">{c.provider} · ₦{c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <Badge className={c.status === "Approved" ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700"}>{c.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={createOpen} onClose={() => setCreateOpen(false)} title="New Invoice" wide
        footer={<><SecondaryButton onClick={() => setCreateOpen(false)}>Cancel</SecondaryButton><PrimaryButton icon={Plus} onClick={createInvoice} disabled={!invPatient}>Create Invoice</PrimaryButton></>}
      >
        <div className="space-y-4">
          <Field label="Patient">
            <select className={inputCls} value={invPatient} onChange={(e) => setInvPatient(e.target.value)}>
              <option value="">Select patient…</option>
              {PATIENTS.map((p) => <option key={p.id} value={p.name}>{p.name} ({p.id})</option>)}
            </select>
          </Field>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Line Items</span>
              <button onClick={() => setInvItems((rows) => [...rows, { type: "Consultation", description: "", qty: "1", price: "0" }])} className="text-xs font-semibold text-teal-600 hover:text-teal-700">+ Add item</button>
            </div>
            <div className="space-y-2">
              {invItems.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 rounded-lg border border-slate-100 p-2">
                  <select className={`${inputCls} col-span-3`} value={it.type} onChange={(e) => updateInvItem(i, "type", e.target.value)}>
                    <option>Consultation</option><option>Procedure</option><option>Medication</option><option>Lab Test</option><option>Room Charge</option><option>Other</option>
                  </select>
                  <input className={`${inputCls} col-span-4`} placeholder="Description" value={it.description} onChange={(e) => updateInvItem(i, "description", e.target.value)} />
                  <input type="number" className={`${inputCls} col-span-2`} placeholder="Qty" value={it.qty} onChange={(e) => updateInvItem(i, "qty", e.target.value)} />
                  <input type="number" step="0.01" className={`${inputCls} col-span-2`} placeholder="Unit price" value={it.price} onChange={(e) => updateInvItem(i, "price", e.target.value)} />
                  <button onClick={() => setInvItems((rows) => rows.filter((_, idx) => idx !== i))} className="col-span-1 flex items-center justify-center text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <div className="text-right">
              <span className="block text-xs text-slate-500">Estimated total</span>
              <span className="font-data text-lg font-bold text-slate-900">₦{estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================================
   PHARMACY MODULE
   ========================================================================== */
function PharmacyView() {
  const toast = useToast();
  const [tab, setTab] = useState("inventory");

  const invCols = [
    { key: "sku", label: "SKU", render: (r) => <span className="font-data text-xs text-slate-500">{r.sku}</span> },
    { key: "name", label: "Medicine", sortable: true, render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
    { key: "category", label: "Category" },
    { key: "stock", label: "Stock", sortable: true, render: (r) => (
      <span className={`font-data font-semibold ${r.stock <= r.reorder ? "text-red-600" : "text-slate-700"}`}>{r.stock}{r.stock <= r.reorder && <AlertTriangle className="ml-1.5 inline h-3.5 w-3.5" />}</span>
    )},
    { key: "price", label: "Unit Price", render: (r) => <span className="font-data">₦{r.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> },
    { key: "expiry", label: "Expiry", render: (r) => <span className="font-data text-xs">{r.expiry}</span> },
  ];

  const rxCols = [
    { key: "id", label: "Rx ID", render: (r) => <span className="font-data text-xs text-slate-500">{r.id}</span> },
    { key: "patient", label: "Patient", sortable: true },
    { key: "drug", label: "Medication" },
    { key: "qty", label: "Qty" },
    { key: "doctor", label: "Prescribed By" },
    { key: "status", label: "Status", render: (r) => <Badge className={r.status === "Dispensed" ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{r.status}</Badge> },
    { key: "actions", label: "", render: (r) => r.status === "Pending" && (
      <button
        onClick={() => toast(`${r.drug} dispensed to ${r.patient}. Stock updated.`)}
        className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
      >
        Dispense
      </button>
    )},
  ];

  return (
    <div>
      <SectionHeading title="Pharmacy" subtitle="Inventory, prescriptions & dispensing" />
      <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1">
        {[["inventory", "Inventory"], ["prescriptions", "Prescriptions to Dispense"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === k ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{l}</button>
        ))}
      </div>
      {tab === "inventory" ? (
        <DataTable columns={invCols} data={MEDICINES} searchKeys={["name", "sku", "category"]} filterOptions={{ options: [...new Set(MEDICINES.map((m) => m.category))], getValue: (r) => r.category }} pageSize={6} rowKey="sku" />
      ) : (
        <DataTable columns={rxCols} data={PRESCRIPTIONS_QUEUE} searchKeys={["patient", "drug", "id"]} filterOptions={{ options: ["Pending", "Dispensed"], getValue: (r) => r.status }} pageSize={6} />
      )}
    </div>
  );
}

/* ============================================================================
   LAB RESULTS MODULE
   ========================================================================== */
function LabResultsView({ role }) {
  const toast = useToast();
  const [requests, setRequests] = useState(LAB_REQUESTS);
  const [resultsByRequest, setResultsByRequest] = useState({ "LAB-000601": LAB_PARAMS_SAMPLE });
  const [resultOpen, setResultOpen] = useState(null);
  const [enteringResult, setEnteringResult] = useState(false);
  const scoped = role === "patient" ? requests.filter((l) => l.patient === "Chukwudi Okoye") : requests;
  const labStatusCls = { Requested: "border-blue-200 bg-blue-50 text-blue-700", "Sample Collected": "border-purple-200 bg-purple-50 text-purple-700", "In Progress": "border-amber-200 bg-amber-50 text-amber-700", Completed: "border-green-200 bg-green-50 text-green-700" };
  const canEnterResult = role === "admin" || role === "doctor" || role === "nurse";

  const [requestOpen, setRequestOpen] = useState(false);
  const [reqForm, setReqForm] = useState({ patient: "", test: "Complete Blood Count", priority: "Routine", notes: "" });

  const [summary, setSummary] = useState("");
  const [params, setParams] = useState([{ name: "", value: "", unit: "", low: "", high: "" }]);
  const [resultFile, setResultFile] = useState(null);

  const submitRequest = () => {
    const newId = `LAB-${String(600 + requests.length + 1).padStart(6, "0")}`;
    setRequests((list) => [{ id: newId, patient: reqForm.patient || "Unassigned", test: reqForm.test, priority: reqForm.priority, status: "Requested", doctor: "Dr. Ngozi Eze", critical: false }, ...list]);
    toast("Lab test requested.");
    setRequestOpen(false);
    setReqForm({ patient: "", test: "Complete Blood Count", priority: "Routine", notes: "" });
  };

  const openResultEntry = () => {
    setSummary("");
    setParams([{ name: "", value: "", unit: "", low: "", high: "" }]);
    setResultFile(null);
    setEnteringResult(true);
  };

  const submitResult = () => {
    const filled = params.filter((p) => p.name.trim());
    const flagged = filled.map((p) => {
      const num = parseFloat(p.value);
      const low = parseFloat(p.low), high = parseFloat(p.high);
      const isCritical = !isNaN(num) && ((!isNaN(low) && num < low) || (!isNaN(high) && num > high));
      return { name: p.name, value: p.value, unit: p.unit, range: p.low && p.high ? `${p.low} – ${p.high}` : "—", critical: isCritical };
    });
    setResultsByRequest((prev) => ({ ...prev, [resultOpen.id]: flagged }));
    setRequests((list) => list.map((r) => (r.id === resultOpen.id ? { ...r, status: "Completed", critical: flagged.some((f) => f.critical) } : r)));
    toast("Result entered — request marked completed.");
    setEnteringResult(false);
    setResultOpen(null);
  };

  const columns = [
    { key: "id", label: "Request", render: (r) => <span className="font-data text-xs text-slate-500">{r.id}</span> },
    { key: "patient", label: "Patient", sortable: true },
    { key: "test", label: "Test" },
    { key: "priority", label: "Priority", render: (r) => <Badge className={r.priority === "STAT" ? "border-red-200 bg-red-50 text-red-700" : r.priority === "Urgent" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"}>{r.priority}</Badge> },
    { key: "status", label: "Status", render: (r) => (
      <div className="flex items-center gap-1.5">
        <Badge className={labStatusCls[r.status]}>{r.status}</Badge>
        {r.critical && <Badge className="border-red-300 bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3" /> Critical</Badge>}
      </div>
    )},
    { key: "actions", label: "", render: (r) => (
      <button onClick={() => setResultOpen(r)} className="text-xs font-semibold text-teal-600 hover:text-teal-700">View {r.status === "Completed" ? "Result" : "Status"}</button>
    )},
  ];

  return (
    <div>
      <SectionHeading
        title="Lab Results"
        subtitle="Test requests, results, and critical value flagging"
        action={role === "doctor" && <PrimaryButton icon={Plus} onClick={() => setRequestOpen(true)}>Request Test</PrimaryButton>}
      />
      {scoped.some((l) => l.critical) && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-800">{scoped.filter((l) => l.critical).length} result(s) flagged with a critical value — review recommended.</p>
        </div>
      )}
      <DataTable columns={columns} data={scoped} searchKeys={["patient", "test", "id"]} filterOptions={{ options: ["Requested", "Sample Collected", "In Progress", "Completed"], getValue: (r) => r.status }} pageSize={6} />

      <Modal
        open={requestOpen} onClose={() => setRequestOpen(false)} title="Request Lab Test" wide
        footer={<><SecondaryButton onClick={() => setRequestOpen(false)}>Cancel</SecondaryButton><PrimaryButton icon={Plus} onClick={submitRequest}>Submit Request</PrimaryButton></>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Patient">
            <select className={inputCls} value={reqForm.patient} onChange={(e) => setReqForm({ ...reqForm, patient: e.target.value })}>
              <option value="">Select patient…</option>
              {PATIENTS.map((p) => <option key={p.id} value={p.name}>{p.name} ({p.id})</option>)}
            </select>
          </Field>
          <Field label="Test Type">
            <select className={inputCls} value={reqForm.test} onChange={(e) => setReqForm({ ...reqForm, test: e.target.value })}>
              <option>Complete Blood Count</option><option>Lipid Panel</option><option>Electrolyte Panel</option><option>Urinalysis</option><option>Liver Function Panel</option><option>Kidney Function Panel</option><option>X-Ray Imaging</option>
            </select>
          </Field>
          <Field label="Priority">
            <select className={inputCls} value={reqForm.priority} onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value })}>
              <option>Routine</option><option>Urgent</option><option>STAT</option>
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Clinical Notes"><textarea className={inputCls} rows={2} value={reqForm.notes} onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })} /></Field></div>
        </div>
      </Modal>

      <Modal
        open={!!resultOpen}
        onClose={() => { setResultOpen(null); setEnteringResult(false); }}
        title={resultOpen ? `${resultOpen.test} — ${resultOpen.patient}` : ""}
        wide
      >
        {resultOpen && resultOpen.status === "Completed" ? (
          <div className="space-y-3">
            {(resultsByRequest[resultOpen.id] || []).map((p, i) => (
              <div key={i} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${p.critical ? "border-red-200 bg-red-50" : "border-slate-100"}`}>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500">Reference: {p.range} {p.unit}</p>
                </div>
                <div className="text-right">
                  <p className={`font-data text-base font-bold ${p.critical ? "text-red-600" : "text-slate-800"}`}>{p.value} <span className="text-xs font-medium text-slate-400">{p.unit}</span></p>
                  {p.critical && <Badge className="mt-1 border-red-300 bg-red-100 text-red-700">Critical</Badge>}
                </div>
              </div>
            ))}
          </div>
        ) : resultOpen && !enteringResult ? (
          <EmptyState
            icon={TestTube} title="Result not yet available" subtitle={`This request is currently: ${resultOpen.status}`}
            action={canEnterResult && <PrimaryButton className="mt-4" icon={Plus} onClick={openResultEntry}>Enter Result</PrimaryButton>}
          />
        ) : resultOpen && (
          <div className="space-y-4">
            <Field label="Summary"><textarea className={inputCls} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Overall interpretation..." /></Field>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Parameters</span>
                <button onClick={() => setParams((rows) => [...rows, { name: "", value: "", unit: "", low: "", high: "" }])} className="text-xs font-semibold text-teal-600 hover:text-teal-700">+ Add parameter</button>
              </div>
              <div className="space-y-2">
                {params.map((p, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5 rounded-lg border border-slate-100 p-2">
                    <input className={`${inputCls} col-span-4`} placeholder="Parameter" value={p.name} onChange={(e) => setParams((rows) => rows.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r))} />
                    <input className={`${inputCls} col-span-2`} placeholder="Value" value={p.value} onChange={(e) => setParams((rows) => rows.map((r, idx) => idx === i ? { ...r, value: e.target.value } : r))} />
                    <input className={`${inputCls} col-span-2`} placeholder="Unit" value={p.unit} onChange={(e) => setParams((rows) => rows.map((r, idx) => idx === i ? { ...r, unit: e.target.value } : r))} />
                    <input className={`${inputCls} col-span-2`} placeholder="Low" value={p.low} onChange={(e) => setParams((rows) => rows.map((r, idx) => idx === i ? { ...r, low: e.target.value } : r))} />
                    <input className={`${inputCls} col-span-1`} placeholder="High" value={p.high} onChange={(e) => setParams((rows) => rows.map((r, idx) => idx === i ? { ...r, high: e.target.value } : r))} />
                    <button onClick={() => setParams((rows) => rows.filter((_, idx) => idx !== i))} className="col-span-1 flex items-center justify-center text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">A value outside the low/high range is auto-flagged critical.</p>
            </div>
            <Field label="Attachment" hint="Optional">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-100">
                <Upload className="h-4 w-4" />{resultFile || "Choose a file..."}
                <input type="file" className="hidden" onChange={(e) => setResultFile(e.target.files?.[0]?.name || null)} />
              </label>
            </Field>
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={() => setEnteringResult(false)}>Back</SecondaryButton>
              <PrimaryButton icon={Plus} onClick={submitResult}>Save Result</PrimaryButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================================================================
   ARIA FULL-PAGE VIEW (nav item, wraps the same widget content larger)
   ========================================================================== */
function AriaPageView({ role }) {
  return (
    <div>
      <SectionHeading title="ARIA Assistant" subtitle="Built directly into OMNICARE · native conversation history, no third-party framework" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 animate-in flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ height: 560 }}>
          <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-900 px-5 py-4">
            <Sparkles className="h-5 w-5 text-teal-300" />
            <span className="font-display font-bold text-white">Chat with ARIA</span>
            <span className="ml-auto"><PulseChip compact /></span>
          </div>
          <div className="flex flex-1 items-center justify-center p-8">
            <EmptyState icon={MessageCircle} title="Use the chat bubble" subtitle="Tap the floating ARIA button in the bottom-right corner of any screen to start a live conversation — it stays with you across the whole app." />
          </div>
        </div>
        <div className="space-y-5">
          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-display mb-3 text-sm font-bold text-slate-900">What ARIA can do</h3>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li className="flex gap-2"><BadgeCheck className="h-4 w-4 shrink-0 text-teal-600" /> Triage symptoms & suggest care level</li>
              <li className="flex gap-2"><BadgeCheck className="h-4 w-4 shrink-0 text-teal-600" /> Summarize a patient's chart on request</li>
              <li className="flex gap-2"><BadgeCheck className="h-4 w-4 shrink-0 text-teal-600" /> Answer general medical questions</li>
              <li className="flex gap-2"><BadgeCheck className="h-4 w-4 shrink-0 text-teal-600" /> Auto-flag urgent language for care teams</li>
            </ul>
          </div>
          {role !== "patient" && (
            <div className="animate-in rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="mb-2 flex items-center gap-2"><AlertTriangle className="h-4.5 w-4.5 text-red-600" /><h3 className="font-display text-sm font-bold text-red-800">Urgent Flags Feed</h3></div>
              <p className="text-sm text-red-700">1 patient conversation flagged in the last 24 hours — a message from Emeka Nwankwo matched urgent-symptom language.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   ROOT APP
   ========================================================================== */
const VIEW_TITLES = {
  dashboard: "Dashboard", patients: "Patient Management", staff: "Staff & Users", scheduling: "Doctor Scheduling", appointments: "Appointments",
  emr: "Medical Records", billing: "Billing & Insurance", pharmacy: "Pharmacy", labs: "Lab Results", aria: "ARIA Assistant",
};

function AppShell({ role, onLogout }) {
  const [active, setActive] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 550);
    return () => clearTimeout(t);
  }, [active, role]);

  const renderView = () => {
    switch (active) {
      case "dashboard":
        if (role === "admin") return <AdminDashboard loading={loading} />;
        if (role === "doctor") return <DoctorDashboard loading={loading} />;
        if (role === "nurse") return <NurseDashboard loading={loading} />;
        if (role === "pharmacist") return <PharmacistDashboard loading={loading} />;
        return <PatientDashboard loading={loading} />;
      case "patients": return <PatientsView role={role} />;
      case "staff": return <StaffView />;
      case "scheduling": return <SchedulingView role={role} />;
      case "appointments": return <AppointmentsView role={role} />;
      case "emr": return <EMRView role={role} />;
      case "billing": return <BillingView role={role} />;
      case "pharmacy": return <PharmacyView role={role} />;
      case "labs": return <LabResultsView role={role} />;
      case "aria": return <AriaPageView role={role} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-body">
      <GlobalStyles />
      <Sidebar role={role} active={active} onNavigate={setActive} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onLogout={onLogout} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={VIEW_TITLES[active]} role={role} setMobileOpen={setMobileOpen} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{renderView()}</main>
      </div>
      <AriaWidget role={role} />
    </div>
  );
}

export default function OmnicareLivePreview() {
  const [session, setSession] = useState(null);
  return (
    <ToastProvider>
      {session ? <AppShell role={session} onLogout={() => setSession(null)} /> : <LoginView onLogin={setSession} />}
    </ToastProvider>
  );
}
