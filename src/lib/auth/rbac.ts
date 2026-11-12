export type SystemRole =
  | 'FOUNDER_CEO'
  | 'OPERATIONS_MANAGER'
  | 'RECRUITMENT_OFFICER'
  | 'VISA_DOCUMENTATION_OFFICER'
  | 'STUDY_ADVISOR'
  | 'TICKETING_OFFICER'
  | 'FINANCE_OFFICER'
  | 'ADMINISTRATOR';

export type Permission =
  | 'VIEW_CEO_DASHBOARD'
  | 'MANAGE_CLIENTS'
  | 'MANAGE_WORK_ABROAD'
  | 'OVERRIDE_ELIGIBILITY'
  | 'MANAGE_STUDY_ABROAD'
  | 'MANAGE_VISA_DOCUMENTS'
  | 'VERIFY_DOCUMENTS'
  | 'MANAGE_FLIGHTS_TOURISM'
  | 'VIEW_FINANCE'
  | 'MANAGE_FINANCE'
  | 'APPROVE_FINANCE_REVERSAL'
  | 'MANAGE_TASKS_COMMS'
  | 'MANAGE_ADMIN_SETTINGS'
  | 'RUN_EXCEL_MIGRATION';

const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  FOUNDER_CEO: [
    'VIEW_CEO_DASHBOARD',
    'MANAGE_CLIENTS',
    'MANAGE_WORK_ABROAD',
    'OVERRIDE_ELIGIBILITY',
    'MANAGE_STUDY_ABROAD',
    'MANAGE_VISA_DOCUMENTS',
    'VERIFY_DOCUMENTS',
    'MANAGE_FLIGHTS_TOURISM',
    'VIEW_FINANCE',
    'MANAGE_FINANCE',
    'APPROVE_FINANCE_REVERSAL',
    'MANAGE_TASKS_COMMS',
    'MANAGE_ADMIN_SETTINGS',
    'RUN_EXCEL_MIGRATION',
  ],
  OPERATIONS_MANAGER: [
    'VIEW_CEO_DASHBOARD',
    'MANAGE_CLIENTS',
    'MANAGE_WORK_ABROAD',
    'OVERRIDE_ELIGIBILITY',
    'MANAGE_STUDY_ABROAD',
    'MANAGE_VISA_DOCUMENTS',
    'VERIFY_DOCUMENTS',
    'MANAGE_FLIGHTS_TOURISM',
    'VIEW_FINANCE',
    'MANAGE_TASKS_COMMS',
  ],
  RECRUITMENT_OFFICER: [
    'MANAGE_CLIENTS',
    'MANAGE_WORK_ABROAD',
    'OVERRIDE_ELIGIBILITY',
    'MANAGE_TASKS_COMMS',
  ],
  VISA_DOCUMENTATION_OFFICER: [
    'MANAGE_CLIENTS',
    'MANAGE_VISA_DOCUMENTS',
    'VERIFY_DOCUMENTS',
    'MANAGE_TASKS_COMMS',
  ],
  STUDY_ADVISOR: [
    'MANAGE_CLIENTS',
    'MANAGE_STUDY_ABROAD',
    'MANAGE_VISA_DOCUMENTS',
    'MANAGE_TASKS_COMMS',
  ],
  TICKETING_OFFICER: [
    'MANAGE_CLIENTS',
    'MANAGE_FLIGHTS_TOURISM',
    'MANAGE_TASKS_COMMS',
  ],
  FINANCE_OFFICER: [
    'VIEW_CEO_DASHBOARD',
    'VIEW_FINANCE',
    'MANAGE_FINANCE',
    'APPROVE_FINANCE_REVERSAL',
    'MANAGE_TASKS_COMMS',
  ],
  ADMINISTRATOR: [
    'VIEW_CEO_DASHBOARD',
    'MANAGE_CLIENTS',
    'MANAGE_WORK_ABROAD',
    'OVERRIDE_ELIGIBILITY',
    'MANAGE_STUDY_ABROAD',
    'MANAGE_VISA_DOCUMENTS',
    'VERIFY_DOCUMENTS',
    'MANAGE_FLIGHTS_TOURISM',
    'VIEW_FINANCE',
    'MANAGE_TASKS_COMMS',
    'MANAGE_ADMIN_SETTINGS',
    'RUN_EXCEL_MIGRATION',
  ],
};

export interface AuthenticatedActor {
  id: string;
  reference_code: string;
  full_name: string;
  email: string;
  primary_role: SystemRole;
  roles: SystemRole[];
  branch: string;
}

export function mapWorkbookRoleToSystemRoles(workbookRole: string): SystemRole[] {
  const normalized = (workbookRole || '').toUpperCase().trim();
  switch (normalized) {
    case 'MANAGER':
      return ['FOUNDER_CEO', 'OPERATIONS_MANAGER', 'ADMINISTRATOR'];
    case 'RECRUITMENT OFFICER':
      return ['RECRUITMENT_OFFICER'];
    case 'VISA OFFICER':
      return ['VISA_DOCUMENTATION_OFFICER'];
    case 'DOCUMENT OFFICER':
      return ['VISA_DOCUMENTATION_OFFICER'];
    case 'STUDY ADVISOR':
      return ['STUDY_ADVISOR'];
    case 'FINANCE':
      return ['FINANCE_OFFICER'];
    case 'TICKETING OFFICER':
      return ['TICKETING_OFFICER'];
    case 'ADMIN':
      return ['ADMINISTRATOR'];
    default:
      return ['RECRUITMENT_OFFICER'];
  }
}

export function hasPermission(actor: AuthenticatedActor, permission: Permission): boolean {
  for (const r of actor.roles) {
    if (ROLE_PERMISSIONS[r]?.includes(permission)) {
      return true;
    }
  }
  return false;
}

export function assertPermission(actor: AuthenticatedActor, permission: Permission): void {
  if (!hasPermission(actor, permission)) {
    throw new Error(
      `Access Denied: Staff member ${actor.full_name} (${actor.roles.join(', ')}) does not hold required permission '${permission}'.`
    );
  }
}
