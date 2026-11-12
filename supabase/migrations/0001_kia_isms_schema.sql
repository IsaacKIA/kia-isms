-- ============================================================================
-- KIA INTERNATIONAL SERVICES MANAGEMENT SYSTEM (KIA-ISMS)
-- Authoritative PostgreSQL Schema & Internal Controls Migration
-- Compatible with Supabase PostgreSQL & Embedded PostgreSQL (PGlite)
-- ============================================================================

-- 1. SEQUENCES FOR IMMUTABLE HUMAN-READABLE REFERENCE CODES
CREATE SEQUENCE IF NOT EXISTS seq_client_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_case_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_job_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_study_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_match_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_interview_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_doc_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_visa_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_ticket_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_tour_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_invoice_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_payment_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_receipt_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_expense_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_journal_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_task_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_comm_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_partner_ref START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_staff_ref START WITH 20;

-- 2. REFERENCE TABLES: COUNTRIES & EXCHANGE RATES
CREATE TABLE IF NOT EXISTS countries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  region_continent TEXT NOT NULL,
  active_status TEXT NOT NULL DEFAULT 'Yes' CHECK (active_status IN ('Yes', 'No', 'Home Market')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  currency_code TEXT PRIMARY KEY,
  rate_to_ghs NUMERIC(14, 4) NOT NULL CHECK (rate_to_ghs > 0),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'Bank of Ghana / Market Rate',
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. STAFF & MULTI-ROLE RBAC
CREATE TABLE IF NOT EXISTS staff_users (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  primary_role TEXT NOT NULL,
  roles_json TEXT NOT NULL DEFAULT '[]', -- JSON array of assigned RBAC roles
  phone TEXT,
  email TEXT NOT NULL UNIQUE,
  branch TEXT NOT NULL DEFAULT 'Ajumako Head Office',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. EMPLOYERS & INTERNATIONAL PARTNERS
CREATE TABLE IF NOT EXISTS partners_employers (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  organization_name TEXT NOT NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('DIRECT EMPLOYER', 'RECRUITMENT AGENCY', 'UNIVERSITY', 'TRAVEL PARTNER', 'VISA PARTNER', 'AIRLINE', 'OTHER')),
  country TEXT NOT NULL,
  city TEXT,
  industry TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  verification_status TEXT NOT NULL DEFAULT 'Pending' CHECK (verification_status IN ('Verified', 'Pending', 'Unverified')),
  agreement_status TEXT NOT NULL DEFAULT 'Under Review' CHECK (agreement_status IN ('Signed', 'Under Review', 'Not Signed', 'Expired')),
  commission_terms TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. MASTER CLIENT REGISTRY (REGISTER ONCE, USE MANY SERVICES)
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  date_of_birth DATE,
  nationality TEXT NOT NULL DEFAULT 'Ghanaian',
  ghana_card_number TEXT,
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  whatsapp_number TEXT,
  email TEXT,
  residential_address TEXT,
  region TEXT,
  district TEXT,
  city_town TEXT,
  passport_available BOOLEAN NOT NULL DEFAULT FALSE,
  passport_number TEXT,
  passport_issue_date DATE,
  passport_expiry_date DATE,
  education_level TEXT NOT NULL DEFAULT 'SHS/WASSCE',
  institution TEXT,
  course_qualification TEXT,
  profession TEXT,
  current_occupation TEXT,
  years_of_experience INTEGER NOT NULL DEFAULT 0 CHECK (years_of_experience >= 0),
  skills TEXT,
  driving_license BOOLEAN NOT NULL DEFAULT FALSE,
  license_class TEXT,
  languages TEXT DEFAULT 'English',
  preferred_countries TEXT,
  preferred_sectors TEXT,
  preferred_job_types TEXT,
  minimum_salary_expectation NUMERIC(14, 2) DEFAULT 0,
  preferred_service TEXT NOT NULL DEFAULT 'WORK ABROAD',
  emergency_contact TEXT,
  referral_source TEXT,
  assigned_staff_id TEXT REFERENCES staff_users(id),
  assigned_staff_name TEXT,
  client_status TEXT NOT NULL DEFAULT 'NEW',
  last_contact_date DATE,
  next_follow_up_date DATE,
  notes TEXT,
  is_demo_record BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. SERVICE CASES (ONE CLIENT -> MANY SERVICE CASES)
CREATE TABLE IF NOT EXISTS service_cases (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_type TEXT NOT NULL CHECK (service_type IN ('WORK ABROAD', 'STUDY ABROAD', 'VISIT VISA', 'BUSINESS VISA', 'AIR TICKETING', 'TRAVEL CONSULTATION')),
  country TEXT NOT NULL,
  destination_summary TEXT NOT NULL,
  assigned_staff_id TEXT REFERENCES staff_users(id),
  assigned_staff_name TEXT,
  date_opened DATE NOT NULL DEFAULT CURRENT_DATE,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  case_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (case_status IN ('OPEN', 'IN PROGRESS', 'AWAITING CLIENT', 'AWAITING PARTNER', 'ON HOLD', 'COMPLETED', 'CANCELLED')),
  workflow_stage TEXT NOT NULL DEFAULT 'CLIENT_REGISTRATION',
  next_action TEXT,
  next_action_date DATE,
  expected_completion DATE,
  quoted_amount_ghs NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (quoted_amount_ghs >= 0),
  legacy_reported_paid_ghs NUMERIC(14, 2) DEFAULT 0, -- Retained for audit comparison against verified ledger receipts
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. WORK ABROAD: JOB OPPORTUNITIES
CREATE TABLE IF NOT EXISTS job_opportunities (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  date_added DATE NOT NULL DEFAULT CURRENT_DATE,
  country TEXT NOT NULL,
  city TEXT,
  partner_id TEXT REFERENCES partners_employers(id),
  employer_name TEXT NOT NULL,
  recruitment_partner TEXT,
  job_title TEXT NOT NULL,
  sector TEXT NOT NULL,
  job_description TEXT,
  employment_type TEXT NOT NULL DEFAULT 'Full-Time',
  gender_requirement TEXT NOT NULL DEFAULT 'Any' CHECK (gender_requirement IN ('Any', 'Male', 'Female')),
  minimum_age INTEGER,
  maximum_age INTEGER,
  minimum_height_male TEXT,
  minimum_height_female TEXT,
  education_requirement TEXT,
  experience_required_type TEXT DEFAULT 'Not Required',
  years_experience_required INTEGER NOT NULL DEFAULT 0,
  license_required BOOLEAN NOT NULL DEFAULT FALSE,
  license_type TEXT,
  pcc_required BOOLEAN NOT NULL DEFAULT FALSE,
  passport_required BOOLEAN NOT NULL DEFAULT TRUE,
  salary_minimum NUMERIC(14, 2),
  salary_maximum NUMERIC(14, 2),
  salary_currency TEXT NOT NULL DEFAULT 'AED',
  salary_period TEXT NOT NULL DEFAULT 'Monthly',
  overtime_available BOOLEAN DEFAULT FALSE,
  commission_available BOOLEAN DEFAULT FALSE,
  food_provided BOOLEAN DEFAULT FALSE,
  accommodation_provided BOOLEAN DEFAULT FALSE,
  transportation_provided BOOLEAN DEFAULT FALSE,
  medical_insurance BOOLEAN DEFAULT FALSE,
  resident_permit BOOLEAN DEFAULT TRUE,
  contract_duration TEXT DEFAULT '2 years',
  recruitment_fee_terms TEXT,
  vacancies_count INTEGER NOT NULL DEFAULT 10,
  interview_available BOOLEAN DEFAULT TRUE,
  interview_start_date DATE,
  interview_end_date DATE,
  interview_location TEXT DEFAULT 'Accra Office',
  interview_city TEXT DEFAULT 'Accra',
  interview_time TEXT,
  application_deadline DATE,
  recruitment_code TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  source_type TEXT DEFAULT 'Employer Direct',
  verification_status TEXT NOT NULL DEFAULT 'Verified' CHECK (verification_status IN ('Verified', 'Pending', 'Unverified')),
  opportunity_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (opportunity_status IN ('ACTIVE', 'FILLED', 'EXPIRED', 'ON HOLD', 'CANCELLED')),
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. WORK ABROAD: TRANSPARENT JOB MATCHING ENGINE
CREATE TABLE IF NOT EXISTS job_matches (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_case_id TEXT REFERENCES service_cases(id) ON DELETE SET NULL,
  opportunity_id TEXT NOT NULL REFERENCES job_opportunities(id) ON DELETE RESTRICT,
  match_score INTEGER NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  system_decision TEXT NOT NULL CHECK (system_decision IN ('ELIGIBLE', 'REQUIRES_REVIEW', 'NOT_ELIGIBLE')),
  legacy_eligibility_label TEXT NOT NULL, -- e.g. EXCELLENT MATCH, STRONG MATCH, POSSIBLE MATCH
  matched_requirements TEXT NOT NULL,
  missing_requirements TEXT NOT NULL,
  compliance_flags TEXT, -- Flags height/gender restrictions or expiring passport for human review
  score_breakdown_json TEXT NOT NULL, -- JSON breakdown of Age, Gender, Exp, Sector, Country, License, Edu, Passport
  override_decision TEXT CHECK (override_decision IN ('ELIGIBLE', 'REQUIRES_REVIEW', 'NOT_ELIGIBLE')),
  override_reason TEXT,
  overridden_by TEXT,
  match_status TEXT NOT NULL DEFAULT 'NEW MATCH',
  date_matched DATE NOT NULL DEFAULT CURRENT_DATE,
  candidate_notified BOOLEAN NOT NULL DEFAULT FALSE,
  date_notified DATE,
  notification_method TEXT,
  candidate_response TEXT,
  interest_status TEXT,
  application_status TEXT NOT NULL DEFAULT 'NOT SUBMITTED',
  interview_required BOOLEAN NOT NULL DEFAULT TRUE,
  interview_id TEXT,
  interview_status TEXT,
  selection_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (selection_status IN ('PENDING', 'SELECTED', 'NOT SELECTED', 'WAITLISTED')),
  rejection_reason TEXT,
  offer_status TEXT DEFAULT 'NONE' CHECK (offer_status IN ('NONE', 'ISSUED', 'ACCEPTED', 'DECLINED')),
  deployment_status TEXT DEFAULT 'NOT_STARTED',
  assigned_staff_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. WORK ABROAD: INTERVIEWS
CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  opportunity_id TEXT NOT NULL REFERENCES job_opportunities(id) ON DELETE RESTRICT,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  match_id TEXT REFERENCES job_matches(id) ON DELETE SET NULL,
  service_case_id TEXT REFERENCES service_cases(id) ON DELETE SET NULL,
  interview_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  location TEXT NOT NULL DEFAULT 'Accra Office',
  interview_type TEXT NOT NULL DEFAULT 'In-Person' CHECK (interview_type IN ('In-Person', 'Video Call', 'Phone')),
  instructions TEXT,
  contact_person TEXT,
  confirmation_status TEXT NOT NULL DEFAULT 'AWAITING CONFIRMATION' CHECK (confirmation_status IN ('CONFIRMED', 'AWAITING CONFIRMATION', 'NOT ATTENDING', 'RESCHEDULED')),
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  attendance_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (attendance_status IN ('PENDING', 'ATTENDED', 'NO SHOW', 'RESCHEDULED')),
  interview_result TEXT DEFAULT 'PENDING' CHECK (interview_result IN ('PENDING', 'PASS', 'FAIL', 'NO SHOW')),
  employer_feedback TEXT,
  selection_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (selection_status IN ('PENDING', 'SELECTED', 'NOT SELECTED', 'WAITLISTED')),
  next_step TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. STUDY ABROAD: OPPORTUNITIES & APPLICATIONS
CREATE TABLE IF NOT EXISTS study_opportunities (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  country TEXT NOT NULL,
  city TEXT,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL DEFAULT 'University',
  program_name TEXT NOT NULL,
  field_of_study TEXT NOT NULL,
  qualification_level TEXT NOT NULL,
  duration TEXT,
  tuition_fee NUMERIC(14, 2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  application_fee NUMERIC(14, 2) DEFAULT 0,
  intake_period TEXT,
  application_deadline DATE,
  scholarship_available BOOLEAN NOT NULL DEFAULT FALSE,
  scholarship_details TEXT,
  accommodation_available BOOLEAN NOT NULL DEFAULT FALSE,
  entry_requirements TEXT,
  english_requirement TEXT,
  financial_requirement TEXT,
  visa_requirement TEXT,
  institution_website TEXT,
  contact_person TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Closed', 'Upcoming')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_applications (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_case_id TEXT REFERENCES service_cases(id) ON DELETE SET NULL,
  study_opportunity_id TEXT NOT NULL REFERENCES study_opportunities(id) ON DELETE RESTRICT,
  workflow_stage TEXT NOT NULL DEFAULT 'ENQUIRY',
  application_date DATE DEFAULT CURRENT_DATE,
  submission_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (submission_status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ADMITTED', 'CONDITIONAL_OFFER', 'REJECTED', 'WITHDRAWN')),
  offer_accepted BOOLEAN DEFAULT FALSE,
  tuition_deposit_paid BOOLEAN DEFAULT FALSE,
  assigned_advisor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. DOCUMENTS & VERIFICATION VAULT
CREATE TABLE IF NOT EXISTS client_documents (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_case_id TEXT REFERENCES service_cases(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  document_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  is_missing BOOLEAN NOT NULL DEFAULT FALSE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_date DATE,
  verified_by TEXT,
  file_reference TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. VISA ASSISTANCE CASES
CREATE TABLE IF NOT EXISTS visa_cases (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_case_id TEXT REFERENCES service_cases(id) ON DELETE SET NULL,
  visa_type TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  visa_category TEXT,
  application_date DATE,
  appointment_date DATE,
  submission_date DATE,
  visa_status TEXT NOT NULL DEFAULT 'DOCUMENTS REQUIRED' CHECK (visa_status IN ('DOCUMENTS REQUIRED', 'READY FOR SUBMISSION', 'APPOINTMENT BOOKED', 'SUBMITTED', 'PROCESSING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'COMPLETED')),
  visa_number TEXT,
  approval_date DATE,
  expiry_date DATE,
  rejection_reason TEXT,
  next_action TEXT,
  assigned_officer TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. FLIGHTS & TOURISM
CREATE TABLE IF NOT EXISTS flight_bookings (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_case_id TEXT REFERENCES service_cases(id) ON DELETE SET NULL,
  airline TEXT NOT NULL,
  booking_reference TEXT,
  ticket_number TEXT,
  passenger_name TEXT NOT NULL,
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  supplier_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  client_fare NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GHS',
  payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED')),
  ticket_status TEXT NOT NULL DEFAULT 'QUOTED' CHECK (ticket_status IN ('QUOTED', 'BOOKED', 'ISSUED', 'CANCELLED', 'REFUNDED')),
  issued_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tour_bookings (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_case_id TEXT REFERENCES service_cases(id) ON DELETE SET NULL,
  package_name TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  supplier_name TEXT,
  start_date DATE,
  end_date DATE,
  supplier_cost_ghs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  client_price_ghs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  booking_status TEXT NOT NULL DEFAULT 'ENQUIRY' CHECK (booking_status IN ('ENQUIRY', 'QUOTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. FINANCIAL MANAGEMENT & DOUBLE-ENTRY ACCOUNTING LEDGER
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
  description TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_case_id TEXT REFERENCES service_cases(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  document_kind TEXT NOT NULL DEFAULT 'INVOICE' CHECK (document_kind IN ('QUOTATION', 'INVOICE', 'CREDIT_NOTE')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'GHS',
  exchange_rate_to_ghs NUMERIC(14, 4) NOT NULL DEFAULT 1.0000,
  total_amount_original NUMERIC(14, 2) NOT NULL CHECK (total_amount_original >= 0),
  total_amount_ghs NUMERIC(14, 2) NOT NULL CHECK (total_amount_ghs >= 0),
  revenue_recognition_mode TEXT NOT NULL DEFAULT 'EARNED_ON_INVOICE' CHECK (revenue_recognition_mode IN ('EARNED_ON_INVOICE', 'DEFERRED_ADVANCE')),
  status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('DRAFT', 'QUOTED', 'ISSUED', 'PARTIAL', 'PAID', 'VOID')),
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  receipt_number TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_case_id TEXT REFERENCES service_cases(id) ON DELETE SET NULL,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_original NUMERIC(14, 2) NOT NULL CHECK (amount_original > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  exchange_rate_to_ghs NUMERIC(14, 4) NOT NULL DEFAULT 1.0000,
  amount_ghs NUMERIC(14, 2) NOT NULL CHECK (amount_ghs > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Mobile Money', 'Bank Transfer', 'Card', 'Other')),
  transaction_reference TEXT,
  payment_type TEXT NOT NULL DEFAULT 'Registration Fee',
  payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PARTIAL', 'UNPAID', 'REFUNDED', 'REVERSED')),
  reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  reconciled_at TIMESTAMPTZ,
  reconciled_by TEXT,
  received_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  allocated_amount_ghs NUMERIC(14, 2) NOT NULL CHECK (allocated_amount_ghs > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operating_expenses (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  expense_account_code TEXT NOT NULL REFERENCES chart_of_accounts(code),
  payment_account_code TEXT NOT NULL REFERENCES chart_of_accounts(code),
  supplier_or_payee TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_original NUMERIC(14, 2) NOT NULL CHECK (amount_original > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  exchange_rate_to_ghs NUMERIC(14, 4) NOT NULL DEFAULT 1.0000,
  amount_ghs NUMERIC(14, 2) NOT NULL CHECK (amount_ghs > 0),
  payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PAYABLE')),
  recorded_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_module TEXT NOT NULL, -- INVOICE, PAYMENT, EXPENSE, REVERSAL, REVENUE_RECOGNITION
  source_id TEXT NOT NULL,
  description TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  exchange_rate NUMERIC(14, 4) NOT NULL DEFAULT 1.0000,
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  reversed_by_entry_id TEXT,
  posted_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY,
  journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL REFERENCES chart_of_accounts(code),
  debit_ghs NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (debit_ghs >= 0),
  credit_ghs NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (credit_ghs >= 0),
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  service_case_id TEXT REFERENCES service_cases(id) ON DELETE SET NULL,
  memo TEXT
);

-- 15. TASKS, COMMUNICATIONS, WORKFLOW AUTOMATION & AUDIT TRAIL
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  service_case_id TEXT REFERENCES service_cases(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  assigned_staff_name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'NOT STARTED' CHECK (status IN ('NOT STARTED', 'IN PROGRESS', 'COMPLETED', 'OVERDUE')),
  completed_date DATE,
  automation_source_event TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communications (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_case_id TEXT REFERENCES service_cases(id) ON DELETE SET NULL,
  comm_date DATE NOT NULL DEFAULT CURRENT_DATE,
  staff_name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('WhatsApp', 'Phone Call', 'SMS', 'Email', 'Walk-In', 'Internal Note', 'Other')),
  purpose TEXT NOT NULL,
  message_notes TEXT NOT NULL,
  outcome TEXT,
  delivery_verification TEXT NOT NULL DEFAULT 'MANUAL_LOG' CHECK (delivery_verification IN ('MANUAL_LOG', 'DEEP_LINK_OPENED', 'VERIFIED_API')),
  next_follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_events (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROCESSED' CHECK (status IN ('PROCESSED', 'SKIPPED_DUPLICATE', 'FAILED')),
  actions_taken_json TEXT NOT NULL DEFAULT '[]',
  error_message TEXT,
  triggered_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  details_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS migration_runs (
  id TEXT PRIMARY KEY,
  source_filename TEXT NOT NULL,
  run_mode TEXT NOT NULL CHECK (run_mode IN ('DRY_RUN', 'LIVE_COMMIT', 'ROLLED_BACK')),
  total_records_scanned INTEGER NOT NULL,
  valid_records INTEGER NOT NULL,
  warnings_count INTEGER NOT NULL,
  errors_count INTEGER NOT NULL,
  report_json TEXT NOT NULL,
  executed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
