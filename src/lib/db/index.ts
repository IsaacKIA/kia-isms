import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { evaluateCandidateMatch } from '../matching/engine';
import { mapWorkbookRoleToSystemRoles } from '../auth/rbac';

export interface QueryResult<T = Record<string, any>> {
  rows: T[];
}

export interface DatabaseAdapter {
  query<T = Record<string, any>>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
}

declare global {
  // eslint-disable-next-line no-var
  var __kiaDbPromise: Promise<DatabaseAdapter> | undefined;
}

export function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('233') && digits.length === 12) {
    return '0' + digits.slice(3);
  }
  if (digits.length === 9 && !digits.startsWith('0')) {
    return '0' + digits;
  }
  return digits;
}

async function createAdapter(): Promise<DatabaseAdapter> {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.startsWith('postgres')) {
    const pool = new Pool({ connectionString: dbUrl });
    return {
      async query<T = Record<string, any>>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
        const res = await pool.query(sql, params);
        return { rows: res.rows as T[] };
      },
      async exec(sql: string): Promise<void> {
        await pool.query(sql);
      },
    };
  }

  const dataDir = process.env.PGLITE_DATA_DIR || path.join(process.cwd(), 'data', 'pgdata');
  fs.mkdirSync(path.dirname(dataDir), { recursive: true });
  const pglite = new PGlite(dataDir);
  await pglite.waitReady;

  return {
    async query<T = Record<string, any>>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
      const res = await pglite.query<T>(sql, params);
      return { rows: res.rows };
    },
    async exec(sql: string): Promise<void> {
      await pglite.exec(sql);
    },
  };
}

export async function getDb(): Promise<DatabaseAdapter> {
  if (!global.__kiaDbPromise) {
    global.__kiaDbPromise = (async () => {
      const adapter = await createAdapter();
      await initializeSchemaAndSeed(adapter);
      return adapter;
    })();
  }
  return global.__kiaDbPromise;
}

export async function nextReferenceCode(
  db: DatabaseAdapter,
  sequenceName: string,
  prefix: string,
  padLength = 6
): Promise<string> {
  const res = await db.query<{ nextval: string | number }>(`SELECT nextval('${sequenceName}') AS nextval`);
  const num = Number(res.rows[0]?.nextval || 1);
  return `${prefix}-${String(num).padStart(padLength, '0')}`;
}

async function initializeSchemaAndSeed(db: DatabaseAdapter): Promise<void> {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '0001_kia_isms_schema.sql');
  const schemaSql = fs.readFileSync(migrationPath, 'utf-8');
  await db.exec(schemaSql);

  const existingStaff = await db.query<{ count: string }>('SELECT COUNT(*) AS count FROM staff_users');
  if (Number(existingStaff.rows[0]?.count || 0) > 0) {
    return;
  }

  // 1. Seed Chart of Accounts (Double-Entry Ledger Foundation)
  const accounts = [
    ['1110', 'Cash on Hand (Ajumako & Accra Offices)', 'ASSET', 'DEBIT', 'Physical GHS cash drawer'],
    ['1120', 'Corporate Bank Account (GHS)', 'ASSET', 'DEBIT', 'Primary commercial bank account'],
    ['1130', 'Mobile Money Merchant Wallet (MTN/Telecel)', 'ASSET', 'DEBIT', 'MoMo collections account'],
    ['1200', 'Accounts Receivable — Clients', 'ASSET', 'DEBIT', 'Billed client invoices awaiting settlement'],
    ['2100', 'Customer Advances / Unearned Revenue', 'LIABILITY', 'CREDIT', 'Client deposits held prior to milestone completion'],
    ['2200', 'Accounts Payable — Suppliers & Airlines', 'LIABILITY', 'CREDIT', 'Unpaid supplier, embassy, or airline obligations'],
    ['2300', 'Client Refund Liabilities', 'LIABILITY', 'CREDIT', 'Approved client refunds pending disbursement'],
    ['3100', 'Owner Equity & Retained Earnings', 'EQUITY', 'CREDIT', 'KIA-Start Up Consult capital & retained earnings'],
    ['4100', 'Registration & Consultation Revenue', 'REVENUE', 'CREDIT', 'Earned initial registration & advisory fees'],
    ['4200', 'Work Abroad Placement & Processing Revenue', 'REVENUE', 'CREDIT', 'Earned recruitment & deployment service revenue'],
    ['4300', 'Study Abroad Advisory Revenue', 'REVENUE', 'CREDIT', 'Earned university placement & study advisory fees'],
    ['4400', 'Visa Assistance Service Revenue', 'REVENUE', 'CREDIT', 'Earned visa documentation & support revenue'],
    ['4500', 'Flight Booking & Tourism Revenue', 'REVENUE', 'CREDIT', 'Earned air ticketing & tour package revenue'],
    ['5100', 'Direct Airline & Tour Supplier Costs', 'EXPENSE', 'DEBIT', 'Cost of tickets and tour suppliers'],
    ['6100', 'Office Rent, Utilities & Administration', 'EXPENSE', 'DEBIT', 'Ajumako & Accra office operating expenses'],
    ['6200', 'Marketing, Recruitment Drives & Outreach', 'EXPENSE', 'DEBIT', 'Advertising, interview venue logistics & outreach'],
    ['6300', 'Staff Salaries & Field Allowances', 'EXPENSE', 'DEBIT', 'Personnel and operational allowances'],
  ];
  for (const [code, name, type, normal, desc] of accounts) {
    await db.query(
      `INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, description)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO NOTHING`,
      [code, name, type, normal, desc]
    );
  }

  // 2. Seed Countries (15 from workbook + United Kingdom to fix CASE-000008!)
  const countries = [
    ['United Arab Emirates', 'Middle East', 'Yes'],
    ['Saudi Arabia', 'Middle East', 'Yes'],
    ['Qatar', 'Middle East', 'Yes'],
    ['Czech Republic', 'Europe', 'Yes'],
    ['Hungary', 'Europe', 'Yes'],
    ['Poland', 'Europe', 'Yes'],
    ['Latvia', 'Europe', 'Yes'],
    ['Lithuania', 'Europe', 'Yes'],
    ['Slovakia', 'Europe', 'Yes'],
    ['Serbia', 'Europe', 'Yes'],
    ['Finland', 'Europe', 'Yes'],
    ['Germany', 'Europe', 'Yes'],
    ['United Kingdom', 'Europe', 'Yes'],
    ['Argentina', 'South America', 'Yes'],
    ['United States', 'North America', 'Yes'],
    ['Ghana', 'Africa', 'Home Market'],
  ];
  for (const [name, region, active] of countries) {
    await db.query(
      `INSERT INTO countries (id, name, region_continent, active_status)
       VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING`,
      [name.toLowerCase().replace(/\s+/g, '-'), name, region, active]
    );
  }

  // 3. Seed Exchange Rates (from workbook Exchange Rates sheet)
  const rates: [string, number, string, string, string][] = [
    ['AED', 4.3, '2026-08-20', 'Bank of Ghana / Market Rate', 'Update regularly - UAE dirham'],
    ['SAR', 4.35, '2026-08-20', 'Bank of Ghana / Market Rate', 'Saudi riyal'],
    ['USD', 16.3, '2026-08-20', 'Bank of Ghana', 'US Dollar'],
    ['EUR', 17.6, '2026-08-20', 'Bank of Ghana', 'Euro'],
    ['GBP', 20.6, '2026-08-20', 'Bank of Ghana', 'British Pound'],
    ['GHS', 1.0, '2026-08-20', 'Base Currency', 'Do not edit'],
  ];
  for (const [code, rate, effDate, source, notes] of rates) {
    await db.query(
      `INSERT INTO exchange_rates (currency_code, rate_to_ghs, effective_date, source, notes)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (currency_code) DO NOTHING`,
      [code, rate, effDate, source, notes]
    );
  }

  // 4. Seed Staff (Only Founder & CEO initially; additional staff onboarded dynamically via ISMS UI)
  const staffRows: [string, string, string, string, string, string, string][] = [
    ['STF-01', 'Isaac Agya Koomson', 'MANAGER', '024 000 0001', 'isaac@kiastartupconsult.com', 'Ajumako Head Office', 'Active'],
  ];
  const staffIdByName: Record<string, string> = {};
  for (const [code, fullName, wbRole, phone, email, branch, status] of staffRows) {
    const sysRoles = mapWorkbookRoleToSystemRoles(wbRole);
    staffIdByName[fullName] = code;
    await db.query(
      `INSERT INTO staff_users (id, reference_code, legacy_id, full_name, primary_role, roles_json, phone, email, branch, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [code, code, code, fullName, sysRoles[0], JSON.stringify(sysRoles), phone, email, branch, status]
    );
  }

  // 5. Seed Employers / Partners (9 partners from Employers sheet)
  const partners: [string, string, string, string, string, string, string, string, string][] = [
    ['PTR-001', 'Ejadah', 'DIRECT EMPLOYER', 'United Arab Emirates', 'Dubai', 'Hospitality/Facilities', 'Verified', 'Signed', 'Multiple hospitality roles - see Opportunities'],
    ['PTR-002', 'Dubai General Helpers', 'RECRUITMENT AGENCY', 'United Arab Emirates', 'Dubai', 'Warehouse/Logistics', 'Verified', 'Signed', ''],
    ['PTR-003', 'Arkan', 'DIRECT EMPLOYER', 'United Arab Emirates', 'Dubai', 'Security', 'Verified', 'Signed', ''],
    ['PTR-004', 'Transguard Group', 'DIRECT EMPLOYER', 'United Arab Emirates', 'Dubai', 'Aviation Security', 'Verified', 'Signed', 'Code MUW-TGS-01-26'],
    ['PTR-005', 'A.I.M.', 'DIRECT EMPLOYER', 'United Arab Emirates', 'Dubai', 'Transport/Logistics', 'Verified', 'Signed', 'Code AIM-WI-01-26'],
    ['PTR-006', 'KFC', 'DIRECT EMPLOYER', 'United Arab Emirates', 'Dubai', 'Food & Beverage', 'Verified', 'Signed', 'Code KHM-MR-01-26'],
    ['PTR-007', 'Sraco', 'RECRUITMENT AGENCY', 'Saudi Arabia', '', 'Transport/Logistics', 'Verified', 'Signed', 'Code SUM-SRC-01-26'],
    ['PTR-008', 'Almarai', 'DIRECT EMPLOYER', 'Saudi Arabia', '', 'Transport/Logistics', 'Verified', 'Signed', 'Code ALM-01-26 - Free recruitment'],
    ['PTR-009', 'Ghana Aerospace Factory Program', 'DIRECT EMPLOYER', 'Argentina', '', 'Aerospace/Engineering', 'Pending', 'Under Review', 'Code LIM-DMC-01-26 - trainees return to Ghana'],
  ];
  const partnerIdByName: Record<string, string> = {};
  for (const [code, orgName, pType, country, city, industry, verStatus, agrStatus, notes] of partners) {
    partnerIdByName[orgName] = code;
    await db.query(
      `INSERT INTO partners_employers (id, reference_code, legacy_id, organization_name, partner_type, country, city, industry, verification_status, agreement_status, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Active', $11)`,
      [code, code, code, orgName, pType, country, city || null, industry, verStatus, agrStatus, notes || null]
    );
  }

  // 6. Real Job Opportunities (Demo Candidates Removed for Live Production)
  const candidates: any[] = [];

  // 7. Seed 12 Job Opportunities from Opportunities worksheet
  const jobs = [
    {
      code: 'JOB-000001', country: 'United Arab Emirates', city: 'Dubai', employer: 'Ejadah',
      title: 'Attraction Attendant / Retail Attendant / Wardrobe Attendant', sector: 'Retail',
      desc: 'Attraction, retail and wardrobe attendant roles at UAE facilities management client.',
      gender: 'Any', minAge: 20, maxAge: 35, edu: 'SHS/WASSCE', expType: 'Preferred', expYrs: 0,
      licReq: false, licType: null, pccReq: false, salMin: 1500, salMax: 1500, curr: 'AED',
      food: false, accom: false, intStart: null, intEnd: null, deadline: null, recCode: null,
      verStatus: 'Verified', expDate: null, notes: 'Sponsored contract.',
    },
    {
      code: 'JOB-000002', country: 'United Arab Emirates', city: 'Dubai', employer: 'Ejadah',
      title: 'Commis Chef / Bar Attendant / Cashier', sector: 'Food & Beverage',
      desc: 'Commis chef, bar attendant and cashier roles with employer-sponsored contract.',
      gender: 'Any', minAge: 20, maxAge: 38, edu: 'SHS/WASSCE', expType: 'Preferred', expYrs: 1,
      licReq: false, licType: null, pccReq: false, salMin: 1500, salMax: 1500, curr: 'AED',
      food: true, accom: false, intStart: null, intEnd: null, deadline: null, recCode: null,
      verStatus: 'Verified', expDate: null, notes: 'Employer-sponsored contract.',
    },
    {
      code: 'JOB-000003', country: 'United Arab Emirates', city: 'Dubai', employer: 'Ejadah',
      title: 'Room Attendant - Experienced', sector: 'Hospitality',
      desc: 'Experienced room attendant for hotel/facilities client.',
      gender: 'Any', minAge: 20, maxAge: 40, edu: 'Basic/JHS', expType: 'Required', expYrs: 1,
      licReq: false, licType: null, pccReq: false, salMin: 1200, salMax: 1200, curr: 'AED',
      food: true, accom: false, intStart: null, intEnd: null, deadline: null, recCode: null,
      verStatus: 'Verified', expDate: null, notes: 'Must have prior housekeeping experience.',
    },
    {
      code: 'JOB-000004', country: 'United Arab Emirates', city: 'Dubai', employer: 'Ejadah',
      title: 'Kitchen Steward / Room Attendant - Entry Level', sector: 'Hospitality',
      desc: 'Entry-level kitchen steward / room attendant roles.',
      gender: 'Any', minAge: 20, maxAge: 40, edu: 'Basic/JHS', expType: 'Not Required', expYrs: 0,
      licReq: false, licType: null, pccReq: false, salMin: 1078, salMax: 1078, curr: 'AED',
      food: true, accom: false, intStart: null, intEnd: null, deadline: null, recCode: null,
      verStatus: 'Verified', expDate: null, notes: 'Entry level - no experience required.',
    },
    {
      code: 'JOB-000005', country: 'United Arab Emirates', city: 'Dubai', employer: 'Dubai General Helpers',
      title: 'Loading / Warehouse / Packaging Helper', sector: 'Logistics/Driving',
      desc: 'General helper roles in loading, warehouse and packaging.',
      gender: 'Male', minAge: 21, maxAge: 36, edu: 'Basic/JHS', expType: 'Not Required', expYrs: 0,
      licReq: false, licType: null, pccReq: false, salMin: 1075, salMax: 1075, curr: 'AED',
      food: false, accom: false, intStart: '2026-08-17', intEnd: '2026-08-21', deadline: '2026-08-16', recCode: null,
      verStatus: 'Verified', expDate: '2026-08-21', notes: 'Male only. Interview 17-21 Aug 2026.',
    },
    {
      code: 'JOB-000006', country: 'United Arab Emirates', city: 'Dubai', employer: 'Arkan',
      title: 'Security Guard', sector: 'Security',
      desc: 'Security guard roles, employer-sponsored contract.',
      gender: 'Any', minAge: 21, maxAge: 35, edu: 'SHS/WASSCE', expType: 'Preferred', expYrs: 1,
      licReq: false, licType: null, pccReq: true, salMin: 2267, salMax: 2400, curr: 'AED',
      food: false, accom: true, intStart: null, intEnd: null, deadline: null, recCode: null,
      verStatus: 'Verified', expDate: null, notes: 'Male height min 5.7ft, Female height min 5.5ft. Employer-sponsored.',
      minHeightM: '5.7ft', minHeightF: '5.5ft',
    },
    {
      code: 'JOB-000007', country: 'United Arab Emirates', city: 'Dubai', employer: 'Transguard Group',
      title: 'Aviation Security Guard', sector: 'Security',
      desc: 'Aviation security guard at Dubai airport facilities.',
      gender: 'Male', minAge: 21, maxAge: 39, edu: 'SHS/WASSCE', expType: 'Preferred', expYrs: 1,
      licReq: false, licType: null, pccReq: true, salMin: 2000, salMax: 2000, curr: 'AED',
      food: false, accom: true, intStart: '2026-08-17', intEnd: '2026-08-21', deadline: '2026-08-16', recCode: 'MUW-TGS-01-26',
      verStatus: 'Verified', expDate: '2026-08-21', notes: 'Height min 5.7ft. Interview 17-21 Aug 2026.',
      minHeightM: '5.7ft',
    },
    {
      code: 'JOB-000008', country: 'United Arab Emirates', city: 'Dubai', employer: 'A.I.M.',
      title: 'Trailer Driver', sector: 'Logistics/Driving',
      desc: 'Trailer driving with trip allowance.',
      gender: 'Male', minAge: 22, maxAge: 42, edu: 'Basic/JHS', expType: 'Required', expYrs: 3,
      licReq: true, licType: 'F (GCC License)', pccReq: false, salMin: 2500, salMax: 2800, curr: 'AED',
      food: false, accom: false, intStart: null, intEnd: null, deadline: null, recCode: 'AIM-WI-01-26',
      verStatus: 'Verified', expDate: null, notes: 'GCC License required + trip allowance.',
    },
    {
      code: 'JOB-000009', country: 'United Arab Emirates', city: 'Dubai', employer: 'KFC',
      title: 'Motorcycle Delivery Rider', sector: 'Delivery/Courier',
      desc: 'Motorcycle delivery rider, commission-based (1.5 AED per delivery).',
      gender: 'Male', minAge: 22, maxAge: 39, edu: 'Basic/JHS', expType: 'Preferred', expYrs: 1,
      licReq: true, licType: 'A (Motorcycle)', pccReq: true, salMin: 2600, salMax: 3500, curr: 'AED',
      food: false, accom: false, intStart: null, intEnd: null, deadline: null, recCode: 'KHM-MR-01-26',
      verStatus: 'Verified', expDate: null, notes: 'Commission: 1.5 AED per delivery on top of base pay range.',
    },
    {
      code: 'JOB-000010', country: 'Saudi Arabia', city: null, employer: 'Sraco',
      title: 'Car Delivery Driver', sector: 'Logistics/Driving',
      desc: 'Car delivery driver, commission-based pay.',
      gender: 'Male', minAge: 21, maxAge: 39, edu: 'Basic/JHS', expType: 'Preferred', expYrs: 1,
      licReq: true, licType: 'B', pccReq: false, salMin: 2500, salMax: 3500, curr: 'SAR',
      food: false, accom: false, intStart: '2026-08-29', intEnd: '2026-08-30', deadline: '2026-08-27', recCode: 'SUM-SRC-01-26',
      verStatus: 'Verified', expDate: '2026-08-30', notes: 'Kumasi interview 28 Aug 2026; Accra interviews 29-30 Aug 2026.',
    },
    {
      code: 'JOB-000011', country: 'Saudi Arabia', city: null, employer: 'Almarai',
      title: 'Long Haul / Trailer Driver', sector: 'Logistics/Driving',
      desc: 'Long haul trailer driving. Basic GHS 5,500 + trip allowances + overtime. Estimated take-home GHS 10,290-12,290+.',
      gender: 'Male', minAge: 32, maxAge: 45, edu: 'Basic/JHS', expType: 'Required', expYrs: 5,
      licReq: true, licType: 'F', pccReq: false, salMin: 5500, salMax: 5500, curr: 'GHS',
      food: false, accom: false, intStart: null, intEnd: null, deadline: null, recCode: 'ALM-01-26',
      verStatus: 'Verified', expDate: null, notes: 'Free recruitment. Est. take-home GHS 10,290-12,290+ with allowances.',
    },
    {
      code: 'JOB-000012', country: 'Argentina', city: null, employer: 'Ghana Aerospace Factory Program',
      title: 'Aerospace Technician Trainee', sector: 'Engineering/Technical',
      desc: '6-month training program (Mechanical, Chemical or Electrical Engineering). Trainees must return to Ghana after training to work at Ghana Aerospace Factory.',
      gender: 'Any', minAge: 21, maxAge: 40, edu: 'Diploma', expType: 'Not Required', expYrs: 0,
      licReq: false, licType: null, pccReq: false, salMin: null, salMax: null, curr: 'USD',
      food: false, accom: false, intStart: null, intEnd: null, deadline: null, recCode: 'LIM-DMC-01-26',
      verStatus: 'Pending', expDate: null, notes: 'Requires Diploma or BSc in Mechanical/Chemical/Electrical Engineering. Must return to Ghana after training.',
    },
  ];

  for (const j of jobs) {
    await db.query(
      `INSERT INTO job_opportunities (
        id, reference_code, legacy_id, date_added, country, city, partner_id, employer_name, recruitment_partner,
        job_title, sector, job_description, gender_requirement, minimum_age, maximum_age,
        minimum_height_male, minimum_height_female, education_requirement, experience_required_type,
        years_experience_required, license_required, license_type, pcc_required, passport_required,
        salary_minimum, salary_maximum, salary_currency, food_provided, accommodation_provided,
        interview_start_date, interview_end_date, application_deadline, recruitment_code,
        verification_status, opportunity_status, expiry_date, notes
      ) VALUES (
        $1,$2,$3,'2026-08-10',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,TRUE,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,'ACTIVE',$33,$34
      )`,
      [
        j.code, j.code, j.code, j.country, j.city, partnerIdByName[j.employer] || null, j.employer, j.employer,
        j.title, j.sector, j.desc, j.gender, j.minAge, j.maxAge,
        (j as any).minHeightM || null, (j as any).minHeightF || null, j.edu, j.expType,
        j.expYrs, j.licReq, j.licType, j.pccReq,
        j.salMin, j.salMax, j.curr, j.food, j.accom,
        j.intStart, j.intEnd, j.deadline, j.recCode,
        j.verStatus, j.expDate, j.notes,
      ]
    );
  }

  // 8. Seed Study Opportunity (STU-000001)
  await db.query(
    `INSERT INTO study_opportunities (
      id, reference_code, legacy_id, country, city, institution_name, institution_type,
      program_name, field_of_study, qualification_level, duration, currency,
      intake_period, scholarship_available, scholarship_details, accommodation_available,
      entry_requirements, english_requirement, financial_requirement, visa_requirement,
      contact_person, status, notes
    ) VALUES (
      'STU-000001', 'STU-000001', 'STU-000001', 'Germany', 'Berlin', 'Partner University (TBC)', 'University',
      'Bachelor Foundation Program', 'Business Administration', 'Bachelor''s Degree', '3-4 years', 'EUR',
      'Winter/Summer', TRUE, 'Partial merit-based scholarships available', TRUE,
      'SHS/WASSCE with good grades', 'IELTS or equivalent (TBC)', 'Proof of funds/blocked account required',
      'Student Visa (National Visa)', 'Efua Mensah', 'Active',
      'Pending confirmation of institution partnership - placeholder entry.'
    )`
  );

  // 8. Seed Initial Authoritative Audit Log
  await db.query(
    `INSERT INTO audit_logs (id, actor_name, actor_role, action, entity_type, entity_id, summary, details_json)
     VALUES ('AUD-INIT-01', 'Isaac Agya Koomson', 'FOUNDER_CEO', 'SYSTEM_INITIALIZED', 'SYSTEM', 'KIA-ISMS',
     'Initialized KIA-ISMS with authoritative foundation: Chart of Accounts, Countries, Exchange Rates, Founder/CEO, Verified Employers, and Real Job Opportunities.',
     $1)`,
    [
      JSON.stringify({
        status: 'READY_FOR_LIVE_OPERATIONS',
        employersCount: partners.length,
        jobsCount: jobs.length,
      }),
    ]
  );
}