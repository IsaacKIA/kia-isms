import crypto from 'crypto';
import { getDb, nextReferenceCode, normalizePhone } from '../db';
import {
  AuthenticatedActor,
  assertPermission,
  mapWorkbookRoleToSystemRoles,
  SystemRole,
} from '../auth/rbac';
import {
  calculateAge,
  evaluateCandidateMatch,
  getPassportStatus,
} from '../matching/engine';

export async function getStaffActor(staffId = 'STF-01'): Promise<AuthenticatedActor> {
  const db = await getDb();
  const res = await db.query<any>('SELECT * FROM staff_users WHERE id = $1 OR reference_code = $1 LIMIT 1', [staffId]);
  const row = res.rows[0];
  if (!row) {
    const fallback = await db.query<any>('SELECT * FROM staff_users ORDER BY reference_code ASC LIMIT 1');
    const fb = fallback.rows[0];
    const roles: SystemRole[] = JSON.parse(fb.roles_json || '["FOUNDER_CEO"]');
    return {
      id: fb.id,
      reference_code: fb.reference_code,
      full_name: fb.full_name,
      email: fb.email,
      primary_role: fb.primary_role as SystemRole,
      roles,
      branch: fb.branch,
    };
  }
  const roles: SystemRole[] = JSON.parse(row.roles_json || '[]');
  return {
    id: row.id,
    reference_code: row.reference_code,
    full_name: row.full_name,
    email: row.email,
    primary_role: (row.primary_role as SystemRole) || roles[0] || 'RECRUITMENT_OFFICER',
    roles: roles.length ? roles : mapWorkbookRoleToSystemRoles(row.primary_role),
    branch: row.branch,
  };
}

export async function writeAuditLog(
  actor: AuthenticatedActor,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
  details?: Record<string, any>
): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO audit_logs (id, actor_name, actor_role, action, entity_type, entity_id, summary, details_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      `AUD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      actor.full_name,
      actor.primary_role,
      action,
      entityType,
      entityId,
      summary,
      details ? JSON.stringify(details) : null,
    ]
  );
}

export async function emitWorkflowEvent(
  actor: AuthenticatedActor,
  idempotencyKey: string,
  eventType: string,
  entityType: string,
  entityId: string,
  handler: () => Promise<string[]>
): Promise<{ status: 'PROCESSED' | 'SKIPPED_DUPLICATE'; actions: string[] }> {
  const db = await getDb();
  const existing = await db.query<any>(
    'SELECT * FROM workflow_events WHERE idempotency_key = $1 LIMIT 1',
    [idempotencyKey]
  );
  if (existing.rows.length > 0) {
    return {
      status: 'SKIPPED_DUPLICATE',
      actions: JSON.parse(existing.rows[0].actions_taken_json || '[]'),
    };
  }

  try {
    const actions = await handler();
    await db.query(
      `INSERT INTO workflow_events (id, idempotency_key, event_type, entity_type, entity_id, status, actions_taken_json, triggered_by)
       VALUES ($1, $2, $3, $4, $5, 'PROCESSED', $6, $7)`,
      [
        `EVT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        idempotencyKey,
        eventType,
        entityType,
        entityId,
        JSON.stringify(actions),
        actor.full_name,
      ]
    );
    return { status: 'PROCESSED', actions };
  } catch (err: any) {
    await db.query(
      `INSERT INTO workflow_events (id, idempotency_key, event_type, entity_type, entity_id, status, actions_taken_json, error_message, triggered_by)
       VALUES ($1, $2, $3, $4, $5, 'FAILED', '[]', $6, $7) ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        `EVT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        idempotencyKey,
        eventType,
        entityType,
        entityId,
        err?.message || 'Unknown workflow error',
        actor.full_name,
      ]
    );
    throw err;
  }
}

// ============================================================================
// 1. CLIENT REGISTRATION & DUPLICATE PREVENTION
// ============================================================================
export interface RegisterClientInput {
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: 'Male' | 'Female' | 'Other';
  date_of_birth?: string;
  nationality?: string;
  ghana_card_number?: string;
  phone: string;
  whatsapp_number?: string;
  email?: string;
  residential_address?: string;
  region?: string;
  district?: string;
  city_town?: string;
  passport_available?: boolean;
  passport_number?: string;
  passport_issue_date?: string;
  passport_expiry_date?: string;
  education_level?: string;
  institution?: string;
  course_qualification?: string;
  profession?: string;
  current_occupation?: string;
  years_of_experience?: number;
  skills?: string;
  driving_license?: boolean;
  license_class?: string;
  languages?: string;
  preferred_countries?: string;
  preferred_sectors?: string;
  preferred_job_types?: string;
  minimum_salary_expectation?: number;
  preferred_service?: string;
  emergency_contact?: string;
  referral_source?: string;
  assigned_staff_name?: string;
  notes?: string;
  create_initial_case?: boolean;
  initial_case_country?: string;
  initial_case_destination?: string;
  initial_case_fee_ghs?: number;
}

export async function registerClient(actor: AuthenticatedActor, input: RegisterClientInput) {
  assertPermission(actor, 'MANAGE_CLIENTS');
  const db = await getDb();

  const normPhone = normalizePhone(input.phone);
  if (!normPhone || normPhone.length < 9) {
    throw new Error('Valid phone number is required for client registration.');
  }

  // Duplicate check across phone, passport_number, and ghana_card_number
  const dupQuery = await db.query<any>(
    `SELECT reference_code, full_name, phone, passport_number, ghana_card_number
     FROM clients
     WHERE phone_normalized = $1
        OR ($2::text IS NOT NULL AND $2::text <> '' AND UPPER(passport_number) = UPPER($2::text))
        OR ($3::text IS NOT NULL AND $3::text <> '' AND UPPER(ghana_card_number) = UPPER($3::text))
     LIMIT 1`,
    [normPhone, input.passport_number || null, input.ghana_card_number || null]
  );

  if (dupQuery.rows.length > 0) {
    const existing = dupQuery.rows[0];
    throw new Error(
      `Duplicate Client Prevented: ${existing.full_name} (${existing.reference_code}) is already registered with matching phone/passport/Ghana Card. Open a new Service Case under ${existing.reference_code} instead of re-registering.`
    );
  }

  const refCode = await nextReferenceCode(db, 'seq_client_ref', 'KSC', 6);
  const fullName = [input.first_name, input.middle_name, input.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  const staffName = input.assigned_staff_name || actor.full_name;
  const staffRes = await db.query<any>('SELECT id FROM staff_users WHERE full_name = $1 LIMIT 1', [staffName]);
  const staffId = staffRes.rows[0]?.id || actor.id;

  const clientId = refCode;
  const nextFollowUp = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  await db.query(
    `INSERT INTO clients (
      id, reference_code, registration_date, first_name, middle_name, last_name, full_name,
      gender, date_of_birth, nationality, ghana_card_number, phone, phone_normalized, whatsapp_number, email,
      residential_address, region, district, city_town,
      passport_available, passport_number, passport_issue_date, passport_expiry_date,
      education_level, institution, course_qualification, profession, current_occupation,
      years_of_experience, skills, driving_license, license_class, languages,
      preferred_countries, preferred_sectors, preferred_job_types, minimum_salary_expectation,
      preferred_service, emergency_contact, referral_source, assigned_staff_id, assigned_staff_name,
      client_status, last_contact_date, next_follow_up_date, notes
    ) VALUES (
      $1,$2,CURRENT_DATE,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
      $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,
      $42,CURRENT_DATE,$43,$44
    )`,
    [
      clientId,
      refCode,
      input.first_name.trim(),
      input.middle_name?.trim() || null,
      input.last_name.trim(),
      fullName,
      input.gender,
      input.date_of_birth || null,
      input.nationality || 'Ghanaian',
      input.ghana_card_number || null,
      input.phone.trim(),
      normPhone,
      input.whatsapp_number?.trim() || input.phone.trim(),
      input.email?.trim() || null,
      input.residential_address || null,
      input.region || 'Central',
      input.district || null,
      input.city_town || null,
      Boolean(input.passport_available),
      input.passport_number || null,
      input.passport_issue_date || null,
      input.passport_expiry_date || null,
      input.education_level || 'SHS/WASSCE',
      input.institution || null,
      input.course_qualification || null,
      input.profession || null,
      input.current_occupation || null,
      Number(input.years_of_experience || 0),
      input.skills || null,
      Boolean(input.driving_license),
      input.license_class || null,
      input.languages || 'English',
      input.preferred_countries || 'United Arab Emirates',
      input.preferred_sectors || 'Hospitality',
      input.preferred_job_types || null,
      Number(input.minimum_salary_expectation || 0),
      input.preferred_service || 'WORK ABROAD',
      input.emergency_contact || null,
      input.referral_source || 'Walk-In',
      staffId,
      staffName,
      input.passport_available ? 'READY FOR MATCHING' : 'AWAITING DOCUMENTS',
      nextFollowUp,
      input.notes || null,
    ]
  );

  // Create initial passport document record
  const docCode = await nextReferenceCode(db, 'seq_doc_ref', 'DOC', 6);
  await db.query(
    `INSERT INTO client_documents (
      id, reference_code, client_id, document_type, document_number, issue_date, expiry_date,
      is_missing, verified, verification_date, verified_by, file_reference, notes
    ) VALUES ($1,$2,$3,'Passport',$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      docCode,
      docCode,
      clientId,
      input.passport_number || null,
      input.passport_issue_date || null,
      input.passport_expiry_date || null,
      !input.passport_available,
      Boolean(input.passport_available && input.passport_number),
      input.passport_available ? new Date().toISOString().slice(0, 10) : null,
      actor.full_name,
      `Candidates/${refCode}`,
      input.passport_available ? 'Registered at intake' : 'Passport missing at registration',
    ]
  );

  let createdCase = null;
  if (input.create_initial_case) {
    createdCase = await createServiceCase(actor, {
      client_id: clientId,
      service_type: (input.preferred_service as any) || 'WORK ABROAD',
      country: input.initial_case_country || (input.preferred_countries?.split(',')[0]?.trim() || 'United Arab Emirates'),
      destination_summary: input.initial_case_destination || `${input.preferred_service || 'WORK ABROAD'} Intake`,
      assigned_staff_name: staffName,
      priority: 'NORMAL',
      quoted_amount_ghs: input.initial_case_fee_ghs ?? 500,
    });
  }

  await emitWorkflowEvent(
    actor,
    `CLIENT_REGISTERED:${refCode}`,
    'CLIENT_REGISTERED',
    'CLIENT',
    refCode,
    async () => {
      const actions = [`Assigned permanent ID ${refCode}`, `Created initial passport checklist ${docCode}`];
      if (!input.passport_available) {
        const taskCode = await nextReferenceCode(db, 'seq_task_ref', 'TASK', 6);
        await db.query(
          `INSERT INTO tasks (id, reference_code, client_id, service_case_id, title, assigned_staff_name, priority, due_date, status, automation_source_event)
           VALUES ($1,$2,$3,$4,$5,$6,'HIGH',$7,'NOT STARTED','CLIENT_REGISTERED')`,
          [
            taskCode,
            taskCode,
            clientId,
            createdCase?.id || null,
            `Collect valid Passport for ${fullName}`,
            staffName,
            nextFollowUp,
          ]
        );
        actions.push(`Created missing passport follow-up task ${taskCode}`);
      }
      return actions;
    }
  );

  await writeAuditLog(
    actor,
    'CLIENT_REGISTERED',
    'CLIENT',
    refCode,
    `Registered client ${fullName} (${refCode})`,
    { phone: input.phone, service: input.preferred_service, initialCase: createdCase?.reference_code }
  );

  return { client_id: clientId, reference_code: refCode, full_name: fullName, service_case: createdCase };
}

// ============================================================================
// 2. SERVICE CASE MANAGEMENT (MULTI-SERVICE PER CLIENT)
// ============================================================================
export interface CreateServiceCaseInput {
  client_id: string;
  service_type: 'WORK ABROAD' | 'STUDY ABROAD' | 'VISIT VISA' | 'BUSINESS VISA' | 'AIR TICKETING' | 'TRAVEL CONSULTATION';
  country: string;
  destination_summary: string;
  assigned_staff_name?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  quoted_amount_ghs?: number;
  expected_completion?: string;
  notes?: string;
}

export async function createServiceCase(actor: AuthenticatedActor, input: CreateServiceCaseInput) {
  assertPermission(actor, 'MANAGE_CLIENTS');
  const db = await getDb();

  const clientRes = await db.query<any>('SELECT * FROM clients WHERE id = $1 OR reference_code = $1 LIMIT 1', [input.client_id]);
  if (clientRes.rows.length === 0) {
    throw new Error(`Client ${input.client_id} not found.`);
  }
  const client = clientRes.rows[0];

  const caseCode = await nextReferenceCode(db, 'seq_case_ref', 'CASE', 6);
  const staffName = input.assigned_staff_name || client.assigned_staff_name || actor.full_name;
  const staffRes = await db.query<any>('SELECT id FROM staff_users WHERE full_name = $1 LIMIT 1', [staffName]);
  const staffId = staffRes.rows[0]?.id || actor.id;

  const initialStageByService: Record<string, string> = {
    'WORK ABROAD': 'ELIGIBILITY_SCREENING',
    'STUDY ABROAD': 'ENQUIRY',
    'VISIT VISA': 'DOCUMENT_COLLECTION',
    'BUSINESS VISA': 'DOCUMENT_COLLECTION',
    'AIR TICKETING': 'ROUTE_QUOTATION',
    'TRAVEL CONSULTATION': 'ENQUIRY',
  };

  const nextActDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const expCompletion = input.expected_completion || new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const quotedGhs = Number(input.quoted_amount_ghs ?? 500);

  await db.query(
    `INSERT INTO service_cases (
      id, reference_code, client_id, service_type, country, destination_summary,
      assigned_staff_id, assigned_staff_name, date_opened, priority, case_status, workflow_stage,
      next_action, next_action_date, expected_completion, quoted_amount_ghs, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE,$9,'OPEN',$10,$11,$12,$13,$14,$15)`,
    [
      caseCode,
      caseCode,
      client.id,
      input.service_type,
      input.country,
      input.destination_summary,
      staffId,
      staffName,
      input.priority || 'NORMAL',
      initialStageByService[input.service_type] || 'CLIENT_REGISTRATION',
      `Initial eligibility & document review for ${input.destination_summary}`,
      nextActDate,
      expCompletion,
      quotedGhs,
      input.notes || null,
    ]
  );

  // If quoted_amount_ghs > 0, automatically issue an authoritative Invoice & balanced Journal Entry
  let invoice = null;
  if (quotedGhs > 0) {
    invoice = await createInvoiceInternal(db, actor, {
      client_id: client.id,
      service_case_id: caseCode,
      service_type: input.service_type,
      currency: 'GHS',
      total_amount_original: quotedGhs,
      description: `${input.service_type} — ${input.destination_summary}`,
      due_date: nextActDate,
    });
  }

  await writeAuditLog(
    actor,
    'SERVICE_CASE_CREATED',
    'SERVICE_CASE',
    caseCode,
    `Opened ${input.service_type} case ${caseCode} for ${client.full_name} (${input.destination_summary})`,
    { quoted_amount_ghs: quotedGhs, invoice_id: invoice?.reference_code }
  );

  return { id: caseCode, reference_code: caseCode, client_id: client.id, invoice };
}

export async function updateServiceCaseStage(
  actor: AuthenticatedActor,
  input: {
    case_id: string;
    workflow_stage: string;
    case_status?: string;
    next_action?: string;
    next_action_date?: string;
    override_missing_documents_reason?: string;
  }
) {
  const db = await getDb();
  const caseRes = await db.query<any>('SELECT * FROM service_cases WHERE id = $1 LIMIT 1', [input.case_id]);
  if (caseRes.rows.length === 0) throw new Error(`Service Case ${input.case_id} not found.`);
  const sc = caseRes.rows[0];

  // Safeguard: Prevent progression to VISA_PROCESSING, TRAVEL_PREPARATION, or DEPLOYMENT if mandatory Passport is missing or expired
  const gatedStages = ['VISA_PROCESSING', 'VISA_PREPARATION', 'TRAVEL_PREPARATION', 'DEPLOYMENT', 'CASE_CLOSURE', 'COMPLETION'];
  if (gatedStages.includes(input.workflow_stage.toUpperCase())) {
    const clientRes = await db.query<any>('SELECT * FROM clients WHERE id = $1 LIMIT 1', [sc.client_id]);
    const client = clientRes.rows[0];
    const ppStatus = getPassportStatus(client.passport_available, client.passport_expiry_date);
    if ((ppStatus === 'Not Available' || ppStatus === 'Expired') && !input.override_missing_documents_reason) {
      throw new Error(
        `Mandatory Document Safeguard: Cannot advance case ${sc.reference_code} to '${input.workflow_stage}' because client's Passport is ${ppStatus}. Verify a valid passport first or provide an authorized exception reason.`
      );
    }
  }

  const newStatus =
    input.case_status ||
    (['CASE_CLOSURE', 'COMPLETION'].includes(input.workflow_stage.toUpperCase()) ? 'COMPLETED' : 'IN PROGRESS');

  await db.query(
    `UPDATE service_cases
     SET workflow_stage = $1,
         case_status = $2,
         next_action = COALESCE($3, next_action),
         next_action_date = COALESCE($4, next_action_date),
         updated_at = NOW()
     WHERE id = $5`,
    [input.workflow_stage, newStatus, input.next_action || null, input.next_action_date || null, sc.id]
  );

  if (newStatus === 'COMPLETED' && sc.service_type === 'WORK ABROAD') {
    await db.query(`UPDATE clients SET client_status = 'PLACED', updated_at = NOW() WHERE id = $1`, [sc.client_id]);
  }

  await writeAuditLog(
    actor,
    'CASE_STAGE_UPDATED',
    'SERVICE_CASE',
    sc.reference_code,
    `Updated case ${sc.reference_code} stage from ${sc.workflow_stage} to ${input.workflow_stage} (${newStatus})`,
    { overrideReason: input.override_missing_documents_reason }
  );

  return { id: sc.id, workflow_stage: input.workflow_stage, case_status: newStatus };
}

// ============================================================================
// 3. WORK ABROAD: OPPORTUNITIES, TRANSPARENT MATCHING & INTERVIEWS
// ============================================================================
export async function createJobMatch(
  actor: AuthenticatedActor,
  input: {
    client_id: string;
    opportunity_id: string;
    service_case_id?: string;
    notes?: string;
  }
) {
  assertPermission(actor, 'MANAGE_WORK_ABROAD');
  const db = await getDb();

  const cRes = await db.query<any>('SELECT * FROM clients WHERE id = $1 LIMIT 1', [input.client_id]);
  const jRes = await db.query<any>('SELECT * FROM job_opportunities WHERE id = $1 LIMIT 1', [input.opportunity_id]);
  if (!cRes.rows[0] || !jRes.rows[0]) {
    throw new Error('Both a valid Client and Job Opportunity are required to run matching.');
  }
  const client = cRes.rows[0];
  const opp = jRes.rows[0];

  // Check if already matched
  const existing = await db.query<any>(
    'SELECT * FROM job_matches WHERE client_id = $1 AND opportunity_id = $2 LIMIT 1',
    [client.id, opp.id]
  );
  if (existing.rows.length > 0 && existing.rows[0].selection_status !== 'NOT SELECTED') {
    throw new Error(`Match ${existing.rows[0].reference_code} already exists between ${client.full_name} and ${opp.job_title}.`);
  }

  // Locate or link Work Abroad service case
  let caseId = input.service_case_id || null;
  if (!caseId) {
    const caseLookup = await db.query<any>(
      `SELECT id FROM service_cases WHERE client_id = $1 AND service_type = 'WORK ABROAD' ORDER BY created_at DESC LIMIT 1`,
      [client.id]
    );
    caseId = caseLookup.rows[0]?.id || null;
  }

  const evaluation = evaluateCandidateMatch(client, opp);
  const matchCode = await nextReferenceCode(db, 'seq_match_ref', 'MATCH', 6);

  await db.query(
    `INSERT INTO job_matches (
      id, reference_code, client_id, service_case_id, opportunity_id,
      match_score, system_decision, legacy_eligibility_label,
      matched_requirements, missing_requirements, compliance_flags, score_breakdown_json,
      match_status, date_matched, assigned_staff_name, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,CURRENT_DATE,$14,$15)`,
    [
      matchCode,
      matchCode,
      client.id,
      caseId,
      opp.id,
      evaluation.match_score,
      evaluation.system_decision,
      evaluation.legacy_eligibility_label,
      evaluation.matched_requirements.join('; '),
      evaluation.missing_requirements.join('; '),
      evaluation.compliance_flags.join(' | ') || null,
      JSON.stringify(evaluation.score_breakdown),
      evaluation.system_decision === 'REQUIRES_REVIEW' ? 'REVIEW' : 'NEW MATCH',
      actor.full_name,
      input.notes || null,
    ]
  );

  await emitWorkflowEvent(
    actor,
    `CANDIDATE_MATCHED:${matchCode}`,
    'CANDIDATE_MATCHED',
    'JOB_MATCH',
    matchCode,
    async () => {
      const actions = [`Evaluated ${client.full_name} vs ${opp.job_title}: ${evaluation.match_score}/100 (${evaluation.system_decision})`];
      if (evaluation.system_decision !== 'NOT_ELIGIBLE') {
        const taskCode = await nextReferenceCode(db, 'seq_task_ref', 'TASK', 6);
        const dueDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
        await db.query(
          `INSERT INTO tasks (id, reference_code, client_id, service_case_id, title, assigned_staff_name, priority, due_date, status, automation_source_event)
           VALUES ($1,$2,$3,$4,$5,$6,'HIGH',$7,'NOT STARTED','CANDIDATE_MATCHED')`,
          [
            taskCode,
            taskCode,
            client.id,
            caseId,
            `Notify ${client.full_name} about ${opp.employer_name} - ${opp.job_title} (${evaluation.match_score}/100)`,
            actor.full_name,
            dueDate,
          ]
        );
        actions.push(`Created candidate notification task ${taskCode}`);
      }
      if (caseId) {
        await db.query(
          `UPDATE service_cases SET workflow_stage = 'JOB_MATCHING', case_status = 'IN PROGRESS', next_action = $1, updated_at = NOW() WHERE id = $2`,
          [`Notify candidate regarding ${opp.employer_name} - ${opp.job_title}`, caseId]
        );
      }
      return actions;
    }
  );

  await writeAuditLog(
    actor,
    'CANDIDATE_MATCHED',
    'JOB_MATCH',
    matchCode,
    `Matched ${client.full_name} to ${opp.job_title} (${opp.employer_name}) — Score ${evaluation.match_score}/100 [${evaluation.system_decision}]`,
    evaluation
  );

  return { id: matchCode, reference_code: matchCode, evaluation };
}

export async function overrideMatchEligibility(
  actor: AuthenticatedActor,
  input: {
    match_id: string;
    override_decision: 'ELIGIBLE' | 'REQUIRES_REVIEW' | 'NOT_ELIGIBLE';
    override_reason: string;
  }
) {
  assertPermission(actor, 'OVERRIDE_ELIGIBILITY');
  if (!input.override_reason || input.override_reason.trim().length < 5) {
    throw new Error('A documented business reason is required to override matching eligibility.');
  }
  const db = await getDb();
  await db.query(
    `UPDATE job_matches
     SET override_decision = $1,
         override_reason = $2,
         overridden_by = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [input.override_decision, input.override_reason.trim(), actor.full_name, input.match_id]
  );

  await writeAuditLog(
    actor,
    'MATCH_ELIGIBILITY_OVERRIDDEN',
    'JOB_MATCH',
    input.match_id,
    `Overrode match ${input.match_id} eligibility to ${input.override_decision}: ${input.override_reason}`,
    input
  );
}

export async function scheduleInterview(
  actor: AuthenticatedActor,
  input: {
    match_id?: string;
    opportunity_id: string;
    client_id: string;
    service_case_id?: string;
    interview_date: string;
    start_time: string;
    end_time?: string;
    location?: string;
    interview_type?: 'In-Person' | 'Video Call' | 'Phone';
    instructions?: string;
    notes?: string;
  }
) {
  assertPermission(actor, 'MANAGE_WORK_ABROAD');
  const db = await getDb();

  const intCode = await nextReferenceCode(db, 'seq_interview_ref', 'INT', 6);
  const cRes = await db.query<any>('SELECT * FROM clients WHERE id = $1 LIMIT 1', [input.client_id]);
  const jRes = await db.query<any>('SELECT * FROM job_opportunities WHERE id = $1 LIMIT 1', [input.opportunity_id]);
  if (!cRes.rows[0] || !jRes.rows[0]) {
    throw new Error('Valid Client and Opportunity are required to schedule an interview.');
  }
  const client = cRes.rows[0];
  const opp = jRes.rows[0];

  let matchId = input.match_id || null;
  let caseId = input.service_case_id || null;
  if (!matchId) {
    const mLookup = await db.query<any>(
      'SELECT id, service_case_id FROM job_matches WHERE client_id = $1 AND opportunity_id = $2 ORDER BY created_at DESC LIMIT 1',
      [client.id, opp.id]
    );
    matchId = mLookup.rows[0]?.id || null;
    caseId = caseId || mLookup.rows[0]?.service_case_id || null;
  }

  await db.query(
    `INSERT INTO interviews (
      id, reference_code, opportunity_id, client_id, match_id, service_case_id,
      interview_date, start_time, end_time, location, interview_type, instructions,
      contact_person, confirmation_status, reminder_sent, attendance_status, interview_result,
      selection_status, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'CONFIRMED',TRUE,'PENDING','PENDING','PENDING',$14)`,
    [
      intCode,
      intCode,
      opp.id,
      client.id,
      matchId,
      caseId,
      input.interview_date,
      input.start_time,
      input.end_time || '3:00 PM',
      input.location || 'Accra Office',
      input.interview_type || 'In-Person',
      input.instructions || 'Bring valid Passport, CV, and required certificates. Arrive 30 mins early.',
      actor.full_name,
      input.notes || null,
    ]
  );

  if (matchId) {
    await db.query(
      `UPDATE job_matches
       SET match_status = 'INTERVIEW SCHEDULED',
           candidate_notified = TRUE,
           date_notified = COALESCE(date_notified, CURRENT_DATE),
           application_status = 'APPLICATION SUBMITTED',
           interview_id = $1,
           interview_status = 'CONFIRMED',
           updated_at = NOW()
       WHERE id = $2`,
      [intCode, matchId]
    );
  }

  if (caseId) {
    await db.query(
      `UPDATE service_cases
       SET workflow_stage = 'INTERVIEW',
           case_status = 'IN PROGRESS',
           next_action = $1,
           next_action_date = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [`Conduct interview ${intCode} (${opp.employer_name})`, input.interview_date, caseId]
    );
  }

  await db.query(
    `UPDATE clients SET client_status = 'INTERVIEW SCHEDULED', updated_at = NOW() WHERE id = $1`,
    [client.id]
  );

  await emitWorkflowEvent(
    actor,
    `INTERVIEW_SCHEDULED:${intCode}`,
    'INTERVIEW_SCHEDULED',
    'INTERVIEW',
    intCode,
    async () => {
      const taskCode = await nextReferenceCode(db, 'seq_task_ref', 'TASK', 6);
      await db.query(
        `INSERT INTO tasks (id, reference_code, client_id, service_case_id, title, assigned_staff_name, priority, due_date, status, automation_source_event)
         VALUES ($1,$2,$3,$4,$5,$6,'URGENT',$7,'NOT STARTED','INTERVIEW_SCHEDULED')`,
        [
          taskCode,
          taskCode,
          client.id,
          caseId,
          `Prepare ${client.full_name} for ${opp.employer_name} interview (${intCode})`,
          actor.full_name,
          input.interview_date,
        ]
      );
      return [`Linked interview ${intCode} to match ${matchId || 'N/A'}`, `Created interview prep task ${taskCode}`];
    }
  );

  await writeAuditLog(
    actor,
    'INTERVIEW_SCHEDULED',
    'INTERVIEW',
    intCode,
    `Scheduled interview ${intCode} for ${client.full_name} with ${opp.employer_name} on ${input.interview_date}`
  );

  return { id: intCode, reference_code: intCode };
}

export async function recordInterviewOutcome(
  actor: AuthenticatedActor,
  input: {
    interview_id: string;
    attendance_status: 'ATTENDED' | 'NO SHOW' | 'RESCHEDULED';
    interview_result: 'PASS' | 'FAIL' | 'NO SHOW' | 'PENDING';
    selection_status: 'SELECTED' | 'NOT SELECTED' | 'WAITLISTED' | 'PENDING';
    employer_feedback?: string;
    rejection_reason?: string;
  }
) {
  assertPermission(actor, 'MANAGE_WORK_ABROAD');
  const db = await getDb();

  const intRes = await db.query<any>('SELECT * FROM interviews WHERE id = $1 LIMIT 1', [input.interview_id]);
  if (!intRes.rows[0]) throw new Error(`Interview ${input.interview_id} not found.`);
  const interview = intRes.rows[0];

  const cRes = await db.query<any>('SELECT * FROM clients WHERE id = $1 LIMIT 1', [interview.client_id]);
  const oppRes = await db.query<any>('SELECT * FROM job_opportunities WHERE id = $1 LIMIT 1', [interview.opportunity_id]);
  const client = cRes.rows[0];
  const opp = oppRes.rows[0];

  const nextStep =
    input.selection_status === 'SELECTED'
      ? 'Issue Offer Letter & Verify Mandatory Deployment Documents (Visa NOT yet approved)'
      : input.selection_status === 'NOT SELECTED'
      ? 'Preserve interview history & evaluate alternative job opportunities'
      : 'Await employer confirmation';

  await db.query(
    `UPDATE interviews
     SET attendance_status = $1,
         interview_result = $2,
         selection_status = $3,
         employer_feedback = $4,
         next_step = $5,
         updated_at = NOW()
     WHERE id = $6`,
    [
      input.attendance_status,
      input.interview_result,
      input.selection_status,
      input.employer_feedback || null,
      nextStep,
      interview.id,
    ]
  );

  if (interview.match_id) {
    const newMatchStatus =
      input.selection_status === 'SELECTED'
        ? 'SELECTED'
        : input.selection_status === 'NOT SELECTED'
        ? 'REJECTED'
        : 'INTERVIEW ATTENDED';

    await db.query(
      `UPDATE job_matches
       SET match_status = $1,
           interview_status = $2,
           selection_status = $3,
           rejection_reason = $4,
           offer_status = CASE WHEN $3 = 'SELECTED' THEN 'ISSUED' ELSE offer_status END,
           updated_at = NOW()
       WHERE id = $5`,
      [
        newMatchStatus,
        input.attendance_status,
        input.selection_status,
        input.rejection_reason || null,
        interview.match_id,
      ]
    );
  }

  // Handle SELECTED vs NOT SELECTED workflow transitions
  if (input.selection_status === 'SELECTED') {
    if (interview.service_case_id) {
      await db.query(
        `UPDATE service_cases
         SET workflow_stage = 'DOCUMENTATION',
             case_status = 'IN PROGRESS',
             next_action = 'Verify Police Clearance, Medical & Signed Offer Letter for Visa Filing',
             next_action_date = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), interview.service_case_id]
      );
    }

    await emitWorkflowEvent(
      actor,
      `CANDIDATE_SELECTED:${interview.id}`,
      'CANDIDATE_SELECTED',
      'INTERVIEW',
      interview.id,
      async () => {
        const actions: string[] = [];
        // Generate required post-selection document checklist items if not yet present
        const requiredDocs = ['Passport', 'CV', 'Police Clearance Certificate', 'Medical Certificate', 'Offer Letter'];
        for (const docType of requiredDocs) {
          const exists = await db.query<any>(
            'SELECT id FROM client_documents WHERE client_id = $1 AND document_type = $2 LIMIT 1',
            [client.id, docType]
          );
          if (exists.rows.length === 0) {
            const dCode = await nextReferenceCode(db, 'seq_doc_ref', 'DOC', 6);
            await db.query(
              `INSERT INTO client_documents (
                id, reference_code, client_id, service_case_id, document_type, is_missing, verified, file_reference, notes
              ) VALUES ($1,$2,$3,$4,$5,TRUE,FALSE,$6,'Auto-generated upon employer selection')`,
              [dCode, dCode, client.id, interview.service_case_id, docType, `Candidates/${client.reference_code}`]
            );
            actions.push(`Added mandatory checklist document: ${docType} (${dCode})`);
          }
        }

        const taskCode = await nextReferenceCode(db, 'seq_task_ref', 'TASK', 6);
        await db.query(
          `INSERT INTO tasks (id, reference_code, client_id, service_case_id, title, assigned_staff_name, priority, due_date, status, automation_source_event)
           VALUES ($1,$2,$3,$4,$5,'Yaw Asante','HIGH',$6,'NOT STARTED','CANDIDATE_SELECTED')`,
          [
            taskCode,
            taskCode,
            client.id,
            interview.service_case_id,
            `Verify post-selection documents (PCC, Medical, Offer Letter) for ${client.full_name}`,
            new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
          ]
        );
        actions.push(`Assigned document verification task ${taskCode} to Document Officer`);
        return actions;
      }
    );
  } else if (input.selection_status === 'NOT SELECTED') {
    // Rejected Candidate Scenario: preserve history, return case to JOB_MATCHING for alternative matching
    if (interview.service_case_id) {
      await db.query(
        `UPDATE service_cases
         SET workflow_stage = 'JOB_MATCHING',
             case_status = 'OPEN',
             next_action = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [`Candidate not selected for ${opp.job_title} (${input.rejection_reason || 'Employer decision'}) — match to alternative vacancy`, interview.service_case_id]
      );
    }
    await db.query(
      `UPDATE clients SET client_status = 'READY FOR MATCHING', updated_at = NOW() WHERE id = $1`,
      [client.id]
    );
  }

  await writeAuditLog(
    actor,
    'INTERVIEW_OUTCOME_RECORDED',
    'INTERVIEW',
    interview.reference_code,
    `Recorded interview outcome for ${client.full_name} (${opp.employer_name}): Attendance=${input.attendance_status}, Result=${input.interview_result}, Selection=${input.selection_status}`,
    input
  );

  return { interview_id: interview.id, selection_status: input.selection_status, next_step: nextStep };
}

// ============================================================================
// 4. DOCUMENTS, VISAS, STUDY ABROAD & FLIGHTS
// ============================================================================
export async function verifyAndUpdateDocument(
  actor: AuthenticatedActor,
  input: {
    document_id?: string;
    client_id: string;
    service_case_id?: string;
    document_type: string;
    document_number?: string;
    issue_date?: string;
    expiry_date?: string;
    verified: boolean;
    notes?: string;
  }
) {
  assertPermission(actor, 'MANAGE_VISA_DOCUMENTS');
  const db = await getDb();

  let docId = input.document_id;
  if (!docId) {
    const existing = await db.query<any>(
      'SELECT id FROM client_documents WHERE client_id = $1 AND document_type = $2 LIMIT 1',
      [input.client_id, input.document_type]
    );
    docId = existing.rows[0]?.id;
  }

  const today = new Date().toISOString().slice(0, 10);

  if (docId) {
    await db.query(
      `UPDATE client_documents
       SET document_number = COALESCE($1, document_number),
           issue_date = COALESCE($2, issue_date),
           expiry_date = COALESCE($3, expiry_date),
           is_missing = FALSE,
           verified = $4,
           verification_date = CASE WHEN $4 = TRUE THEN CURRENT_DATE ELSE verification_date END,
           verified_by = $5,
           notes = COALESCE($6, notes),
           updated_at = NOW()
       WHERE id = $7`,
      [
        input.document_number || null,
        input.issue_date || null,
        input.expiry_date || null,
        input.verified,
        actor.full_name,
        input.notes || null,
        docId,
      ]
    );
  } else {
    docId = await nextReferenceCode(db, 'seq_doc_ref', 'DOC', 6);
    await db.query(
      `INSERT INTO client_documents (
        id, reference_code, client_id, service_case_id, document_type, document_number,
        issue_date, expiry_date, is_missing, verified, verification_date, verified_by, file_reference, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,$9,$10,$11,$12,$13)`,
      [
        docId,
        docId,
        input.client_id,
        input.service_case_id || null,
        input.document_type,
        input.document_number || null,
        input.issue_date || null,
        input.expiry_date || null,
        input.verified,
        input.verified ? today : null,
        actor.full_name,
        `Candidates/${input.client_id}`,
        input.notes || null,
      ]
    );
  }

  // If this is a Passport, synchronize with master client record so matching & stage gates stay accurate!
  if (input.document_type.toLowerCase() === 'passport') {
    await db.query(
      `UPDATE clients
       SET passport_available = TRUE,
           passport_number = COALESCE($1, passport_number),
           passport_issue_date = COALESCE($2, passport_issue_date),
           passport_expiry_date = COALESCE($3, passport_expiry_date),
           updated_at = NOW()
       WHERE id = $4`,
      [input.document_number || null, input.issue_date || null, input.expiry_date || null, input.client_id]
    );
  }

  await writeAuditLog(
    actor,
    'DOCUMENT_VERIFIED',
    'DOCUMENT',
    docId,
    `${input.verified ? 'Verified' : 'Updated'} ${input.document_type} (${docId}) for client ${input.client_id}`
  );

  return { document_id: docId };
}

export async function createOrUpdateVisaCase(
  actor: AuthenticatedActor,
  input: {
    visa_case_id?: string;
    client_id: string;
    service_case_id?: string;
    visa_type: string;
    destination_country: string;
    visa_category?: string;
    appointment_date?: string;
    submission_date?: string;
    visa_status: 'DOCUMENTS REQUIRED' | 'READY FOR SUBMISSION' | 'APPOINTMENT BOOKED' | 'SUBMITTED' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'COMPLETED';
    visa_number?: string;
    approval_date?: string;
    expiry_date?: string;
    rejection_reason?: string;
    next_action?: string;
    notes?: string;
  }
) {
  assertPermission(actor, 'MANAGE_VISA_DOCUMENTS');
  const db = await getDb();

  // Safeguard: Cannot mark visa APPROVED without a visa_number and expiry_date
  if (input.visa_status === 'APPROVED' && (!input.visa_number || !input.expiry_date)) {
    throw new Error(
      'Visa Verification Control: A visa cannot be marked APPROVED without recording the official Visa Number and Validity Expiry Date.'
    );
  }

  let visaId = input.visa_case_id;
  if (visaId) {
    await db.query(
      `UPDATE visa_cases
       SET visa_status = $1,
           appointment_date = COALESCE($2, appointment_date),
           submission_date = COALESCE($3, submission_date),
           visa_number = COALESCE($4, visa_number),
           approval_date = COALESCE($5, approval_date),
           expiry_date = COALESCE($6, expiry_date),
           rejection_reason = COALESCE($7, rejection_reason),
           next_action = COALESCE($8, next_action),
           notes = COALESCE($9, notes),
           updated_at = NOW()
       WHERE id = $10`,
      [
        input.visa_status,
        input.appointment_date || null,
        input.submission_date || null,
        input.visa_number || null,
        input.approval_date || (input.visa_status === 'APPROVED' ? new Date().toISOString().slice(0, 10) : null),
        input.expiry_date || null,
        input.rejection_reason || null,
        input.next_action || null,
        input.notes || null,
        visaId,
      ]
    );
  } else {
    visaId = await nextReferenceCode(db, 'seq_visa_ref', 'VISA', 6);
    await db.query(
      `INSERT INTO visa_cases (
        id, reference_code, client_id, service_case_id, visa_type, destination_country, visa_category,
        application_date, appointment_date, submission_date, visa_status, visa_number,
        approval_date, expiry_date, rejection_reason, next_action, assigned_officer, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        visaId,
        visaId,
        input.client_id,
        input.service_case_id || null,
        input.visa_type,
        input.destination_country,
        input.visa_category || 'Standard',
        input.appointment_date || null,
        input.submission_date || null,
        input.visa_status,
        input.visa_number || null,
        input.approval_date || (input.visa_status === 'APPROVED' ? new Date().toISOString().slice(0, 10) : null),
        input.expiry_date || null,
        input.rejection_reason || null,
        input.next_action || 'Prepare travel & flight booking',
        actor.full_name,
        input.notes || null,
      ]
    );
  }

  if (input.visa_status === 'APPROVED') {
    if (input.service_case_id) {
      await db.query(
        `UPDATE service_cases
         SET workflow_stage = 'TRAVEL_PREPARATION',
             case_status = 'IN PROGRESS',
             next_action = 'Book flight ticket & pre-departure briefing',
             updated_at = NOW()
         WHERE id = $1`,
        [input.service_case_id]
      );
    }

    await emitWorkflowEvent(
      actor,
      `VISA_APPROVED:${visaId}`,
      'VISA_APPROVED',
      'VISA_CASE',
      visaId,
      async () => {
        const taskCode = await nextReferenceCode(db, 'seq_task_ref', 'TASK', 6);
        await db.query(
          `INSERT INTO tasks (id, reference_code, client_id, service_case_id, title, assigned_staff_name, priority, due_date, status, automation_source_event)
           VALUES ($1,$2,$3,$4,$5,'Kojo Appiah','HIGH',$6,'NOT STARTED','VISA_APPROVED')`,
          [
            taskCode,
            taskCode,
            input.client_id,
            input.service_case_id || null,
            `Arrange flight booking & travel preparation following Visa Approval (${visaId})`,
            new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
          ]
        );
        return [`Updated case ${input.service_case_id || 'N/A'} to TRAVEL_PREPARATION`, `Created travel task ${taskCode}`];
      }
    );
  }

  await writeAuditLog(
    actor,
    'VISA_CASE_UPDATED',
    'VISA_CASE',
    visaId,
    `Visa case ${visaId} (${input.destination_country} ${input.visa_type}) status set to ${input.visa_status}`,
    input
  );

  return { visa_case_id: visaId, status: input.visa_status };
}

export async function createStudyApplication(
  actor: AuthenticatedActor,
  input: {
    client_id: string;
    service_case_id?: string;
    study_opportunity_id: string;
    submission_status?: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ADMITTED' | 'CONDITIONAL_OFFER' | 'REJECTED' | 'WITHDRAWN';
    notes?: string;
  }
) {
  assertPermission(actor, 'MANAGE_STUDY_ABROAD');
  const db = await getDb();
  const appCode = await nextReferenceCode(db, 'seq_study_ref', 'STDAPP', 6);

  await db.query(
    `INSERT INTO study_applications (
      id, reference_code, client_id, service_case_id, study_opportunity_id,
      workflow_stage, application_date, submission_status, assigned_advisor, notes
    ) VALUES ($1,$2,$3,$4,$5,'APPLICATION',CURRENT_DATE,$6,$7,$8)`,
    [
      appCode,
      appCode,
      input.client_id,
      input.service_case_id || null,
      input.study_opportunity_id,
      input.submission_status || 'SUBMITTED',
      actor.full_name,
      input.notes || null,
    ]
  );

  if (input.service_case_id) {
    await db.query(
      `UPDATE service_cases SET workflow_stage = 'APPLICATION', case_status = 'IN PROGRESS', updated_at = NOW() WHERE id = $1`,
      [input.service_case_id]
    );
  }

  await writeAuditLog(
    actor,
    'STUDY_APPLICATION_CREATED',
    'STUDY_APPLICATION',
    appCode,
    `Created study application ${appCode} for client ${input.client_id} (${input.study_opportunity_id})`
  );

  return { id: appCode, reference_code: appCode };
}

export async function updateStudyApplicationStatus(
  actor: AuthenticatedActor,
  input: {
    application_id: string;
    submission_status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ADMITTED' | 'CONDITIONAL_OFFER' | 'REJECTED' | 'WITHDRAWN';
    offer_accepted?: boolean;
    notes?: string;
  }
) {
  assertPermission(actor, 'MANAGE_STUDY_ABROAD');
  const db = await getDb();

  const appRes = await db.query<any>('SELECT * FROM study_applications WHERE id = $1 LIMIT 1', [input.application_id]);
  if (!appRes.rows[0]) throw new Error(`Study application ${input.application_id} not found.`);
  const app = appRes.rows[0];

  const newStage =
    input.offer_accepted
      ? 'VISA_PREPARATION'
      : input.submission_status === 'ADMITTED' || input.submission_status === 'CONDITIONAL_OFFER'
      ? 'ADMISSION_DECISION'
      : 'APPLICATION';

  await db.query(
    `UPDATE study_applications
     SET submission_status = $1,
         offer_accepted = COALESCE($2, offer_accepted),
         workflow_stage = $3,
         notes = COALESCE($4, notes),
         updated_at = NOW()
     WHERE id = $5`,
    [input.submission_status, input.offer_accepted ?? null, newStage, input.notes || null, app.id]
  );

  if (app.service_case_id) {
    await db.query(
      `UPDATE service_cases SET workflow_stage = $1, updated_at = NOW() WHERE id = $2`,
      [newStage, app.service_case_id]
    );
  }

  await writeAuditLog(
    actor,
    'STUDY_APPLICATION_UPDATED',
    'STUDY_APPLICATION',
    app.reference_code,
    `Updated study application ${app.reference_code} to ${input.submission_status} (Stage: ${newStage})`
  );

  return { id: app.id, submission_status: input.submission_status, workflow_stage: newStage };
}

export async function createFlightBooking(
  actor: AuthenticatedActor,
  input: {
    client_id: string;
    service_case_id?: string;
    airline: string;
    booking_reference?: string;
    ticket_number?: string;
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
    return_date?: string;
    supplier_cost: number;
    client_fare: number;
    currency?: string;
    ticket_status?: 'QUOTED' | 'BOOKED' | 'ISSUED' | 'CANCELLED' | 'REFUNDED';
    create_invoice?: boolean;
    notes?: string;
  }
) {
  assertPermission(actor, 'MANAGE_FLIGHTS_TOURISM');
  const db = await getDb();

  const cRes = await db.query<any>('SELECT * FROM clients WHERE id = $1 LIMIT 1', [input.client_id]);
  if (!cRes.rows[0]) throw new Error(`Client ${input.client_id} not found.`);
  const client = cRes.rows[0];

  const tktCode = await nextReferenceCode(db, 'seq_ticket_ref', 'TKT', 6);
  const curr = input.currency || 'GHS';

  await db.query(
    `INSERT INTO flight_bookings (
      id, reference_code, client_id, service_case_id, airline, booking_reference, ticket_number,
      passenger_name, departure_airport, arrival_airport, departure_date, return_date,
      supplier_cost, client_fare, currency, payment_status, ticket_status, issued_by, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'UNPAID',$16,$17,$18)`,
    [
      tktCode,
      tktCode,
      client.id,
      input.service_case_id || null,
      input.airline,
      input.booking_reference || null,
      input.ticket_number || null,
      client.full_name,
      input.departure_airport,
      input.arrival_airport,
      input.departure_date,
      input.return_date || null,
      Number(input.supplier_cost || 0),
      Number(input.client_fare || 0),
      curr,
      input.ticket_status || 'BOOKED',
      actor.full_name,
      input.notes || null,
    ]
  );

  let invoice = null;
  if (input.create_invoice && Number(input.client_fare) > 0) {
    invoice = await createInvoiceInternal(db, actor, {
      client_id: client.id,
      service_case_id: input.service_case_id,
      service_type: 'AIR TICKETING',
      currency: curr,
      total_amount_original: Number(input.client_fare),
      description: `Flight Ticket ${tktCode}: ${input.departure_airport} → ${input.arrival_airport} (${input.airline})`,
    });
  }

  await writeAuditLog(
    actor,
    'FLIGHT_BOOKING_CREATED',
    'FLIGHT_BOOKING',
    tktCode,
    `Booked flight ${tktCode} (${input.airline} ${input.departure_airport}→${input.arrival_airport}) for ${client.full_name}`,
    { client_fare: input.client_fare, supplier_cost: input.supplier_cost, invoice_id: invoice?.reference_code }
  );

  return { id: tktCode, reference_code: tktCode, invoice };
}

// ============================================================================
// 5. FINANCIAL MANAGEMENT & DOUBLE-ENTRY ACCOUNTING LEDGER
// ============================================================================
async function getExchangeRateToGhs(db: any, currency: string): Promise<number> {
  const res = await db.query('SELECT rate_to_ghs FROM exchange_rates WHERE currency_code = $1 LIMIT 1', [
    (currency || 'GHS').toUpperCase(),
  ]);
  return Number(res.rows[0]?.rate_to_ghs || 1.0);
}

async function createInvoiceInternal(
  db: any,
  actor: AuthenticatedActor,
  input: {
    client_id: string;
    service_case_id?: string;
    service_type: string;
    document_kind?: 'QUOTATION' | 'INVOICE';
    currency?: string;
    total_amount_original: number;
    revenue_recognition_mode?: 'EARNED_ON_INVOICE' | 'DEFERRED_ADVANCE';
    description: string;
    due_date?: string;
  }
) {
  const invCode = await nextReferenceCode(db, 'seq_invoice_ref', 'INV', 6);
  const curr = (input.currency || 'GHS').toUpperCase();
  const fxRate = await getExchangeRateToGhs(db, curr);
  const amountOrig = Number(input.total_amount_original);
  const amountGhs = Number((amountOrig * fxRate).toFixed(2));
  const docKind = input.document_kind || 'INVOICE';
  const recMode = input.revenue_recognition_mode || 'EARNED_ON_INVOICE';

  await db.query(
    `INSERT INTO invoices (
      id, reference_code, client_id, service_case_id, service_type, document_kind,
      issue_date, due_date, currency, exchange_rate_to_ghs, total_amount_original, total_amount_ghs,
      revenue_recognition_mode, status, description, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      invCode,
      invCode,
      input.client_id,
      input.service_case_id || null,
      input.service_type,
      docKind,
      input.due_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      curr,
      fxRate,
      amountOrig,
      amountGhs,
      recMode,
      docKind === 'QUOTATION' ? 'QUOTED' : 'ISSUED',
      input.description,
      actor.full_name,
    ]
  );

  // Quotations do not post to the general ledger; issued Invoices post balanced Debit & Credit lines!
  if (docKind === 'INVOICE' && amountGhs > 0) {
    const jnlCode = await nextReferenceCode(db, 'seq_journal_ref', 'JNL', 6);
    const revenueAccountByService: Record<string, string> = {
      'WORK ABROAD': '4200',
      'STUDY ABROAD': '4300',
      'VISIT VISA': '4400',
      'BUSINESS VISA': '4400',
      'AIR TICKETING': '4500',
      'TRAVEL CONSULTATION': '4100',
    };
    const creditAccount = recMode === 'DEFERRED_ADVANCE' ? '2100' : revenueAccountByService[input.service_type] || '4100';

    await db.query(
      `INSERT INTO journal_entries (id, reference_code, entry_date, source_module, source_id, description, currency, exchange_rate, posted_by)
       VALUES ($1,$2,CURRENT_DATE,'INVOICE',$3,$4,$5,$6,$7)`,
      [jnlCode, jnlCode, invCode, `Invoice ${invCode}: ${input.description}`, curr, fxRate, actor.full_name]
    );
    await db.query(
      `INSERT INTO journal_lines (id, journal_entry_id, account_code, debit_ghs, credit_ghs, client_id, service_case_id, memo)
       VALUES ($1,$2,'1200',$3,0,$4,$5,$6), ($7,$2,$8,0,$3,$4,$5,$6)`,
      [
        `${jnlCode}-L1`,
        jnlCode,
        amountGhs,
        input.client_id,
        input.service_case_id || null,
        input.description,
        `${jnlCode}-L2`,
        creditAccount,
      ]
    );
  }

  return { id: invCode, reference_code: invCode, total_amount_ghs: amountGhs };
}

export async function createInvoice(
  actor: AuthenticatedActor,
  input: {
    client_id: string;
    service_case_id?: string;
    service_type: string;
    document_kind?: 'QUOTATION' | 'INVOICE';
    currency?: string;
    total_amount_original: number;
    revenue_recognition_mode?: 'EARNED_ON_INVOICE' | 'DEFERRED_ADVANCE';
    description: string;
    due_date?: string;
  }
) {
  assertPermission(actor, 'MANAGE_FINANCE');
  const db = await getDb();
  const inv = await createInvoiceInternal(db, actor, input);
  await writeAuditLog(
    actor,
    'INVOICE_CREATED',
    'INVOICE',
    inv.reference_code,
    `Created ${input.document_kind || 'INVOICE'} ${inv.reference_code} for GHS ${inv.total_amount_ghs.toFixed(2)}`,
    input
  );
  return inv;
}

export async function recordPayment(
  actor: AuthenticatedActor,
  input: {
    client_id: string;
    service_case_id?: string;
    invoice_id?: string;
    service_type?: string;
    amount_original: number;
    currency?: string;
    payment_method: 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'Card' | 'Other';
    transaction_reference?: string;
    payment_type?: string;
    notes?: string;
    idempotency_key?: string;
  }
) {
  assertPermission(actor, 'MANAGE_FINANCE');
  if (Number(input.amount_original) <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }
  const db = await getDb();

  const payCode = await nextReferenceCode(db, 'seq_payment_ref', 'PAY', 6);
  const rctCode = await nextReferenceCode(db, 'seq_receipt_ref', 'RCT', 4);
  const curr = (input.currency || 'GHS').toUpperCase();
  const fxRate = await getExchangeRateToGhs(db, curr);
  const amountOrig = Number(input.amount_original);
  const amountGhs = Number((amountOrig * fxRate).toFixed(2));

  // Locate target invoice(s) for allocation
  let targetInvoiceId = input.invoice_id || null;
  let targetCaseId = input.service_case_id || null;
  let targetServiceType = input.service_type || 'WORK ABROAD';

  if (targetInvoiceId) {
    const invLookup = await db.query<any>('SELECT * FROM invoices WHERE id = $1 LIMIT 1', [targetInvoiceId]);
    if (invLookup.rows[0]) {
      targetCaseId = targetCaseId || invLookup.rows[0].service_case_id;
      targetServiceType = invLookup.rows[0].service_type;
    }
  } else if (targetCaseId) {
    const invLookup = await db.query<any>(
      `SELECT * FROM invoices WHERE service_case_id = $1 AND status <> 'PAID' ORDER BY created_at ASC LIMIT 1`,
      [targetCaseId]
    );
    if (invLookup.rows[0]) {
      targetInvoiceId = invLookup.rows[0].id;
      targetServiceType = invLookup.rows[0].service_type;
    }
  }

  await db.query(
    `INSERT INTO payments (
      id, reference_code, receipt_number, client_id, service_case_id, invoice_id,
      service_type, payment_date, amount_original, currency, exchange_rate_to_ghs, amount_ghs,
      payment_method, transaction_reference, payment_type, payment_status, reconciled, received_by, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE,$8,$9,$10,$11,$12,$13,$14,'PAID',FALSE,$15,$16)`,
    [
      payCode,
      payCode,
      rctCode,
      input.client_id,
      targetCaseId,
      targetInvoiceId,
      targetServiceType,
      amountOrig,
      curr,
      fxRate,
      amountGhs,
      input.payment_method,
      input.transaction_reference || null,
      input.payment_type || 'Service Fee',
      actor.full_name,
      input.notes || null,
    ]
  );

  // Allocate payment to invoice and recalculate invoice status from authoritative allocations
  if (targetInvoiceId) {
    await db.query(
      `INSERT INTO payment_allocations (id, payment_id, invoice_id, allocated_amount_ghs)
       VALUES ($1, $2, $3, $4)`,
      [`ALLOC-${payCode}`, payCode, targetInvoiceId, amountGhs]
    );

    const allocSumRes = await db.query<any>(
      `SELECT COALESCE(SUM(pa.allocated_amount_ghs), 0) AS total_allocated
       FROM payment_allocations pa
       JOIN payments p ON p.id = pa.payment_id
       WHERE pa.invoice_id = $1 AND p.payment_status = 'PAID'`,
      [targetInvoiceId]
    );
    const invRes = await db.query<any>('SELECT total_amount_ghs FROM invoices WHERE id = $1', [targetInvoiceId]);
    const totalAllocated = Number(allocSumRes.rows[0]?.total_allocated || 0);
    const invTotal = Number(invRes.rows[0]?.total_amount_ghs || 0);
    const newInvStatus = totalAllocated >= invTotal ? 'PAID' : totalAllocated > 0 ? 'PARTIAL' : 'ISSUED';

    await db.query(`UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2`, [newInvStatus, targetInvoiceId]);
  }

  // Post Balanced Double-Entry Journal Entry:
  // Debit Cash/Bank/MoMo (1110 / 1120 / 1130), Credit Accounts Receivable (1200)
  const assetAccountByMethod: Record<string, string> = {
    Cash: '1110',
    'Bank Transfer': '1120',
    'Mobile Money': '1130',
    Card: '1120',
    Other: '1110',
  };
  const debitAccount = assetAccountByMethod[input.payment_method] || '1110';
  const jnlCode = await nextReferenceCode(db, 'seq_journal_ref', 'JNL', 6);

  await db.query(
    `INSERT INTO journal_entries (id, reference_code, entry_date, source_module, source_id, description, currency, exchange_rate, posted_by)
     VALUES ($1,$2,CURRENT_DATE,'PAYMENT',$3,$4,$5,$6,$7)`,
    [
      jnlCode,
      jnlCode,
      payCode,
      `Receipt ${rctCode} (${input.payment_method}) from client ${input.client_id}`,
      curr,
      fxRate,
      actor.full_name,
    ]
  );

  await db.query(
    `INSERT INTO journal_lines (id, journal_entry_id, account_code, debit_ghs, credit_ghs, client_id, service_case_id, memo)
     VALUES ($1,$2,$3,$4,0,$5,$6,$7), ($8,$2,'1200',0,$4,$5,$6,$7)`,
    [
      `${jnlCode}-L1`,
      jnlCode,
      debitAccount,
      amountGhs,
      input.client_id,
      targetCaseId,
      `Receipt ${rctCode} (${input.payment_type || 'Service Fee'})`,
      `${jnlCode}-L2`,
    ]
  );

  await writeAuditLog(
    actor,
    'PAYMENT_RECORDED',
    'PAYMENT',
    payCode,
    `Recorded payment ${payCode} (Receipt ${rctCode}) of ${curr} ${amountOrig} (GHS ${amountGhs.toFixed(2)}) via ${input.payment_method}`,
    { invoice_id: targetInvoiceId, journal_entry: jnlCode }
  );

  return {
    payment_id: payCode,
    receipt_number: rctCode,
    amount_ghs: amountGhs,
    journal_entry_id: jnlCode,
  };
}

export async function reconcilePayment(actor: AuthenticatedActor, paymentId: string) {
  assertPermission(actor, 'MANAGE_FINANCE');
  const db = await getDb();
  await db.query(
    `UPDATE payments SET reconciled = TRUE, reconciled_at = NOW(), reconciled_by = $1 WHERE id = $2`,
    [actor.full_name, paymentId]
  );
  await writeAuditLog(
    actor,
    'PAYMENT_RECONCILED',
    'PAYMENT',
    paymentId,
    `Reconciled payment ${paymentId} against bank/cash statement`
  );
  return { payment_id: paymentId, reconciled: true };
}

export async function recordOperatingExpense(
  actor: AuthenticatedActor,
  input: {
    category: string;
    expense_account_code: string;
    payment_account_code: string;
    supplier_or_payee: string;
    description: string;
    amount_original: number;
    currency?: string;
  }
) {
  assertPermission(actor, 'MANAGE_FINANCE');
  const db = await getDb();
  const expCode = await nextReferenceCode(db, 'seq_expense_ref', 'EXP', 6);
  const curr = (input.currency || 'GHS').toUpperCase();
  const fxRate = await getExchangeRateToGhs(db, curr);
  const amountOrig = Number(input.amount_original);
  const amountGhs = Number((amountOrig * fxRate).toFixed(2));
  const payStatus = input.payment_account_code === '2200' ? 'PAYABLE' : 'PAID';

  await db.query(
    `INSERT INTO operating_expenses (
      id, reference_code, expense_date, category, expense_account_code, payment_account_code,
      supplier_or_payee, description, amount_original, currency, exchange_rate_to_ghs, amount_ghs,
      payment_status, recorded_by, approved_by
    ) VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)`,
    [
      expCode,
      expCode,
      input.category,
      input.expense_account_code,
      input.payment_account_code,
      input.supplier_or_payee,
      input.description,
      amountOrig,
      curr,
      fxRate,
      amountGhs,
      payStatus,
      actor.full_name,
    ]
  );

  const jnlCode = await nextReferenceCode(db, 'seq_journal_ref', 'JNL', 6);
  await db.query(
    `INSERT INTO journal_entries (id, reference_code, entry_date, source_module, source_id, description, currency, exchange_rate, posted_by)
     VALUES ($1,$2,CURRENT_DATE,'EXPENSE',$3,$4,$5,$6,$7)`,
    [jnlCode, jnlCode, expCode, `Expense ${expCode}: ${input.description} (${input.supplier_or_payee})`, curr, fxRate, actor.full_name]
  );
  await db.query(
    `INSERT INTO journal_lines (id, journal_entry_id, account_code, debit_ghs, credit_ghs, memo)
     VALUES ($1,$2,$3,$4,0,$5), ($6,$2,$7,0,$4,$5)`,
    [
      `${jnlCode}-L1`,
      jnlCode,
      input.expense_account_code,
      amountGhs,
      input.description,
      `${jnlCode}-L2`,
      input.payment_account_code,
    ]
  );

  await writeAuditLog(
    actor,
    'EXPENSE_RECORDED',
    'EXPENSE',
    expCode,
    `Recorded operating expense ${expCode} of GHS ${amountGhs.toFixed(2)} to ${input.supplier_or_payee}`
  );

  return { expense_id: expCode, amount_ghs: amountGhs, journal_entry_id: jnlCode };
}

// ============================================================================
// 6. TASKS & COMMUNICATIONS
// ============================================================================
export async function logCommunication(
  actor: AuthenticatedActor,
  input: {
    client_id: string;
    service_case_id?: string;
    channel: 'WhatsApp' | 'Phone Call' | 'SMS' | 'Email' | 'Walk-In' | 'Internal Note' | 'Other';
    purpose: string;
    message_notes: string;
    outcome?: string;
    next_follow_up_date?: string;
    delivery_verification?: 'MANUAL_LOG' | 'DEEP_LINK_OPENED' | 'VERIFIED_API';
  }
) {
  assertPermission(actor, 'MANAGE_TASKS_COMMS');
  const db = await getDb();
  const commCode = await nextReferenceCode(db, 'seq_comm_ref', 'COMM', 6);

  await db.query(
    `INSERT INTO communications (
      id, reference_code, client_id, service_case_id, comm_date, staff_name,
      channel, purpose, message_notes, outcome, delivery_verification, next_follow_up_date
    ) VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7,$8,$9,$10,$11)`,
    [
      commCode,
      commCode,
      input.client_id,
      input.service_case_id || null,
      actor.full_name,
      input.channel,
      input.purpose,
      input.message_notes,
      input.outcome || null,
      input.delivery_verification || 'MANUAL_LOG',
      input.next_follow_up_date || null,
    ]
  );

  await db.query(
    `UPDATE clients
     SET last_contact_date = CURRENT_DATE,
         next_follow_up_date = COALESCE($1, next_follow_up_date),
         updated_at = NOW()
     WHERE id = $2`,
    [input.next_follow_up_date || null, input.client_id]
  );

  await writeAuditLog(
    actor,
    'COMMUNICATION_LOGGED',
    'COMMUNICATION',
    commCode,
    `Logged ${input.channel} outreach (${commCode}) for client ${input.client_id}: ${input.purpose}`
  );

  return { id: commCode, reference_code: commCode };
}

export async function createTask(
  actor: AuthenticatedActor,
  input: {
    client_id?: string;
    service_case_id?: string;
    title: string;
    assigned_staff_name?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    due_date: string;
    notes?: string;
  }
) {
  assertPermission(actor, 'MANAGE_TASKS_COMMS');
  const db = await getDb();
  const taskCode = await nextReferenceCode(db, 'seq_task_ref', 'TASK', 6);

  await db.query(
    `INSERT INTO tasks (id, reference_code, client_id, service_case_id, title, assigned_staff_name, priority, due_date, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'NOT STARTED',$9)`,
    [
      taskCode,
      taskCode,
      input.client_id || null,
      input.service_case_id || null,
      input.title,
      input.assigned_staff_name || actor.full_name,
      input.priority || 'NORMAL',
      input.due_date,
      input.notes || null,
    ]
  );

  await writeAuditLog(actor, 'TASK_CREATED', 'TASK', taskCode, `Created task ${taskCode}: ${input.title}`);
  return { id: taskCode, reference_code: taskCode };
}

export async function updateTaskStatus(
  actor: AuthenticatedActor,
  input: {
    task_id: string;
    status: 'NOT STARTED' | 'IN PROGRESS' | 'COMPLETED';
  }
) {
  assertPermission(actor, 'MANAGE_TASKS_COMMS');
  const db = await getDb();
  await db.query(
    `UPDATE tasks
     SET status = $1,
         completed_date = CASE WHEN $1 = 'COMPLETED' THEN CURRENT_DATE ELSE NULL END,
         updated_at = NOW()
     WHERE id = $2`,
    [input.status, input.task_id]
  );
  await writeAuditLog(actor, 'TASK_UPDATED', 'TASK', input.task_id, `Marked task ${input.task_id} as ${input.status}`);
  return { id: input.task_id, status: input.status };
}

// ============================================================================
// 7. COMPREHENSIVE SYSTEM SNAPSHOT & FINANCIAL STATEMENTS QUERY
// ============================================================================
export async function getSystemState(staffId = 'STF-01') {
  const db = await getDb();
  const actor = await getStaffActor(staffId);

  const [
    staffRes,
    clientsRes,
    casesRes,
    jobsRes,
    matchesRes,
    interviewsRes,
    studyOppsRes,
    studyAppsRes,
    docsRes,
    visasRes,
    flightsRes,
    toursRes,
    invoicesRes,
    paymentsRes,
    expensesRes,
    accountsRes,
    journalEntriesRes,
    journalLinesRes,
    tasksRes,
    commsRes,
    partnersRes,
    countriesRes,
    ratesRes,
    auditRes,
    workflowEventsRes,
    migrationRunsRes,
  ] = await Promise.all([
    db.query<any>('SELECT * FROM staff_users ORDER BY reference_code ASC'),
    db.query<any>('SELECT * FROM clients ORDER BY reference_code ASC'),
    db.query<any>(`
      SELECT sc.*, c.full_name AS client_name, c.phone AS client_phone,
             COALESCE((SELECT SUM(i.total_amount_ghs) FROM invoices i WHERE i.service_case_id = sc.id AND i.document_kind = 'INVOICE' AND i.status <> 'VOID'), sc.quoted_amount_ghs) AS derived_invoiced_ghs,
             COALESCE((SELECT SUM(p.amount_ghs) FROM payments p WHERE p.service_case_id = sc.id AND p.payment_status = 'PAID'), 0) AS derived_paid_ghs
      FROM service_cases sc
      JOIN clients c ON c.id = sc.client_id
      ORDER BY sc.reference_code ASC
    `),
    db.query<any>('SELECT * FROM job_opportunities ORDER BY reference_code ASC'),
    db.query<any>(`
      SELECT jm.*, c.full_name AS candidate_name, c.phone AS candidate_phone,
             jo.job_title, jo.employer_name, jo.country, jo.salary_minimum, jo.salary_currency
      FROM job_matches jm
      JOIN clients c ON c.id = jm.client_id
      JOIN job_opportunities jo ON jo.id = jm.opportunity_id
      ORDER BY jm.reference_code ASC
    `),
    db.query<any>(`
      SELECT i.*, c.full_name AS candidate_name, c.phone AS candidate_phone,
             jo.job_title, jo.employer_name, jo.country
      FROM interviews i
      JOIN clients c ON c.id = i.client_id
      JOIN job_opportunities jo ON jo.id = i.opportunity_id
      ORDER BY i.interview_date ASC, i.reference_code ASC
    `),
    db.query<any>('SELECT * FROM study_opportunities ORDER BY reference_code ASC'),
    db.query<any>(`
      SELECT sa.*, c.full_name AS student_name, so.institution_name, so.program_name, so.country
      FROM study_applications sa
      JOIN clients c ON c.id = sa.client_id
      JOIN study_opportunities so ON so.id = sa.study_opportunity_id
      ORDER BY sa.reference_code ASC
    `),
    db.query<any>(`
      SELECT cd.*, c.full_name AS candidate_name
      FROM client_documents cd
      JOIN clients c ON c.id = cd.client_id
      ORDER BY cd.reference_code ASC
    `),
    db.query<any>(`
      SELECT vc.*, c.full_name AS candidate_name
      FROM visa_cases vc
      JOIN clients c ON c.id = vc.client_id
      ORDER BY vc.reference_code ASC
    `),
    db.query<any>(`
      SELECT fb.*, c.full_name AS client_name
      FROM flight_bookings fb
      JOIN clients c ON c.id = fb.client_id
      ORDER BY fb.reference_code ASC
    `),
    db.query<any>(`
      SELECT tb.*, c.full_name AS client_name
      FROM tour_bookings tb
      JOIN clients c ON c.id = tb.client_id
      ORDER BY tb.reference_code ASC
    `),
    db.query<any>(`
      SELECT i.*, c.full_name AS client_name,
             COALESCE((SELECT SUM(pa.allocated_amount_ghs) FROM payment_allocations pa JOIN payments p ON p.id = pa.payment_id WHERE pa.invoice_id = i.id AND p.payment_status = 'PAID'), 0) AS paid_amount_ghs
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      ORDER BY i.reference_code ASC
    `),
    db.query<any>(`
      SELECT p.*, c.full_name AS client_name
      FROM payments p
      JOIN clients c ON c.id = p.client_id
      ORDER BY p.reference_code ASC
    `),
    db.query<any>('SELECT * FROM operating_expenses ORDER BY reference_code DESC'),
    db.query<any>('SELECT * FROM chart_of_accounts ORDER BY code ASC'),
    db.query<any>('SELECT * FROM journal_entries ORDER BY reference_code DESC'),
    db.query<any>(`
      SELECT jl.*, coa.name AS account_name, coa.account_type, coa.normal_balance, je.reference_code AS journal_code, je.entry_date, je.source_module
      FROM journal_lines jl
      JOIN chart_of_accounts coa ON coa.code = jl.account_code
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE je.is_reversed = FALSE
      ORDER BY je.reference_code ASC, jl.id ASC
    `),
    db.query<any>(`
      SELECT t.*, c.full_name AS client_name
      FROM tasks t
      LEFT JOIN clients c ON c.id = t.client_id
      ORDER BY t.due_date ASC, t.reference_code ASC
    `),
    db.query<any>(`
      SELECT cm.*, c.full_name AS client_name, c.phone AS client_phone, c.whatsapp_number
      FROM communications cm
      JOIN clients c ON c.id = cm.client_id
      ORDER BY cm.comm_date DESC, cm.reference_code DESC
    `),
    db.query<any>('SELECT * FROM partners_employers ORDER BY reference_code ASC'),
    db.query<any>('SELECT * FROM countries ORDER BY name ASC'),
    db.query<any>('SELECT * FROM exchange_rates ORDER BY currency_code ASC'),
    db.query<any>('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 60'),
    db.query<any>('SELECT * FROM workflow_events ORDER BY created_at DESC LIMIT 40'),
    db.query<any>('SELECT * FROM migration_runs ORDER BY created_at DESC LIMIT 10'),
  ]);

  // Enrich Clients with dynamic Age, Passport Status, and Financial Summaries
  const clients = clientsRes.rows.map((c) => {
    const age = calculateAge(c.date_of_birth);
    const passport_status = getPassportStatus(c.passport_available, c.passport_expiry_date);
    const clientCases = casesRes.rows.filter((sc) => sc.client_id === c.id);
    const totalInvoicedGhs = clientCases.reduce((acc, sc) => acc + Number(sc.derived_invoiced_ghs || 0), 0);
    const totalPaidGhs = clientCases.reduce((acc, sc) => acc + Number(sc.derived_paid_ghs || 0), 0);
    return {
      ...c,
      age,
      passport_status,
      cases_count: clientCases.length,
      total_invoiced_ghs: totalInvoicedGhs,
      total_paid_ghs: totalPaidGhs,
      outstanding_balance_ghs: Math.max(0, totalInvoicedGhs - totalPaidGhs),
    };
  });

  // Enrich Service Cases with derived balances & discrepancy flag
  const serviceCases = casesRes.rows.map((sc) => {
    const invoiced = Number(sc.derived_invoiced_ghs || sc.quoted_amount_ghs || 0);
    const paid = Number(sc.derived_paid_ghs || 0);
    const legacyPaid = Number(sc.legacy_reported_paid_ghs || 0);
    return {
      ...sc,
      invoiced_ghs: invoiced,
      paid_ghs: paid,
      outstanding_ghs: Math.max(0, invoiced - paid),
      has_unreceipted_legacy_discrepancy: legacyPaid !== paid && legacyPaid > 0,
    };
  });

  // Enrich Documents with live dynamic status
  const documents = docsRes.rows.map((d) => {
    let dynamicStatus = 'PENDING VERIFICATION';
    if (d.is_missing) {
      dynamicStatus = 'MISSING';
    } else if (d.expiry_date) {
      const expStatus = getPassportStatus(true, d.expiry_date);
      if (expStatus === 'Expired') dynamicStatus = 'EXPIRED';
      else if (expStatus === 'Expiring Soon') dynamicStatus = 'EXPIRING SOON';
      else if (d.verified) dynamicStatus = 'VERIFIED';
    } else if (d.verified) {
      dynamicStatus = 'VERIFIED';
    }
    return {
      ...d,
      document_status: dynamicStatus,
    };
  });

  // Compute Trial Balance, Income Statement, and Balance Sheet from balanced Journal Lines
  const trialBalance = accountsRes.rows.map((acct) => {
    const lines = journalLinesRes.rows.filter((l) => l.account_code === acct.code);
    const totalDebit = lines.reduce((s, l) => s + Number(l.debit_ghs || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit_ghs || 0), 0);
    const netBalance =
      acct.normal_balance === 'DEBIT' ? totalDebit - totalCredit : totalCredit - totalDebit;
    return {
      ...acct,
      total_debit_ghs: Number(totalDebit.toFixed(2)),
      total_credit_ghs: Number(totalCredit.toFixed(2)),
      net_balance_ghs: Number(netBalance.toFixed(2)),
    };
  });

  const totalDebits = trialBalance.reduce((s, a) => s + a.total_debit_ghs, 0);
  const totalCredits = trialBalance.reduce((s, a) => s + a.total_credit_ghs, 0);

  const revenueAccounts = trialBalance.filter((a) => a.account_type === 'REVENUE');
  const expenseAccounts = trialBalance.filter((a) => a.account_type === 'EXPENSE');
  const assetAccounts = trialBalance.filter((a) => a.account_type === 'ASSET');
  const liabilityAccounts = trialBalance.filter((a) => a.account_type === 'LIABILITY');
  const equityAccounts = trialBalance.filter((a) => a.account_type === 'EQUITY');

  const totalRecognizedRevenueGhs = revenueAccounts.reduce((s, a) => s + a.net_balance_ghs, 0);
  const totalExpensesGhs = expenseAccounts.reduce((s, a) => s + a.net_balance_ghs, 0);
  const netIncomeGhs = totalRecognizedRevenueGhs - totalExpensesGhs;

  const totalAssetsGhs = assetAccounts.reduce((s, a) => s + a.net_balance_ghs, 0);
  const totalLiabilitiesGhs = liabilityAccounts.reduce((s, a) => s + a.net_balance_ghs, 0);
  const totalEquityWithRetainedGhs = equityAccounts.reduce((s, a) => s + a.net_balance_ghs, 0) + netIncomeGhs;

  const cashAndBankGhs = trialBalance
    .filter((a) => ['1110', '1120', '1130'].includes(a.code))
    .reduce((s, a) => s + a.net_balance_ghs, 0);
  const accountsReceivableGhs =
    trialBalance.find((a) => a.code === '1200')?.net_balance_ghs ?? 0;

  return {
    actor,
    staff: staffRes.rows,
    clients,
    serviceCases,
    jobOpportunities: jobsRes.rows,
    jobMatches: matchesRes.rows.map((m) => ({
      ...m,
      effective_decision: m.override_decision || m.system_decision,
      score_breakdown: JSON.parse(m.score_breakdown_json || '{}'),
    })),
    interviews: interviewsRes.rows,
    studyOpportunities: studyOppsRes.rows,
    studyApplications: studyAppsRes.rows,
    documents,
    visaCases: visasRes.rows,
    flightBookings: flightsRes.rows,
    tourBookings: toursRes.rows,
    invoices: invoicesRes.rows.map((i) => ({
      ...i,
      paid_amount_ghs: Number(i.paid_amount_ghs || 0),
      outstanding_amount_ghs: Math.max(0, Number(i.total_amount_ghs) - Number(i.paid_amount_ghs || 0)),
    })),
    payments: paymentsRes.rows,
    operatingExpenses: expensesRes.rows,
    financialReports: {
      trialBalance,
      isLedgerBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      totalDebitsGhs: Number(totalDebits.toFixed(2)),
      totalCreditsGhs: Number(totalCredits.toFixed(2)),
      totalRecognizedRevenueGhs: Number(totalRecognizedRevenueGhs.toFixed(2)),
      totalExpensesGhs: Number(totalExpensesGhs.toFixed(2)),
      netIncomeGhs: Number(netIncomeGhs.toFixed(2)),
      cashAndBankGhs: Number(cashAndBankGhs.toFixed(2)),
      accountsReceivableGhs: Number(accountsReceivableGhs.toFixed(2)),
      totalAssetsGhs: Number(totalAssetsGhs.toFixed(2)),
      totalLiabilitiesGhs: Number(totalLiabilitiesGhs.toFixed(2)),
      totalEquityWithRetainedGhs: Number(totalEquityWithRetainedGhs.toFixed(2)),
    },
    journalEntries: journalEntriesRes.rows,
    journalLines: journalLinesRes.rows,
    tasks: tasksRes.rows,
    communications: commsRes.rows,
    partners: partnersRes.rows,
    countries: countriesRes.rows,
    exchangeRates: ratesRes.rows,
    auditLogs: auditRes.rows,
    workflowEvents: workflowEventsRes.rows,
    migrationRuns: migrationRunsRes.rows,
  };
}

// ============================================================================
// 8. STAFF MANAGEMENT (CEO / ADMIN PROVISIONING)
// ============================================================================
export async function clearAllStaffExceptCeo(actor: AuthenticatedActor) {
  assertPermission(actor, 'MANAGE_ADMIN_SETTINGS');
  const db = await getDb();

  const ceoRes = await db.query<any>('SELECT * FROM staff_users WHERE id = $1 OR reference_code = $1', ['STF-01']);
  if (!ceoRes.rows.length) {
    throw new Error('Founder/CEO account STF-01 was not found in the database.');
  }
  const ceo = ceoRes.rows[0];

  await db.query(`UPDATE clients SET assigned_staff_id = $1, assigned_staff_name = $2 WHERE assigned_staff_id <> $1`, [ceo.id, ceo.full_name]);
  await db.query(`UPDATE service_cases SET assigned_staff_id = $1, assigned_staff_name = $2 WHERE assigned_staff_id <> $1`, [ceo.id, ceo.full_name]);
  await db.query(`UPDATE tasks SET assigned_staff_name = $1 WHERE assigned_staff_name <> $1`, [ceo.full_name]);

  const deleted = await db.query<any>(`DELETE FROM staff_users WHERE id <> $1 RETURNING id, reference_code, full_name, primary_role`, [ceo.id]);

  await writeAuditLog(
    actor,
    'DELETE',
    'staff_users',
    'ALL_NON_CEO',
    `CEO ${actor.full_name} cleared all staff accounts leaving only CEO (${ceo.full_name}, ${ceo.id}).`,
    { count: deleted.rows.length, removedStaff: deleted.rows }
  );

  return { clearedCount: deleted.rows.length, removed: deleted.rows };
}

export async function createStaffMember(
  actor: AuthenticatedActor,
  payload: {
    full_name: string;
    primary_role: SystemRole;
    roles?: SystemRole[];
    phone?: string;
    email: string;
    branch?: string;
  }
) {
  assertPermission(actor, 'MANAGE_ADMIN_SETTINGS');

  const fullName = (payload.full_name || '').trim();
  const email = (payload.email || '').trim().toLowerCase();
  const primaryRole = payload.primary_role;
  const phone = (payload.phone || '').trim();
  const branch = (payload.branch || '').trim() || 'Ajumako Head Office';

  if (!fullName) throw new Error('Full Name is required.');
  if (!email) throw new Error('Email is required.');
  if (!primaryRole) throw new Error('Primary Role is required.');

  const db = await getDb();

  const existingEmail = await db.query('SELECT id FROM staff_users WHERE LOWER(email) = $1', [email]);
  if (existingEmail.rows.length > 0) {
    throw new Error(`A staff member with email '${email}' already exists.`);
  }

  const existingStaff = await db.query<any>('SELECT reference_code FROM staff_users');
  let maxNum = 1;
  for (const s of existingStaff.rows) {
    const match = (s.reference_code || '').match(/STF-(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  const nextNum = maxNum + 1;
  const refCode = `STF-${String(nextNum).padStart(2, '0')}`;

  const assignedRoles: SystemRole[] = Array.isArray(payload.roles) && payload.roles.length > 0
    ? payload.roles
    : [primaryRole];
  if (!assignedRoles.includes(primaryRole)) {
    assignedRoles.unshift(primaryRole);
  }

  const res = await db.query<any>(
    `INSERT INTO staff_users (id, reference_code, legacy_id, full_name, primary_role, roles_json, phone, email, branch, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active')
     RETURNING *`,
    [
      refCode,
      refCode,
      refCode,
      fullName,
      primaryRole,
      JSON.stringify(assignedRoles),
      phone,
      email,
      branch,
    ]
  );

  const newStaff = res.rows[0];

  await writeAuditLog(
    actor,
    'CREATE',
    'staff_users',
    refCode,
    `CEO ${actor.full_name} created new staff member ${fullName} (${primaryRole}) with reference ${refCode}.`,
    newStaff
  );

  return newStaff;
}

export async function deleteStaffMember(actor: AuthenticatedActor, staffId: string) {
  assertPermission(actor, 'MANAGE_ADMIN_SETTINGS');
  if (staffId === 'STF-01') {
    throw new Error('The Founder/CEO account cannot be deleted.');
  }

  const db = await getDb();
  const ceoRes = await db.query<any>('SELECT * FROM staff_users WHERE id = $1 OR reference_code = $1', ['STF-01']);
  const ceo = ceoRes.rows[0] || { id: 'STF-01', full_name: 'Isaac Agya Koomson' };

  await db.query(`UPDATE clients SET assigned_staff_id = $1, assigned_staff_name = $2 WHERE assigned_staff_id = $3`, [ceo.id, ceo.full_name, staffId]);
  await db.query(`UPDATE service_cases SET assigned_staff_id = $1, assigned_staff_name = $2 WHERE assigned_staff_id = $3`, [ceo.id, ceo.full_name, staffId]);

  const deleted = await db.query<any>(`DELETE FROM staff_users WHERE id = $1 RETURNING *`, [staffId]);
  if (!deleted.rows.length) {
    throw new Error(`Staff member with ID '${staffId}' not found.`);
  }

  await writeAuditLog(
    actor,
    'DELETE',
    'staff_users',
    staffId,
    `CEO ${actor.full_name} deleted staff member ${deleted.rows[0]?.full_name} (${staffId}).`,
    deleted.rows[0]
  );

  return deleted.rows[0];
}

// ============================================================================
// 9. PURGE DEMO CLIENTS & FINANCIAL TRANSACTIONS (RETAIN JOB OPPORTUNITIES)
// ============================================================================
export async function clearDemoData(actor: AuthenticatedActor) {
  assertPermission(actor, 'MANAGE_ADMIN_SETTINGS');
  const db = await getDb();

  // 1. Delete all transactional, client-linked, and ledger records
  await db.query('DELETE FROM payment_allocations');
  await db.query('DELETE FROM payments');
  await db.query('DELETE FROM invoices');
  await db.query('DELETE FROM journal_lines');
  await db.query('DELETE FROM journal_entries');
  await db.query('DELETE FROM operating_expenses');
  await db.query('DELETE FROM interviews');
  await db.query('DELETE FROM job_matches');
  await db.query('DELETE FROM client_documents');
  await db.query('DELETE FROM visa_cases');
  await db.query('DELETE FROM flight_bookings');
  await db.query('DELETE FROM tour_bookings');
  await db.query('DELETE FROM study_applications');
  await db.query('DELETE FROM tasks');
  await db.query('DELETE FROM communications');
  await db.query('DELETE FROM service_cases');
  await db.query('DELETE FROM clients');
  await db.query('DELETE FROM workflow_events');

  // 2. Reset sequences for clean starting IDs (KSC-000001, CASE-000001, etc.)
  const sequences = [
    'seq_client_ref',
    'seq_case_ref',
    'seq_match_ref',
    'seq_interview_ref',
    'seq_doc_ref',
    'seq_visa_ref',
    'seq_ticket_ref',
    'seq_tour_ref',
    'seq_invoice_ref',
    'seq_payment_ref',
    'seq_receipt_ref',
    'seq_expense_ref',
    'seq_journal_ref',
    'seq_task_ref',
    'seq_comm_ref',
  ];

  for (const seq of sequences) {
    try {
      await db.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
    } catch {
      // ignore if engine doesn't support sequence restart
    }
  }

  // Count preserved master job opportunities and employers
  const jobsCount = await db.query<{ count: string }>('SELECT COUNT(*) AS count FROM job_opportunities');
  const partnersCount = await db.query<{ count: string }>('SELECT COUNT(*) AS count FROM partners_employers');

  await writeAuditLog(
    actor,
    'DELETE',
    'system_demo_data',
    'DEMO_DATA_PURGE',
    `CEO ${actor.full_name} purged all dummy client, case, matching, task, and ledger data. Real job opportunities (${jobsCount.rows[0]?.count || 0}) and employers (${partnersCount.rows[0]?.count || 0}) preserved for live operations.`,
    {
      preserved_job_opportunities: Number(jobsCount.rows[0]?.count || 0),
      preserved_employers: Number(partnersCount.rows[0]?.count || 0),
    }
  );

  return {
    success: true,
    preserved_job_opportunities: Number(jobsCount.rows[0]?.count || 0),
    preserved_employers: Number(partnersCount.rows[0]?.count || 0),
  };
}
