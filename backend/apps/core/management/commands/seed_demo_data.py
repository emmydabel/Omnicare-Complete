"""
Populates a fresh database with one demo user per role plus enough sample
data (appointments, records, prescriptions, invoices, lab results...) that
every dashboard has something real to show. Safe to re-run — uses
get_or_create throughout instead of assuming an empty database.

Usage:  python manage.py seed_demo_data
"""
import random
from datetime import date, datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

DEMO_PASSWORD = "DemoPass123!"


class Command(BaseCommand):
    help = "Seed the database with demo users and sample clinical/operational data."

    def handle(self, *args, **options):
        User = get_user_model()

        from apps.appointments.models import Appointment
        from apps.billing.models import Invoice, InvoiceItem, InsuranceClaim
        from apps.doctors.models import DoctorAvailability, DoctorProfile, DoctorShift
        from apps.labs.models import LabResult, LabResultParameter, LabTestRequest
        from apps.medical_records.models import Allergy, MedicalRecord, VitalSign
        from apps.nurses.models import NurseProfile
        from apps.patients.models import PatientProfile
        from apps.pharmacists.models import PharmacistProfile
        from apps.pharmacy.models import Medicine, StockTransaction
        from apps.prescriptions.models import Prescription, PrescriptionItem

        self.stdout.write("Seeding OMNICARE demo data (OMNICARE Health Systems — Enugu, Nigeria)…")

        # --- Admin -----------------------------------------------------------
        admin_user, _ = User.objects.get_or_create(
            email="admin@omnicare.dev",
            defaults=dict(first_name="Amara", last_name="Okafor", role=User.Role.ADMIN, is_staff=True, is_superuser=True),
        )
        admin_user.set_password(DEMO_PASSWORD)
        admin_user.save()

        # --- Doctors -----------------------------------------------------------
        doctor_seed = [
            ("doctor@omnicare.dev", "Ngozi", "Eze", "Cardiology", "Cardiology", 12, "18000.00"),
            ("c.nwosu@omnicare.dev", "Chukwuemeka", "Nwosu", "General Medicine", "General Medicine", 8, "12000.00"),
            ("a.okonkwo@omnicare.dev", "Adaeze", "Okonkwo", "Pediatrics", "Pediatrics", 6, "13500.00"),
            ("i.obi@omnicare.dev", "Ikechukwu", "Obi", "Orthopedics", "Orthopedics", 15, "22000.00"),
        ]
        doctors = []
        for email, first, last, dept, spec, exp, fee in doctor_seed:
            user, created = User.objects.get_or_create(
                email=email, defaults=dict(first_name=first, last_name=last, role=User.Role.DOCTOR)
            )
            user.set_password(DEMO_PASSWORD)
            user.save()
            profile, _ = DoctorProfile.objects.get_or_create(
                user=user,
                defaults=dict(
                    specialization=spec, department=dept, years_of_experience=exp,
                    consultation_fee=fee, license_number=f"MD-{random.randint(10000,99999)}",
                    qualifications="MBBS, Board Certified", bio=f"Dr. {last} specializes in {spec.lower()}.",
                ),
            )
            doctors.append(profile)
            for weekday in (0, 1, 2, 3, 4):
                DoctorAvailability.objects.get_or_create(
                    doctor=profile, weekday=weekday,
                    defaults=dict(start_time=time(9, 0), end_time=time(17, 0)),
                )
            today = date.today()
            for offset in range(-2, 6):
                DoctorShift.objects.get_or_create(
                    doctor=profile, date=today + timedelta(days=offset),
                    defaults=dict(
                        shift_type=DoctorShift.ShiftType.MORNING, start_time=time(8, 0), end_time=time(16, 0),
                        department=dept, status=DoctorShift.Status.SCHEDULED,
                    ),
                )

        # --- Nurses -----------------------------------------------------------
        nurse_seed = [
            ("nurse@omnicare.dev", "Amaka", "Nwachukwu", "Emergency", "morning", "Ward A"),
            ("i.madu@omnicare.dev", "Ijeoma", "Madu", "ICU", "night", "ICU-1"),
        ]
        for email, first, last, dept, shift, ward in nurse_seed:
            user, _ = User.objects.get_or_create(
                email=email, defaults=dict(first_name=first, last_name=last, role=User.Role.NURSE)
            )
            user.set_password(DEMO_PASSWORD)
            user.save()
            NurseProfile.objects.get_or_create(
                user=user,
                defaults=dict(department=dept, shift=shift, assigned_ward=ward, years_of_experience=5,
                               license_number=f"RN-{random.randint(10000,99999)}"),
            )

        # --- Pharmacist -----------------------------------------------------------
        pharm_user, _ = User.objects.get_or_create(
            email="pharmacist@omnicare.dev",
            defaults=dict(first_name="Kelechi", last_name="Ibe", role=User.Role.PHARMACIST),
        )
        pharm_user.set_password(DEMO_PASSWORD)
        pharm_user.save()
        pharmacist_profile, _ = PharmacistProfile.objects.get_or_create(
            user=pharm_user, defaults=dict(license_number="RX-55210", years_of_experience=7, pharmacy_branch="Enugu Main Branch"),
        )

        # --- Patients -----------------------------------------------------------
        # (email, first, last, dob, gender, blood, address, phone, emergency_contact_first)
        patient_seed = [
            ("patient@omnicare.dev", "Chukwudi", "Okoye", date(1990, 4, 12), "male", "O+",
             "14 Ogui Road, Enugu, Enugu State", "+234 803 214 9876", "Ugochi"),
            ("n.ibekwe@example.com", "Nkechi", "Ibekwe", date(1985, 8, 3), "female", "A+",
             "27 Douglas Road, Owerri, Imo State", "+234 805 337 2210", "Emenike"),
            ("e.nwankwo@example.com", "Emeka", "Nwankwo", date(1972, 11, 20), "male", "B-",
             "9 New Market Road, Onitsha, Anambra State", "+234 807 119 4432", "Chinelo"),
            ("a.chukwu@example.com", "Adaobi", "Chukwu", date(2001, 2, 27), "female", "AB+",
             "5 Okpara Avenue, Enugu, Enugu State", "+234 802 173 6650", "Obiora"),
            ("u.onyema@example.com", "Uchenna", "Onyema", date(1958, 6, 15), "female", "O-",
             "18 Aba Road, Umuahia, Abia State", "+234 806 155 8823", "Ifeanyi"),
        ]
        patients = []
        for email, first, last, dob, gender, blood, address, phone, ec_first in patient_seed:
            user, _ = User.objects.get_or_create(
                email=email, defaults=dict(first_name=first, last_name=last, role=User.Role.PATIENT,
                                            phone_number=phone)
            )
            user.set_password(DEMO_PASSWORD)
            user.save()
            profile, _ = PatientProfile.objects.get_or_create(
                user=user,
                defaults=dict(
                    date_of_birth=dob, gender=gender, blood_group=blood,
                    address=address, emergency_contact_name=f"{ec_first} {last}",
                    emergency_contact_phone="+234 809 400 1122", insurance_provider="Hygeia HMO",
                    insurance_policy_number=f"POL-{random.randint(100000,999999)}",
                ),
            )
            patients.append(profile)

        patients[2].admit(ward="General Ward", bed_number="B-204", doctor=doctors[1])
        patients[4].admit(ward="ICU", bed_number="ICU-3", doctor=doctors[0])

        # --- Allergies & vitals -----------------------------------------------------------
        Allergy.objects.get_or_create(
            patient=patients[0], allergen="Penicillin",
            defaults=dict(reaction="Hives, swelling", severity=Allergy.Severity.SEVERE, noted_by=doctors[1].user),
        )
        Allergy.objects.get_or_create(
            patient=patients[1], allergen="Peanuts",
            defaults=dict(reaction="Anaphylaxis", severity=Allergy.Severity.SEVERE, noted_by=doctors[1].user),
        )
        nurse_user = User.objects.get(email="nurse@omnicare.dev")
        vitals_data = [
            (patients[0], 78, 120, 80, 36.8, 16, 98),
            (patients[2], 112, 95, 60, 38.9, 22, 91),  # critical: HR high, SpO2 low, temp high
            (patients[4], 92, 145, 92, 37.2, 20, 94),
        ]
        for patient, hr, sys_bp, dia_bp, temp, rr, spo2 in vitals_data:
            VitalSign.objects.create(
                patient=patient, recorded_by=nurse_user,
                heart_rate=hr, blood_pressure_systolic=sys_bp, blood_pressure_diastolic=dia_bp,
                temperature_celsius=temp, respiratory_rate=rr, oxygen_saturation=spo2,
            )

        # --- Medical records -----------------------------------------------------------
        MedicalRecord.objects.get_or_create(
            patient=patients[0], doctor=doctors[0], visit_date=date.today() - timedelta(days=14),
            record_type=MedicalRecord.RecordType.DIAGNOSIS,
            defaults=dict(diagnosis="Essential hypertension (I10)", treatment_plan="Lifestyle changes + lisinopril 10mg daily",
                          doctor_notes="Patient reports occasional headaches. BP trending down since last visit.",
                          icd_code="I10"),
        )
        MedicalRecord.objects.get_or_create(
            patient=patients[2], doctor=doctors[1], visit_date=date.today() - timedelta(days=2),
            record_type=MedicalRecord.RecordType.PROGRESS_NOTE,
            defaults=dict(diagnosis="Community-acquired pneumonia", treatment_plan="IV antibiotics, monitor O2 sat",
                          doctor_notes="Admitted for observation. Chest X-ray shows right lower lobe infiltrate."),
        )

        # --- Appointments -----------------------------------------------------------
        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        appt_specs = [
            (patients[0], doctors[0], now + timedelta(days=1, hours=2), Appointment.Status.CONFIRMED, "Follow-up: blood pressure check"),
            (patients[1], doctors[1], now + timedelta(days=1, hours=4), Appointment.Status.SCHEDULED, "Annual physical"),
            (patients[3], doctors[2], now + timedelta(days=2, hours=1), Appointment.Status.SCHEDULED, "Vaccination"),
            (patients[0], doctors[3], now - timedelta(days=5), Appointment.Status.COMPLETED, "Knee pain evaluation"),
            (patients[4], doctors[0], now - timedelta(hours=3), Appointment.Status.IN_PROGRESS, "Cardiac consult — admitted patient"),
            (patients[2], doctors[1], now - timedelta(days=1), Appointment.Status.COMPLETED, "Pneumonia admission workup"),
            (patients[1], doctors[0], now - timedelta(days=10), Appointment.Status.CANCELLED, "Routine checkup"),
        ]
        appointments = []
        for patient, doctor, start, status, reason in appt_specs:
            appt, _ = Appointment.objects.get_or_create(
                patient=patient, doctor=doctor, scheduled_start=start,
                defaults=dict(scheduled_end=start + timedelta(minutes=30), status=status, reason=reason,
                              created_by=admin_user, visit_type=Appointment.VisitType.CONSULTATION),
            )
            appointments.append(appt)

        # --- Pharmacy inventory (prices in Naira) --------------------------------------
        medicine_seed = [
            ("Amoxicillin", "Amoxicillin", Medicine.Category.ANTIBIOTIC, "500mg", 320, 50, "850.00"),
            ("Lisinopril", "Lisinopril", Medicine.Category.CARDIOVASCULAR, "10mg", 210, 40, "600.00"),
            ("Ibuprofen", "Ibuprofen", Medicine.Category.ANALGESIC, "200mg", 15, 100, "350.00"),  # low stock
            ("Metformin", "Metformin HCl", Medicine.Category.ENDOCRINE, "500mg", 180, 60, "550.00"),
            ("Salbutamol Inhaler", "Salbutamol", Medicine.Category.RESPIRATORY, "100mcg", 8, 25, "2200.00"),  # low stock
            ("Omeprazole", "Omeprazole", Medicine.Category.GASTROINTESTINAL, "20mg", 150, 40, "750.00"),
            ("Atorvastatin", "Atorvastatin", Medicine.Category.CARDIOVASCULAR, "20mg", 95, 30, "1100.00"),
            ("Paracetamol", "Acetaminophen", Medicine.Category.ANALGESIC, "500mg", 500, 100, "150.00"),
            ("Insulin Glargine", "Insulin Glargine", Medicine.Category.ENDOCRINE, "100u/mL", 12, 20, "8500.00"),  # low stock
            ("Vitamin D3", "Cholecalciferol", Medicine.Category.VITAMIN_SUPPLEMENT, "1000IU", 240, 50, "650.00"),
        ]
        medicines = []
        for name, generic, cat, strength, qty, reorder, price in medicine_seed:
            med, _ = Medicine.objects.get_or_create(
                name=name,
                defaults=dict(generic_name=generic, category=cat, strength=strength, stock_quantity=qty,
                              reorder_level=reorder, unit_price=price, manufacturer="Emzor Pharmaceuticals",
                              expiry_date=date.today() + timedelta(days=random.randint(90, 700))),
            )
            medicines.append(med)

        # --- Prescriptions -----------------------------------------------------------
        rx1, _ = Prescription.objects.get_or_create(
            patient=patients[0], doctor=doctors[0], defaults=dict(status=Prescription.Status.PENDING)
        )
        PrescriptionItem.objects.get_or_create(
            prescription=rx1, medicine=medicines[1],
            defaults=dict(dosage="10mg", frequency="Once daily", duration_days=30, quantity=30, instructions="Take in the morning"),
        )
        rx2, _ = Prescription.objects.get_or_create(
            patient=patients[2], doctor=doctors[1], defaults=dict(status=Prescription.Status.PENDING)
        )
        PrescriptionItem.objects.get_or_create(
            prescription=rx2, medicine=medicines[0],
            defaults=dict(dosage="500mg", frequency="Three times daily", duration_days=7, quantity=21, instructions="Take with food"),
        )

        # --- Billing (amounts in Naira) -------------------------------------------------
        inv1, created = Invoice.objects.get_or_create(
            patient=patients[0], appointment=appointments[3],
            defaults=dict(status=Invoice.Status.PAID, tax_rate_percent="7.50", created_by=admin_user,
                          payment_method=Invoice.PaymentMethod.CARD, amount_paid="95000.00"),
        )
        if created:
            InvoiceItem.objects.create(invoice=inv1, item_type="consultation", description="Orthopedic consultation", quantity=1, unit_price="22000.00")
            InvoiceItem.objects.create(invoice=inv1, item_type="procedure", description="Knee X-ray", quantity=1, unit_price="9500.00")
            inv1.amount_paid = inv1.total_amount
            inv1.status = Invoice.Status.PAID
            inv1.save()

        inv2, created = Invoice.objects.get_or_create(
            patient=patients[2], appointment=appointments[5],
            defaults=dict(status=Invoice.Status.PENDING, tax_rate_percent="7.50", created_by=admin_user,
                          due_date=date.today() + timedelta(days=14)),
        )
        if created:
            InvoiceItem.objects.create(invoice=inv2, item_type="room_charge", description="General ward — 2 nights", quantity=2, unit_price="45000.00")
            InvoiceItem.objects.create(invoice=inv2, item_type="medication", description="IV antibiotics course", quantity=1, unit_price="38000.00")
            InsuranceClaim.objects.get_or_create(
                invoice=inv2, patient=patients[2],
                defaults=dict(insurance_provider=patients[2].insurance_provider or "Hygeia HMO",
                              policy_number=patients[2].insurance_policy_number or "POL-000000",
                              claim_amount=inv2.total_amount, status=InsuranceClaim.Status.UNDER_REVIEW),
            )

        # --- Lab results -----------------------------------------------------------
        lab1, _ = LabTestRequest.objects.get_or_create(
            patient=patients[2], requested_by=doctors[1], test_type=LabTestRequest.TestType.CBC,
            defaults=dict(priority=LabTestRequest.Priority.URGENT, status=LabTestRequest.Status.COMPLETED,
                          clinical_notes="Rule out infection severity"),
        )
        result1, created = LabResult.objects.get_or_create(
            test_request=lab1, defaults=dict(entered_by=admin_user, summary="Elevated WBC consistent with active infection.")
        )
        if created:
            LabResultParameter.objects.create(result=result1, parameter_name="White Blood Cell Count", value="14.8", unit="x10^9/L", reference_range_low=4.0, reference_range_high=11.0)
            LabResultParameter.objects.create(result=result1, parameter_name="Hemoglobin", value="13.1", unit="g/dL", reference_range_low=12.0, reference_range_high=17.0)
            LabResultParameter.objects.create(result=result1, parameter_name="Platelets", value="410", unit="x10^9/L", reference_range_low=150, reference_range_high=400)

        lab2, _ = LabTestRequest.objects.get_or_create(
            patient=patients[0], requested_by=doctors[0], test_type=LabTestRequest.TestType.LIPID_PANEL,
            defaults=dict(priority=LabTestRequest.Priority.ROUTINE, status=LabTestRequest.Status.REQUESTED,
                          clinical_notes="Annual cardiovascular risk screening"),
        )
        lab3, _ = LabTestRequest.objects.get_or_create(
            patient=patients[4], requested_by=doctors[0], test_type=LabTestRequest.TestType.ELECTROLYTES,
            defaults=dict(priority=LabTestRequest.Priority.STAT, status=LabTestRequest.Status.IN_PROGRESS,
                          clinical_notes="ICU monitoring"),
        )

        self.stdout.write(self.style.SUCCESS(
            "\nDone. Demo accounts (password for all: %s):\n"
            "  Admin       admin@omnicare.dev\n"
            "  Doctor      doctor@omnicare.dev\n"
            "  Nurse       nurse@omnicare.dev\n"
            "  Pharmacist  pharmacist@omnicare.dev\n"
            "  Patient     patient@omnicare.dev\n" % DEMO_PASSWORD
        ))
