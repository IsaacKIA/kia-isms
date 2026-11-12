# KIA-ISMS (KIA-Start Up Consult — International Services Management System)

Production-ready, secure, responsive, integrated business management application for **KIA-Start Up Consult**, operating out of Ajumako and Greater Accra, Ghana.

**Live Business Website:** https://travels.kiastartupconsult.com  
**Operating Currency:** Ghana Cedi (GHS / ₵)  

---

## 1. System Overview & Architecture

KIA-ISMS transforms the 18-sheet legacy Excel workbook into a secure, transactional, database-backed enterprise system:
- **Architecture:** Modular Monolith built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **PostgreSQL** (Supabase-compatible schema + embedded PGlite persistence for zero-dependency local runs).
- **Core Entities:** Master Client Database (`clients`), Service Cases (`service_cases`), Job Opportunities & Employers (`job_opportunities`, `partners_employers`), Job Matches (`job_matches`), Interviews (`interviews`), Documents & Visas (`client_documents`, `visa_cases`), Flights & Tours (`flight_bookings`, `tour_bookings`), Double-Entry Ledger (`chart_of_accounts`, `invoices`, `payments`, `journal_entries`, `journal_lines`), Tasks & Follow-ups (`tasks`, `communications`), and Audit Logs (`audit_logs`, `workflow_events`).

---

## 2. Key Business Problem Corrections Over Legacy Excel

1. **Elimination of Row-Number Primary Keys:**  
   Replaced formula-based IDs (`ROW()-1`) with sequence-driven immutable reference codes (`KSC-000001`, `CASE-000001`, `JOB-000001`, `INT-000001`, `PAY-000001`, `DOC-000001`, `VISA-000001`, `TKT-000001`). Sorting or editing rows never corrupts foreign-key linkages.
2. **Resolution of the GHS 300 Unreceipted Discrepancy on `CASE-000004`:**  
   In the legacy workbook, `CASE-000004` (Efua Baiden) manually reported GHS 300 paid while the `Payments` sheet contained zero matching receipts. KIA-ISMS derives balances authoritatively from verified receipts (GHS 2,100 verified), flags the GHS 300 variance in the Dry-Run Validator, and maintains an exact double-entry trial balance.
3. **Ordinal Education Hierarchy:**  
   Fixed the Excel exact-string matching bug (`AI2=AR2`) where candidates holding Higher National Diplomas (HND) or Bachelor's Degrees were penalized when applying for Basic/SHS positions.
4. **Passport Expiry & Document Gating:**  
   Fixed the bug where Candidate `KSC-000005` with an expired passport (`2026-03-14`) was awarded 5/5 readiness points and scheduled for an interview. KIA-ISMS flags expired documents as `REQUIRES_REVIEW` and strictly prevents case progression to `VISA_PROCESSING` or `DEPLOYMENT` without a valid passport or authorized override.
5. **Multi-Service Single Master Client Registry:**  
   Clients register once; subsequent requests for Work Abroad, Study Abroad, Visas, or Flights attach to their single profile with full deduplication on phone, passport, and Ghana Card numbers.

---

## 3. Quick Start & Execution

```bash
# Navigate to the workspace
cd "C:\Users\kiast\.gemini\antigravity\scratch\kia-isms"

# Install dependencies
npm install

# Run all 6 End-to-End Scenarios & Internal Control Tests
npm run test:e2e

# Start the interactive web development server
npm run dev
# -> Open http://localhost:3000 in your browser
```

---

## 4. End-to-End Verification Scenarios

Run `npm run test:e2e` to verify:
- **Scenario 1 (Work Abroad):** Client Registration → Case Creation → Transparent Matching → Interview Scheduling → Selection Recording → Document Verification → Visa Processing → Flight Issuance → Case Closure.
- **Scenario 2 (Study Abroad):** Student Registration → University Application → Admission Decision → Offer Acceptance → Visa Preparation → Case Completion.
- **Scenario 3 (Financial Ledger):** Invoicing → Partial MoMo Payment → Balance Settlement → Reconciliation → Balanced Double-Entry General Ledger (`SUM(Debit) == SUM(Credit)`).
- **Scenario 4 (Rejected Candidate):** Failed interview preserves complete history and unlocks alternative vacancy matching.
- **Scenario 5 (Multiple Services):** Client registration deduplication enforces one master ID with multiple linked service cases.
- **Scenario 6 (Internal Controls & RBAC):** Role enforcement blocks unauthorized payment recording and document gates prevent expired passports from entering visa processing.
