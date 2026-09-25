// Types mirror the DRF serializers in backend/apps/*/serializers.py field for
// field. If you change a serializer, update the matching type here.

export type UserRole = "admin" | "doctor" | "nurse" | "pharmacist" | "patient";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  phone_number: string;
  is_active: boolean;
  date_joined: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface ApiErrorBody {
  detail: string;
  errors: Record<string, string[]> | null;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------
export type Gender = "male" | "female" | "other" | "";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";
export type AdmissionStatus = "outpatient" | "admitted" | "discharged";

export interface PatientProfile {
  id: number;
  user: User;
  patient_id: string;
  date_of_birth: string | null;
  age: number | null;
  gender: Gender;
  blood_group: BloodGroup;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  insurance_provider: string;
  insurance_policy_number: string;
  admission_status: AdmissionStatus;
  ward: string;
  bed_number: string;
  admitting_doctor: number | null;
  admitting_doctor_name: string | null;
  admitted_at: string | null;
  discharged_at: string | null;
  discharge_summary: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Doctors
// ---------------------------------------------------------------------------
export interface DoctorAvailability {
  id: number;
  doctor: number;
  weekday: number;
  weekday_display: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export type ShiftType = "morning" | "evening" | "night" | "on_call";
export type ShiftStatus = "scheduled" | "completed" | "cancelled";

export interface DoctorShift {
  id: number;
  doctor: number;
  doctor_name: string;
  date: string;
  shift_type: ShiftType;
  shift_type_display: string;
  start_time: string;
  end_time: string;
  department: string;
  status: ShiftStatus;
  notes: string;
}

export interface DoctorProfile {
  id: number;
  user: User;
  doctor_id: string;
  specialization: string;
  department: string;
  license_number: string;
  years_of_experience: number;
  consultation_fee: string;
  bio: string;
  qualifications: string;
  is_available_for_booking: boolean;
  availability_slots: DoctorAvailability[];
  upcoming_shifts: DoctorShift[];
  patient_count: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Nurses / Pharmacists
// ---------------------------------------------------------------------------
export type NurseShift = "morning" | "evening" | "night";

export interface NurseProfile {
  id: number;
  user: User;
  nurse_id: string;
  department: string;
  shift: NurseShift;
  license_number: string;
  assigned_ward: string;
  years_of_experience: number;
  created_at: string;
  updated_at: string;
}

export interface PharmacistProfile {
  id: number;
  user: User;
  pharmacist_id: string;
  license_number: string;
  pharmacy_branch: string;
  years_of_experience: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
export type AppointmentStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type VisitType = "consultation" | "follow_up" | "emergency" | "routine_checkup" | "procedure";

export interface Appointment {
  id: number;
  appointment_id: string;
  patient: number;
  patient_name: string;
  patient_code: string;
  doctor: number;
  doctor_name: string;
  doctor_specialization: string;
  department: string;
  visit_type: VisitType;
  visit_type_display: string;
  scheduled_start: string;
  scheduled_end: string;
  status: AppointmentStatus;
  status_display: string;
  reason: string;
  notes: string;
  cancellation_reason: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export const APPOINTMENT_STEPS: AppointmentStatus[] = ["scheduled", "confirmed", "in_progress", "completed"];

// ---------------------------------------------------------------------------
// Medical records
// ---------------------------------------------------------------------------
export type RecordType = "diagnosis" | "treatment_plan" | "progress_note" | "discharge_summary" | "lab_summary";
export type AllergySeverity = "mild" | "moderate" | "severe";

export interface Allergy {
  id: number;
  patient: number;
  allergen: string;
  reaction: string;
  severity: AllergySeverity;
  noted_by: number | null;
  noted_by_name: string;
  created_at: string;
}

export interface VitalSign {
  id: number;
  patient: number;
  patient_name: string;
  recorded_by: number | null;
  recorded_by_name: string;
  heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  temperature_celsius: string | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  notes: string;
  recorded_at: string;
  is_critical: boolean;
}

export interface MedicalRecord {
  id: number;
  record_id: string;
  patient: number;
  patient_name: string;
  doctor: number | null;
  doctor_name: string;
  appointment: number | null;
  record_type: RecordType;
  record_type_display: string;
  visit_date: string;
  diagnosis: string;
  treatment_plan: string;
  doctor_notes: string;
  icd_code: string;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientChart {
  records: MedicalRecord[];
  allergies: Allergy[];
  recent_vitals: VitalSign[];
}

// ---------------------------------------------------------------------------
// Prescriptions
// ---------------------------------------------------------------------------
export type PrescriptionStatus = "pending" | "partially_dispensed" | "dispensed" | "cancelled";

export interface PrescriptionItem {
  id: number;
  prescription: number;
  medicine: number;
  medicine_name: string;
  medicine_stock: number;
  dosage: string;
  frequency: string;
  duration_days: number;
  quantity: number;
  instructions: string;
  is_dispensed: boolean;
  dispensed_at: string | null;
  dispensed_by: number | null;
  dispensed_by_name: string;
}

export interface PrescriptionItemInput {
  medicine: number;
  dosage: string;
  frequency: string;
  duration_days: number;
  quantity: number;
  instructions?: string;
}

export interface Prescription {
  id: number;
  prescription_id: string;
  patient: number;
  patient_name: string;
  doctor: number;
  doctor_name: string;
  medical_record: number | null;
  status: PrescriptionStatus;
  status_display: string;
  notes: string;
  items: PrescriptionItem[];
  items_input?: PrescriptionItemInput[];
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Pharmacy
// ---------------------------------------------------------------------------
export type MedicineCategory =
  | "analgesic" | "antibiotic" | "antiviral" | "cardiovascular" | "respiratory"
  | "gastrointestinal" | "endocrine" | "neurological" | "vitamin_supplement" | "other";
export type DosageForm = "tablet" | "capsule" | "syrup" | "injection" | "ointment" | "drops" | "inhaler";

export interface Medicine {
  id: number;
  sku: string;
  name: string;
  generic_name: string;
  category: MedicineCategory;
  category_display: string;
  dosage_form: DosageForm;
  dosage_form_display: string;
  strength: string;
  manufacturer: string;
  batch_number: string;
  unit_price: string;
  stock_quantity: number;
  reorder_level: number;
  expiry_date: string;
  is_active: boolean;
  is_low_stock: boolean;
  is_expiring_soon: boolean;
  created_at: string;
  updated_at: string;
}

export type StockTransactionType = "restock" | "dispense" | "adjustment" | "return" | "expired";

export interface StockTransaction {
  id: number;
  medicine: number;
  medicine_name: string;
  transaction_type: StockTransactionType;
  quantity: number;
  resulting_quantity: number;
  performed_by: number | null;
  performed_by_name: string;
  note: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------
export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled" | "refunded";
export type PaymentMethod = "cash" | "card" | "insurance" | "bank_transfer" | "unpaid";
export type InvoiceItemType = "consultation" | "procedure" | "medication" | "lab_test" | "room_charge" | "other";

export interface InvoiceItem {
  id: number;
  item_type: InvoiceItemType;
  description: string;
  quantity: number;
  unit_price: string;
  amount: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  patient: number;
  patient_name: string;
  patient_display_id: string;
  appointment: number | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  tax_rate_percent: string;
  discount_amount: string;
  amount_paid: string;
  payment_method: PaymentMethod;
  paid_at: string | null;
  notes: string;
  items: InvoiceItem[];
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  balance_due: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export type ClaimStatus = "submitted" | "under_review" | "approved" | "rejected" | "paid";

export interface InsuranceClaim {
  id: number;
  claim_number: string;
  invoice: number;
  invoice_number: string;
  patient: number;
  patient_name: string;
  insurance_provider: string;
  policy_number: string;
  claim_amount: string;
  approved_amount: string | null;
  status: ClaimStatus;
  submitted_at: string;
  processed_at: string | null;
  notes: string;
}

export interface FinancialSummary {
  invoice_count: number;
  total_collected: number;
  outstanding_balance: number;
  paid_invoice_count: number;
  overdue_invoice_count: number;
  monthly_revenue: { month: string; revenue: number }[];
}

// ---------------------------------------------------------------------------
// Labs
// ---------------------------------------------------------------------------
export type LabTestType =
  | "cbc" | "blood_glucose" | "lipid_panel" | "liver_function" | "kidney_function" | "thyroid_panel"
  | "electrolytes" | "urinalysis" | "coagulation" | "culture_sensitivity" | "xray" | "ct_scan" | "mri"
  | "covid_pcr" | "other";
export type LabPriority = "routine" | "urgent" | "stat";
export type LabRequestStatus = "requested" | "sample_collected" | "in_progress" | "completed" | "cancelled";

export interface LabResultParameter {
  id: number;
  parameter_name: string;
  value: string;
  unit: string;
  reference_range_low: string | null;
  reference_range_high: string | null;
  is_critical: boolean;
}

export interface LabResult {
  id: number;
  test_request: number;
  entered_by: number | null;
  entered_by_name: string;
  summary: string;
  attachment: string | null;
  is_reviewed_by_doctor: boolean;
  reviewed_at: string | null;
  entered_at: string;
  parameters: LabResultParameter[];
  has_critical_values: boolean;
}

export interface LabTestRequest {
  id: number;
  request_id: string;
  patient: number;
  patient_name: string;
  patient_display_id: string;
  requested_by: number | null;
  requested_by_name: string | null;
  test_type: LabTestType;
  priority: LabPriority;
  status: LabRequestStatus;
  clinical_notes: string;
  sample_collected_at: string | null;
  result: LabResult | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// AI assistant (ARIA)
// ---------------------------------------------------------------------------
export interface ChatMessage {
  id: number;
  session: number;
  role: "user" | "model";
  content: string;
  is_urgent: boolean;
  created_at: string;
  patient_name: string;
}

export interface ChatSession {
  id: number;
  title: string;
  is_active: boolean;
  patient_context: number | null;
  created_at: string;
  updated_at: string;
  last_message: { role: string; preview: string; created_at: string } | null;
  message_count: number;
  messages?: ChatMessage[];
}

export interface SendMessageResponse {
  session: ChatSession;
  message: ChatMessage;
}

// ---------------------------------------------------------------------------
// Dashboard stats endpoints
// ---------------------------------------------------------------------------
export interface PatientStats {
  total: number;
  admitted: number;
  outpatient: number;
  discharged: number;
}

export interface AppointmentStats {
  total: number;
  by_status: Record<string, number>;
}

export interface PharmacyStats {
  total_items: number;
  low_stock_count: number;
  inventory_value: number;
}

export interface LabStats {
  total: number;
  pending: number;
  stat_priority: number;
  completed_today: number;
}

export interface DoctorSchedule {
  availability: DoctorAvailability[];
  shifts: DoctorShift[];
}
