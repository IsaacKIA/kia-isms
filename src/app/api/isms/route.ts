import { NextRequest, NextResponse } from 'next/server';
import {
  getSystemState,
  getStaffActor,
  registerClient,
  createServiceCase,
  updateServiceCaseStage,
  createJobMatch,
  overrideMatchEligibility,
  scheduleInterview,
  recordInterviewOutcome,
  verifyAndUpdateDocument,
  createOrUpdateVisaCase,
  createStudyApplication,
  updateStudyApplicationStatus,
  createFlightBooking,
  createInvoice,
  recordPayment,
  reconcilePayment,
  recordOperatingExpense,
  logCommunication,
  createTask,
  updateTaskStatus,
  createStaffMember,
  deleteStaffMember,
  clearAllStaffExceptCeo,
  clearDemoData,
} from '@/lib/services/isms-service';
import { runWorkbookMigrationAnalysis } from '@/lib/migration/excel-migrator';

export async function GET(req: NextRequest) {
  try {
    const staffId = req.nextUrl.searchParams.get('staffId') || 'STF-01';
    const state = await getSystemState(staffId);
    return NextResponse.json({ ok: true, data: state });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to load system state.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, staffId = 'STF-01', payload = {} } = body;
    const actor = await getStaffActor(staffId);

    let result: any;
    switch (action) {
      case 'REGISTER_CLIENT':
        result = await registerClient(actor, payload);
        break;
      case 'CREATE_SERVICE_CASE':
        result = await createServiceCase(actor, payload);
        break;
      case 'UPDATE_CASE_STAGE':
        result = await updateServiceCaseStage(actor, payload);
        break;
      case 'CREATE_JOB_MATCH':
        result = await createJobMatch(actor, payload);
        break;
      case 'OVERRIDE_MATCH_ELIGIBILITY':
        result = await overrideMatchEligibility(actor, payload);
        break;
      case 'SCHEDULE_INTERVIEW':
        result = await scheduleInterview(actor, payload);
        break;
      case 'RECORD_INTERVIEW_OUTCOME':
        result = await recordInterviewOutcome(actor, payload);
        break;
      case 'VERIFY_DOCUMENT':
        result = await verifyAndUpdateDocument(actor, payload);
        break;
      case 'UPDATE_VISA_CASE':
        result = await createOrUpdateVisaCase(actor, payload);
        break;
      case 'CREATE_STUDY_APPLICATION':
        result = await createStudyApplication(actor, payload);
        break;
      case 'UPDATE_STUDY_APPLICATION':
        result = await updateStudyApplicationStatus(actor, payload);
        break;
      case 'CREATE_FLIGHT_BOOKING':
        result = await createFlightBooking(actor, payload);
        break;
      case 'CREATE_INVOICE':
        result = await createInvoice(actor, payload);
        break;
      case 'RECORD_PAYMENT':
        result = await recordPayment(actor, payload);
        break;
      case 'RECONCILE_PAYMENT':
        result = await reconcilePayment(actor, payload.payment_id);
        break;
      case 'RECORD_EXPENSE':
        result = await recordOperatingExpense(actor, payload);
        break;
      case 'LOG_COMMUNICATION':
        result = await logCommunication(actor, payload);
        break;
      case 'CREATE_TASK':
        result = await createTask(actor, payload);
        break;
      case 'UPDATE_TASK_STATUS':
        result = await updateTaskStatus(actor, payload);
        break;
      case 'RUN_MIGRATION_ANALYSIS':
        result = await runWorkbookMigrationAnalysis(actor, payload);
        break;
      case 'CREATE_STAFF':
        result = await createStaffMember(actor, payload);
        break;
      case 'DELETE_STAFF':
        result = await deleteStaffMember(actor, payload.staff_id);
        break;
      case 'CLEAR_NON_CEO_STAFF':
        result = await clearAllStaffExceptCeo(actor);
        break;
      case 'CLEAR_DEMO_DATA':
        result = await clearDemoData(actor);
        break;
      default:
        return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    const updatedState = await getSystemState(staffId);
    return NextResponse.json({ ok: true, result, data: updatedState });
  } catch (err: any) {
    const isDenied = err?.message?.includes('Access Denied');
    return NextResponse.json(
      { ok: false, error: err?.message || 'Operation failed.' },
      { status: isDenied ? 403 : 400 }
    );
  }
}
