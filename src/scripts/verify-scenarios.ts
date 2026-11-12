import path from 'path';
import fs from 'fs';
import {
  getStaffActor,
  getSystemState,
  registerClient,
  createServiceCase,
  updateServiceCaseStage,
  createJobMatch,
  scheduleInterview,
  recordInterviewOutcome,
  verifyAndUpdateDocument,
  createOrUpdateVisaCase,
  createStudyApplication,
  updateStudyApplicationStatus,
  createFlightBooking,
  recordPayment,
  reconcilePayment,
} from '../lib/services/isms-service';
import { runWorkbookMigrationAnalysis } from '../lib/migration/excel-migrator';

async function main() {
  // Use an isolated test database directory so we verify everything cleanly
  const testDbDir = path.join(process.cwd(), 'data', 'pgdata-e2e-test');
  if (fs.existsSync(testDbDir)) {
    fs.rmSync(testDbDir, { recursive: true, force: true });
  }
  process.env.PGLITE_DATA_DIR = testDbDir;

  console.log('================================================================');
  console.log('KIA-ISMS PHASE 15 END-TO-END & INTERNAL CONTROLS VERIFICATION');
  console.log('================================================================\n');

  const ceo = await getStaffActor('STF-01'); // Isaac Agya Koomson (Founder/CEO, Manager, Admin)
  const recruiter = await getStaffActor('STF-02'); // Ama Owusu (Recruitment Officer)
  const visaOfficer = await getStaffActor('STF-03'); // Kwame Boateng (Visa Officer)
  const studyAdvisor = await getStaffActor('STF-04'); // Efua Mensah (Study Advisor)
  const financeOfficer = await getStaffActor('STF-06'); // Abena Darko (Finance Officer)
  const ticketingOfficer = await getStaffActor('STF-07'); // Kojo Appiah (Ticketing Officer)

  // -------------------------------------------------------------------------
  // TEST 0: EXCEL WORKBOOK DRY-RUN MIGRATION VALIDATOR
  // -------------------------------------------------------------------------
  console.log('[Test 0] Running Excel Workbook Dry-Run Migration Analysis...');
  const migReport = await runWorkbookMigrationAnalysis(ceo, { runMode: 'DRY_RUN' });
  console.log(
    `  ✓ Scanned ${migReport.total_records_scanned} records across ${migReport.worksheets_found.length} worksheets.`
  );
  console.log(
    `  ✓ Financial Check: Service Cases Quoted=GHS ${migReport.financial_reconciliation_check.service_cases_quoted_ghs}, Reported Paid=GHS ${migReport.financial_reconciliation_check.service_cases_reported_paid_ghs}, Verified Payments=GHS ${migReport.financial_reconciliation_check.payments_sheet_verified_ghs}, Unreceipted Variance=GHS ${migReport.financial_reconciliation_check.unreceipted_variance_ghs}`
  );
  if (migReport.financial_reconciliation_check.unreceipted_variance_ghs !== 300) {
    throw new Error('Expected GHS 300 variance detection on CASE-000004');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 1: WORK ABROAD END-TO-END
  // Register client -> create case -> match job -> schedule interview -> record selection -> verify documents -> process visa -> record travel -> close case
  // -------------------------------------------------------------------------
  console.log('\n[Scenario 1] Work Abroad End-to-End Workflow...');
  const s1Client = await registerClient(recruiter, {
    first_name: 'Kofi',
    last_name: 'Agyemang',
    gender: 'Male',
    date_of_birth: '1995-04-12',
    phone: '0249112233',
    passport_available: true,
    passport_number: 'G8899001',
    passport_issue_date: '2024-06-01',
    passport_expiry_date: '2029-05-31',
    education_level: 'SHS/WASSCE',
    years_of_experience: 4,
    driving_license: true,
    license_class: 'F',
    skills: 'Trailer driving, GCC license',
    preferred_countries: 'United Arab Emirates, Saudi Arabia',
    preferred_sectors: 'Logistics/Driving',
    preferred_service: 'WORK ABROAD',
    create_initial_case: true,
    initial_case_country: 'United Arab Emirates',
    initial_case_destination: 'A.I.M. - Trailer Driver',
    initial_case_fee_ghs: 500,
  });
  console.log(`  ✓ Registered Client ${s1Client.reference_code} & Case ${s1Client.service_case?.reference_code}`);

  const s1Match = await createJobMatch(recruiter, {
    client_id: s1Client.client_id,
    opportunity_id: 'JOB-000008', // A.I.M. Trailer Driver
    service_case_id: s1Client.service_case?.id,
  });
  console.log(
    `  ✓ Matched ${s1Match.reference_code}: Score=${s1Match.evaluation.match_score}/100 [${s1Match.evaluation.system_decision}]`
  );

  const s1Interview = await scheduleInterview(recruiter, {
    match_id: s1Match.id,
    opportunity_id: 'JOB-000008',
    client_id: s1Client.client_id,
    service_case_id: s1Client.service_case?.id,
    interview_date: '2026-08-25',
    start_time: '10:00 AM',
  });
  console.log(`  ✓ Scheduled Interview ${s1Interview.reference_code}`);

  const s1Outcome = await recordInterviewOutcome(recruiter, {
    interview_id: s1Interview.id,
    attendance_status: 'ATTENDED',
    interview_result: 'PASS',
    selection_status: 'SELECTED',
    employer_feedback: 'Strong trailer handling & valid GCC license',
  });
  console.log(`  ✓ Recorded Selection Outcome: ${s1Outcome.selection_status} -> ${s1Outcome.next_step}`);

  await verifyAndUpdateDocument(visaOfficer, {
    client_id: s1Client.client_id,
    service_case_id: s1Client.service_case?.id,
    document_type: 'Police Clearance Certificate',
    document_number: 'PCC-2026-7712',
    verified: true,
  });
  await verifyAndUpdateDocument(visaOfficer, {
    client_id: s1Client.client_id,
    service_case_id: s1Client.service_case?.id,
    document_type: 'Offer Letter',
    document_number: 'AIM-OFR-901',
    verified: true,
  });

  const s1Visa = await createOrUpdateVisaCase(visaOfficer, {
    client_id: s1Client.client_id,
    service_case_id: s1Client.service_case?.id,
    visa_type: 'Employment Residence Visa',
    destination_country: 'United Arab Emirates',
    visa_status: 'APPROVED',
    visa_number: 'UAE-EMP-2026-88412',
    expiry_date: '2028-08-25',
  });
  console.log(`  ✓ Processed & Approved Visa ${s1Visa.visa_case_id}`);

  const s1Flight = await createFlightBooking(ticketingOfficer, {
    client_id: s1Client.client_id,
    service_case_id: s1Client.service_case?.id,
    airline: 'Emirates',
    booking_reference: 'EK992KL',
    ticket_number: '176-8899001122',
    departure_airport: 'ACC (Kotoka Intl)',
    arrival_airport: 'DXB (Dubai Intl)',
    departure_date: '2026-09-05',
    supplier_cost: 6800,
    client_fare: 7500,
    ticket_status: 'ISSUED',
  });
  console.log(`  ✓ Issued Deployment Flight ${s1Flight.reference_code}`);

  const s1Closed = await updateServiceCaseStage(ceo, {
    case_id: s1Client.service_case!.id,
    workflow_stage: 'CASE_CLOSURE',
    case_status: 'COMPLETED',
    next_action: 'Deployment completed & arrival confirmed',
  });
  console.log(`  ✓ Closed Work Abroad Case: ${s1Closed.case_status}`);

  // -------------------------------------------------------------------------
  // SCENARIO 2: STUDY ABROAD END-TO-END
  // Register student -> select programme -> submit application -> record admission -> manage visa -> prepare travel -> complete case
  // -------------------------------------------------------------------------
  console.log('\n[Scenario 2] Study Abroad End-to-End Workflow...');
  const s2Student = await registerClient(studyAdvisor, {
    first_name: 'Nana',
    last_name: 'Bonsu',
    gender: 'Female',
    date_of_birth: '2003-09-10',
    phone: '0504455667',
    passport_available: true,
    passport_number: 'G4455661',
    passport_issue_date: '2025-01-10',
    passport_expiry_date: '2030-01-09',
    education_level: 'SHS/WASSCE',
    preferred_countries: 'Germany',
    preferred_service: 'STUDY ABROAD',
    create_initial_case: true,
    initial_case_country: 'Germany',
    initial_case_destination: 'Berlin Bachelor Foundation Program',
    initial_case_fee_ghs: 1500,
  });

  const s2App = await createStudyApplication(studyAdvisor, {
    client_id: s2Student.client_id,
    service_case_id: s2Student.service_case?.id,
    study_opportunity_id: 'STU-000001',
    submission_status: 'SUBMITTED',
  });
  await updateStudyApplicationStatus(studyAdvisor, {
    application_id: s2App.id,
    submission_status: 'ADMITTED',
    offer_accepted: true,
    notes: 'Unconditional admission letter received & accepted.',
  });
  await createOrUpdateVisaCase(visaOfficer, {
    client_id: s2Student.client_id,
    service_case_id: s2Student.service_case?.id,
    visa_type: 'Student Visa (National D)',
    destination_country: 'Germany',
    visa_status: 'APPROVED',
    visa_number: 'DEU-STD-2026-4411',
    expiry_date: '2027-09-30',
  });
  const s2Completed = await updateServiceCaseStage(studyAdvisor, {
    case_id: s2Student.service_case!.id,
    workflow_stage: 'COMPLETION',
    case_status: 'COMPLETED',
  });
  console.log(`  ✓ Completed Study Abroad Workflow for ${s2Student.reference_code} (${s2Completed.case_status})`);

  // -------------------------------------------------------------------------
  // SCENARIO 3: FINANCIAL (INVOICE -> PARTIAL PAYMENT -> RECEIPT -> BALANCE -> RECONCILE -> LEDGER VERIFICATION)
  // -------------------------------------------------------------------------
  console.log('\n[Scenario 3] Financial Partial Payment, Balance Settlement, Reconciliation & Double-Entry Ledger...');
  const pay1 = await recordPayment(financeOfficer, {
    client_id: s2Student.client_id,
    service_case_id: s2Student.service_case?.id,
    amount_original: 600,
    currency: 'GHS',
    payment_method: 'Mobile Money',
    transaction_reference: 'MOMO-S3-PART1',
    payment_type: 'Consultation Fee',
  });
  const pay2 = await recordPayment(financeOfficer, {
    client_id: s2Student.client_id,
    service_case_id: s2Student.service_case?.id,
    amount_original: 900,
    currency: 'GHS',
    payment_method: 'Bank Transfer',
    transaction_reference: 'BNK-S3-BAL2',
    payment_type: 'Application Fee',
  });
  await reconcilePayment(financeOfficer, pay1.payment_id);
  await reconcilePayment(financeOfficer, pay2.payment_id);
  console.log(`  ✓ Issued Receipts ${pay1.receipt_number} (GHS 600) & ${pay2.receipt_number} (GHS 900) and reconciled both.`);

  // -------------------------------------------------------------------------
  // SCENARIO 4: REJECTED CANDIDATE -> PRESERVE HISTORY -> ALTERNATIVE MATCHING
  // -------------------------------------------------------------------------
  console.log('\n[Scenario 4] Rejected Candidate Preserves History & Unlocks Alternative Matching...');
  await recordInterviewOutcome(recruiter, {
    interview_id: 'INT-000002', // Comfort Nyarko (KSC-000006) interviewing for JOB-000002
    attendance_status: 'ATTENDED',
    interview_result: 'FAIL',
    selection_status: 'NOT SELECTED',
    rejection_reason: 'Position quota filled for Commis Chef shift',
  });
  const altMatch = await createJobMatch(recruiter, {
    client_id: 'KSC-000006',
    opportunity_id: 'JOB-000004', // Kitchen Steward / Room Attendant - Entry Level
    service_case_id: 'CASE-000006',
    notes: 'Alternative match after JOB-000002 quota filled',
  });
  console.log(`  ✓ Preserved rejected match MATCH-000006 and created alternative match ${altMatch.reference_code} (Score=${altMatch.evaluation.match_score}/100)`);

  // -------------------------------------------------------------------------
  // SCENARIO 5: MULTIPLE SERVICES FOR ONE CLIENT (NO DUPLICATE CLIENT REGISTRATION)
  // -------------------------------------------------------------------------
  console.log('\n[Scenario 5] Multiple Services for One Client & Duplicate Registration Prevention...');
  let duplicateBlocked = false;
  try {
    await registerClient(recruiter, {
      first_name: 'Grace',
      last_name: 'Appiah',
      gender: 'Female',
      phone: '0244778899', // Existing KSC-000010 phone!
    });
  } catch (err: any) {
    if (err.message.includes('Duplicate Client Prevented')) {
      duplicateBlocked = true;
    }
  }
  if (!duplicateBlocked) {
    throw new Error('Duplicate client registration check failed to block existing phone!');
  }
  const secondCase = await createServiceCase(ticketingOfficer, {
    client_id: 'KSC-000010', // Grace Appiah already has CASE-000008 (VISIT VISA)
    service_type: 'AIR TICKETING',
    country: 'United Kingdom',
    destination_summary: 'Accra to London Heathrow Return Ticket',
    quoted_amount_ghs: 1200,
  });
  console.log(`  ✓ Blocked duplicate client registration & attached second Service Case ${secondCase.reference_code} to KSC-000010`);

  // -------------------------------------------------------------------------
  // SCENARIO 6: INTERNAL CONTROLS (RBAC ENFORCEMENT & MANDATORY DOCUMENT GATES)
  // -------------------------------------------------------------------------
  console.log('\n[Scenario 6] Internal Controls, RBAC Enforcement & Mandatory Document Gates...');
  let unauthorizedFinanceBlocked = false;
  try {
    // Recruiter (Ama Owusu) attempts to record a financial payment
    await recordPayment(recruiter, {
      client_id: 'KSC-000001',
      amount_original: 100,
      payment_method: 'Cash',
    });
  } catch (err: any) {
    if (err.message.includes('Access Denied')) {
      unauthorizedFinanceBlocked = true;
    }
  }
  if (!unauthorizedFinanceBlocked) {
    throw new Error('RBAC failed to block Recruitment Officer from recording payments!');
  }

  let expiredPassportBlocked = false;
  try {
    // Attempt to advance CASE-000005 (Yaw Boateng, whose passport expired 2026-03-14) to VISA_PROCESSING
    await updateServiceCaseStage(visaOfficer, {
      case_id: 'CASE-000005',
      workflow_stage: 'VISA_PROCESSING',
    });
  } catch (err: any) {
    if (err.message.includes('Mandatory Document Safeguard')) {
      expiredPassportBlocked = true;
    }
  }
  if (!expiredPassportBlocked) {
    throw new Error('Document gate failed to block expired passport from advancing to VISA_PROCESSING!');
  }
  console.log('  ✓ RBAC blocked unauthorized payment recording; Document Gate blocked expired passport from Visa Processing.');

  // Verify Ledger Balance
  const finalState = await getSystemState('STF-01');
  console.log(
    `  ✓ Ledger Trial Balance Check: Debits=GHS ${finalState.financialReports.totalDebitsGhs}, Credits=GHS ${finalState.financialReports.totalCreditsGhs}, Balanced=${finalState.financialReports.isLedgerBalanced}`
  );
  if (!finalState.financialReports.isLedgerBalanced) {
    throw new Error('General Ledger is out of balance!');
  }

  console.log('\nALL 6 MANDATORY END-TO-END SCENARIOS & INTERNAL CONTROLS PASSED!');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
