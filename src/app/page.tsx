'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { StatusBadge } from '@/components/Badge';
import { ClientProfileModal } from '@/components/ClientProfileModal';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  GraduationCap,
  FileCheck,
  Plane,
  Landmark,
  CheckSquare,
  BarChart3,
  Settings,
  Search,
  Plus,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  ArrowRight,
  Lock,
  Building2,
  UserPlus,
  Trash2,
  UserCheck,
  RotateCcw,
} from 'lucide-react';

type NavModule =
  | 'dashboard'
  | 'clients'
  | 'work-abroad'
  | 'study-abroad'
  | 'visa-docs'
  | 'flights-tourism'
  | 'finance'
  | 'tasks-comms'
  | 'reports'
  | 'settings-admin';

export default function KiaIsmsApp() {
  const [activeNav, setActiveNav] = useState<NavModule>('dashboard');
  const [staffId, setStaffId] = useState<string>('STF-01');
  const [dashboardMode, setDashboardMode] = useState<'ceo' | 'staff'>('ceo');
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  // Filters
  const [clientSearch, setClientSearch] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState('ALL');
  const [dashServiceFilter, setDashServiceFilter] = useState('ALL');

  // Client Intake Form
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClient, setNewClient] = useState({
    first_name: '',
    last_name: '',
    gender: 'Male',
    date_of_birth: '1996-05-15',
    phone: '',
    email: '',
    city_town: 'Accra',
    region: 'Greater Accra',
    education_level: 'SHS/WASSCE',
    profession: '',
    years_of_experience: 2,
    driving_license: false,
    license_class: '',
    passport_available: true,
    passport_number: '',
    passport_expiry_date: '2029-12-31',
    preferred_countries: 'United Arab Emirates',
    preferred_sectors: 'Hospitality',
    preferred_service: 'WORK ABROAD',
    create_initial_case: true,
    initial_case_destination: 'UAE Work Placement',
    initial_case_fee_ghs: 500,
  });

  // Work Abroad Sub-tabs & Forms
  const [workTab, setWorkTab] = useState<'pipeline' | 'opportunities' | 'matching' | 'interviews'>('opportunities');
  const [matchClientId, setMatchClientId] = useState('');
  const [matchOppId, setMatchOppId] = useState('JOB-000001');

  const [intClientId, setIntClientId] = useState('');
  const [intOppId, setIntOppId] = useState('JOB-000001');
  const [intDate, setIntDate] = useState('2026-08-29');
  const [intTime, setIntTime] = useState('9:00 AM');

  // Finance Forms
  const [finTab, setFinTab] = useState<'overview' | 'payments' | 'invoices' | 'ledger' | 'expenses'>('overview');
  const [payClientId, setPayClientId] = useState('');
  const [payCaseId, setPayCaseId] = useState('');
  const [payAmount, setPayAmount] = useState('300');
  const [payCurrency, setPayCurrency] = useState('GHS');
  const [payMethod, setPayMethod] = useState<'Mobile Money' | 'Cash' | 'Bank Transfer'>('Mobile Money');
  const [payRef, setPayRef] = useState('');

  const [expPayee, setExpPayee] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('450');
  const [expAcct, setExpAcct] = useState('6100');

  // Visa & Doc Form
  const [docClientId, setDocClientId] = useState('');
  const [docType, setDocType] = useState('Police Clearance Certificate');
  const [docNum, setDocNum] = useState('');
  const [docExp, setDocExp] = useState('2029-06-30');

  // Flight Form
  const [fltClientId, setFltClientId] = useState('');
  const [fltAirline, setFltAirline] = useState('British Airways');
  const [fltPnr, setFltPnr] = useState('BA774GH');
  const [fltDep, setFltDep] = useState('ACC (Accra)');
  const [fltArr, setFltArr] = useState('LHR (London)');
  const [fltDate, setFltDate] = useState('2026-09-15');
  const [fltCost, setFltCost] = useState('11200');
  const [fltFare, setFltFare] = useState('12500');

  // Migration report state
  const [latestMigReport, setLatestMigReport] = useState<any>(null);

  // Staff Provisioning State (CEO Only)
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    full_name: '',
    primary_role: 'RECRUITMENT_OFFICER',
    roles: ['RECRUITMENT_OFFICER'],
    phone: '',
    email: '',
    branch: 'Ajumako Head Office',
  });

  const loadState = useCallback(async (targetStaffId = staffId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/isms?staffId=${encodeURIComponent(targetStaffId)}`);
      const json = await res.json();
      if (json.ok) {
        setState(json.data);
        if (json.data.staff && !json.data.staff.some((s: any) => s.id === targetStaffId)) {
          setStaffId('STF-01');
        }
      } else {
        setToast({ type: 'error', message: json.error || 'Failed to load system state' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    loadState(staffId);
  }, [staffId, loadState]);

  const dispatchAction = async (action: string, payload: Record<string, any>) => {
    setToast(null);
    try {
      const res = await fetch('/api/isms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, staffId, payload }),
      });
      const json = await res.json();
      if (!json.ok) {
        setToast({ type: 'error', message: json.error || 'Operation failed' });
        return null;
      }
      setState(json.data);
      if (selectedClient) {
        const updated = json.data.clients.find((c: any) => c.id === selectedClient.id);
        if (updated) setSelectedClient(updated);
      }
      setToast({
        type: 'success',
        message: `Action ${action} completed & audited under ${json.data.actor.full_name}.`,
      });
      return json.result ?? json.data;
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Operation failed' });
      return null;
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1F3A] text-white">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400" />
          <h1 className="text-lg font-bold tracking-wide">
            KIA INTERNATIONAL SERVICES MANAGEMENT SYSTEM (KIA-ISMS)
          </h1>
          <p className="text-xs text-slate-300">
            Initializing PostgreSQL Database, Double-Entry Ledger & RBAC Security...
          </p>
        </div>
      </div>
    );
  }

  const actor = state.actor;
  const isCeoOrManager =
    actor.roles.includes('FOUNDER_CEO') ||
    actor.roles.includes('OPERATIONS_MANAGER') ||
    actor.roles.includes('FINANCE_OFFICER') ||
    actor.roles.includes('ADMINISTRATOR');

  // Derived Dashboard Metrics
  const totalClients = state.clients.length;
  const activeClients = state.clients.filter(
    (c: any) => !['INACTIVE', 'DO NOT CONTACT', 'PLACED'].includes(c.client_status)
  ).length;
  const readyForMatchingCount = state.clients.filter(
    (c: any) => c.client_status === 'READY FOR MATCHING'
  ).length;
  const awaitingDocsCount = state.clients.filter(
    (c: any) => c.client_status === 'AWAITING DOCUMENTS'
  ).length;
  const placedClientsCount = state.clients.filter((c: any) => c.client_status === 'PLACED').length;
  const expiredPassportsCount = state.clients.filter(
    (c: any) => c.passport_status === 'Expired'
  ).length;
  const expiringPassportsCount = state.clients.filter(
    (c: any) => c.passport_status === 'Expiring Soon'
  ).length;

  const totalQuotedGhs = state.serviceCases.reduce(
    (s: number, sc: any) => s + Number(sc.invoiced_ghs || 0),
    0
  );
  const totalVerifiedPaidGhs = state.serviceCases.reduce(
    (s: number, sc: any) => s + Number(sc.paid_ghs || 0),
    0
  );
  const totalOutstandingGhs = state.serviceCases.reduce(
    (s: number, sc: any) => s + Number(sc.outstanding_ghs || 0),
    0
  );

  const myAssignedCases = state.serviceCases.filter(
    (sc: any) => sc.assigned_staff_name === actor.full_name
  );
  const myPendingTasks = state.tasks.filter(
    (t: any) => t.assigned_staff_name === actor.full_name && t.status !== 'COMPLETED'
  );
  const missingOrExpiredDocs = state.documents.filter((d: any) =>
    ['MISSING', 'EXPIRED', 'EXPIRING SOON'].includes(d.document_status)
  );

  const filteredClients = state.clients.filter((c: any) => {
    const q = clientSearch.toLowerCase().trim();
    const matchesQuery =
      !q ||
      c.full_name.toLowerCase().includes(q) ||
      c.reference_code.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.passport_number || '').toLowerCase().includes(q);
    const matchesStatus =
      clientStatusFilter === 'ALL' || c.client_status === clientStatusFilter;
    return matchesQuery && matchesStatus;
  });

  const navItems: { id: NavModule; label: string; icon: any; count?: number }[] = [
    { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: '2. Clients', icon: Users, count: state.clients.length },
    {
      id: 'work-abroad',
      label: '3. Work Abroad',
      icon: Briefcase,
      count: state.jobOpportunities.length,
    },
    {
      id: 'study-abroad',
      label: '4. Study Abroad',
      icon: GraduationCap,
      count: state.studyApplications.length,
    },
    {
      id: 'visa-docs',
      label: '5. Visa & Documentation',
      icon: FileCheck,
      count: state.documents.length,
    },
    {
      id: 'flights-tourism',
      label: '6. Flights & Tourism',
      icon: Plane,
      count: state.flightBookings.length,
    },
    {
      id: 'finance',
      label: '7. Finance & Ledger',
      icon: Landmark,
      count: state.payments.length,
    },
    {
      id: 'tasks-comms',
      label: '8. Tasks & Follow-ups',
      icon: CheckSquare,
      count: state.tasks.filter((t: any) => t.status !== 'COMPLETED').length,
    },
    { id: 'reports', label: '9. Reports', icon: BarChart3 },
    { id: 'settings-admin', label: '10. Settings & Admin', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Left Primary Navigation Sidebar */}
      <aside className="w-full lg:w-64 bg-[#0B1F3A] text-white flex flex-col justify-between shrink-0 border-r border-slate-800">
        <div>
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-sm shadow">
                KIA
              </div>
              <div>
                <h1 className="font-bold text-sm leading-tight tracking-tight">
                  KIA-START UP CONSULT
                </h1>
                <p className="text-[11px] text-amber-300 font-medium">
                  International Services (KIA-ISMS)
                </p>
              </div>
            </div>
          </div>

          {/* Active Role / Staff Switcher for Testing RBAC & Dashboards */}
          <div className="px-4 py-3 bg-white/5 border-b border-white/10 text-xs">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
              Active Staff Session (RBAC)
            </label>
            <select
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value);
                if (e.target.value !== 'STF-01' && e.target.value !== 'STF-06') {
                  setDashboardMode('staff');
                } else {
                  setDashboardMode('ceo');
                }
              }}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 text-xs font-medium"
            >
              {state.staff.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.primary_role})
                </option>
              ))}
            </select>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {actor.roles.map((r: string) => (
                <span
                  key={r}
                  className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-200 text-[10px] font-mono"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                  {item.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Operating Currency:</span>
            <strong className="text-amber-300">GHS (₵)</strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Ledger Status:</span>
            <strong className="text-emerald-400">
              {state.financialReports.isLedgerBalanced ? 'BALANCED ✓' : 'OUT OF BALANCE'}
            </strong>
          </div>
          <div className="truncate text-[10px] text-slate-500 pt-1">
            travels.kiastartupconsult.com
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {navItems.find((n) => n.id === activeNav)?.label}
            </h2>
            <p className="text-xs text-slate-500">
              Logged in as <strong>{actor.full_name}</strong> ({actor.branch}) • Authoritative
              PostgreSQL Database
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveNav('clients');
                setShowNewClientForm(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Register New Client
            </button>
            <button
              onClick={() => loadState(staffId)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Refresh Live Database"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Toast Notification Banner */}
        {toast && (
          <div
            className={`mx-6 mt-4 px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-500 hover:text-slate-800">
              ✕
            </button>
          </div>
        )}

        {/* Module Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* ================================================================
              MODULE 1: DUAL DASHBOARDS (CEO OVERVIEW vs STAFF MY WORK)
             ================================================================ */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6">
              {/* Mode Switcher & Service Filter */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDashboardMode('ceo')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      dashboardMode === 'ceo'
                        ? 'bg-[#0B1F3A] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Founder / CEO Dashboard: Business Overview
                  </button>
                  <button
                    onClick={() => setDashboardMode('staff')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      dashboardMode === 'staff'
                        ? 'bg-[#0B1F3A] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Staff Dashboard: My Work ({actor.full_name})
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Filter by Service:</span>
                  <select
                    value={dashServiceFilter}
                    onChange={(e) => setDashServiceFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white font-medium"
                  >
                    <option value="ALL">All International Services</option>
                    <option value="WORK ABROAD">Work Abroad</option>
                    <option value="STUDY ABROAD">Study Abroad</option>
                    <option value="VISIT VISA">Visit Visa</option>
                    <option value="AIR TICKETING">Air Ticketing</option>
                  </select>
                </div>
              </div>

              {dashboardMode === 'ceo' ? (
                <>
                  {!isCeoOrManager && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Viewing Executive Overview in read-only mode. Switch to &ldquo;My Work&rdquo;
                      for your personal queue.
                    </div>
                  )}

                  {/* Row 1: Client & Recruitment KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    {[
                      { label: 'Total Clients', val: totalClients, sub: 'Master Registry' },
                      { label: 'Active Clients', val: activeClients, sub: 'In Pipeline' },
                      {
                        label: 'Ready to Match',
                        val: readyForMatchingCount,
                        sub: 'Verified Profile',
                      },
                      { label: 'Awaiting Docs', val: awaitingDocsCount, sub: 'Client Action' },
                      { label: 'Placed Abroad', val: placedClientsCount, sub: 'Completed' },
                      {
                        label: 'Active Jobs',
                        val: state.jobOpportunities.filter(
                          (j: any) => j.opportunity_status === 'ACTIVE'
                        ).length,
                        sub: `${state.jobOpportunities.length} Total`,
                      },
                      {
                        label: 'Total Matches',
                        val: state.jobMatches.length,
                        sub: `${
                          state.jobMatches.filter((m: any) => m.match_score >= 80).length
                        } Score 80+`,
                      },
                      {
                        label: 'Passports Expired',
                        val: expiredPassportsCount,
                        sub: `${expiringPassportsCount} Expiring <6m`,
                        alert: expiredPassportsCount > 0,
                      },
                    ].map((kpi) => (
                      <div
                        key={kpi.label}
                        className={`p-3.5 rounded-2xl border bg-white shadow-sm ${
                          kpi.alert ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
                        }`}
                      >
                        <span className="text-[11px] font-medium text-slate-500 block">
                          {kpi.label}
                        </span>
                        <span
                          className={`text-2xl font-extrabold mt-1 block ${
                            kpi.alert ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {kpi.val}
                        </span>
                        <span className="text-[10px] text-slate-400">{kpi.sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* Row 2: Authoritative Financial Position (GHS) */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-[#0B1F3A] text-white shadow-sm">
                      <span className="text-xs text-slate-300">
                        Total Billed / Invoiced Revenue
                      </span>
                      <div className="text-2xl font-black mt-1">
                        GHS {totalQuotedGhs.toLocaleString()}
                      </div>
                      <span className="text-[11px] text-amber-300 mt-1 block">
                        Recognized in General Ledger: GHS{' '}
                        {state.financialReports.totalRecognizedRevenueGhs.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <span className="text-xs text-slate-500">
                        Verified Cash / MoMo / Bank Collected
                      </span>
                      <div className="text-2xl font-black text-emerald-700 mt-1">
                        GHS {totalVerifiedPaidGhs.toLocaleString()}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        From {state.payments.length} verified receipts (RCT-0001..{state.payments.length})
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <span className="text-xs text-slate-500">
                        Authoritative Accounts Receivable
                      </span>
                      <div className="text-2xl font-black text-rose-600 mt-1">
                        GHS {totalOutstandingGhs.toLocaleString()}
                      </div>
                      <span className="text-[11px] text-amber-700 mt-1 block">
                        Includes GHS 300 unreceipted variance on CASE-000004
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <span className="text-xs text-slate-500">
                        Operating Expenses & Net Position
                      </span>
                      <div className="text-2xl font-black text-slate-900 mt-1">
                        GHS {state.financialReports.netIncomeGhs.toLocaleString()}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Operating Expenses: GHS{' '}
                        {state.financialReports.totalExpensesGhs.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Row 3: What Needs Attention Today (Exceptions & Bottlenecks) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                          Executive Exceptions & Internal Control Alerts
                        </h3>
                        <span className="text-xs font-semibold text-rose-600">
                          Action Required
                        </span>
                      </div>
                      <div className="space-y-2 text-xs">
                        {state.serviceCases
                          .filter((sc: any) => sc.has_unreceipted_legacy_discrepancy)
                          .map((sc: any) => (
                            <div
                              key={sc.id}
                              className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between gap-2"
                            >
                              <div>
                                <strong>
                                  Financial Control Alert ({sc.reference_code} — {sc.client_name}):
                                </strong>{' '}
                                Legacy workbook reported GHS {sc.legacy_reported_paid_ghs} paid, but
                                verified Receipts total GHS {sc.paid_ghs}. Derived balance held at
                                GHS {sc.outstanding_ghs} pending receipt confirmation.
                              </div>
                              <button
                                onClick={() => setActiveNav('finance')}
                                className="shrink-0 px-2.5 py-1 rounded bg-amber-800 text-white font-semibold"
                              >
                                Resolve
                              </button>
                            </div>
                          ))}

                        {missingOrExpiredDocs.map((d: any) => (
                          <div
                            key={d.id}
                            className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-mono font-bold mr-2">{d.reference_code}</span>
                              <strong>{d.candidate_name}</strong> — {d.document_type}:{' '}
                              <span className="text-slate-600">{d.notes || 'Action required'}</span>
                            </div>
                            <StatusBadge value={d.document_status} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Service Distribution & Staff Workload */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                      <h3 className="font-bold text-sm text-slate-900">
                        Active Service Cases & Staff Workload
                      </h3>
                      <div className="space-y-2 text-xs">
                        {state.serviceCases
                          .filter(
                            (sc: any) =>
                              dashServiceFilter === 'ALL' || sc.service_type === dashServiceFilter
                          )
                          .map((sc: any) => (
                            <div
                              key={sc.id}
                              className="p-2.5 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50"
                            >
                              <div>
                                <span className="font-mono font-bold text-blue-800 mr-2">
                                  {sc.reference_code}
                                </span>
                                <strong>{sc.client_name}</strong> — {sc.destination_summary}
                                <span className="text-slate-400 ml-2">
                                  ({sc.assigned_staff_name})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge value={sc.service_type} />
                                <StatusBadge value={sc.case_status} />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* STAFF DASHBOARD: MY WORK */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <h3 className="font-bold text-sm text-slate-900">
                      My Assigned Service Cases ({myAssignedCases.length})
                    </h3>
                    {myAssignedCases.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No cases directly assigned to {actor.full_name}.
                      </p>
                    ) : (
                      <div className="space-y-2.5 text-xs">
                        {myAssignedCases.map((sc: any) => (
                          <div
                            key={sc.id}
                            className="p-3 rounded-xl border border-slate-200 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">
                                {sc.reference_code} • {sc.client_name}
                              </span>
                              <StatusBadge value={sc.case_status} />
                            </div>
                            <p className="text-slate-600">
                              {sc.service_type}: {sc.destination_summary} (Stage:{' '}
                              <strong>{sc.workflow_stage}</strong>)
                            </p>
                            <p className="text-blue-700 font-medium">
                              Next Action: {sc.next_action} (Due: {sc.next_action_date})
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <h3 className="font-bold text-sm text-slate-900">
                      My Actionable Tasks & Follow-Ups ({myPendingTasks.length})
                    </h3>
                    {myPendingTasks.map((t: any) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{t.reference_code}</span>
                            <StatusBadge value={t.priority} />
                            <span className="font-semibold text-slate-900">{t.title}</span>
                          </div>
                          <p className="text-slate-500 mt-1">
                            Client: {t.client_name || 'General'} • Due: {t.due_date}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            dispatchAction('UPDATE_TASK_STATUS', {
                              task_id: t.id,
                              status: 'COMPLETED',
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                          Mark Done
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              MODULE 2: CENTRAL CLIENT MANAGEMENT (MASTER CLIENT DATABASE)
             ================================================================ */}
          {activeNav === 'clients' && (
            <div className="space-y-6">
              {/* Search & Filter Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[260px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Search by Client ID (KSC-000001), Name, Phone, Passport # or Email..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={clientStatusFilter}
                    onChange={(e) => setClientStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 bg-white font-medium"
                  >
                    <option value="ALL">All Client Statuses</option>
                    <option value="READY FOR MATCHING">READY FOR MATCHING</option>
                    <option value="AWAITING DOCUMENTS">AWAITING DOCUMENTS</option>
                    <option value="NOTIFIED">NOTIFIED</option>
                    <option value="INTERVIEW SCHEDULED">INTERVIEW SCHEDULED</option>
                    <option value="IN PROCESS">IN PROCESS</option>
                    <option value="PLACED">PLACED</option>
                  </select>
                  <button
                    onClick={() => setShowNewClientForm(!showNewClientForm)}
                    className="px-3.5 py-2 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800"
                  >
                    {showNewClientForm ? 'Hide Intake Form' : '+ Register Client'}
                  </button>
                </div>
              </div>

              {/* Guided Client Intake Modal/Panel */}
              {showNewClientForm && (
                <div className="bg-white p-6 rounded-2xl border-2 border-blue-600 shadow-md space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Master Client Registration (With Automatic Duplicate Prevention)
                      </h3>
                      <p className="text-slate-500">
                        Generates an immutable KSC-XXXXXX ID and optionally opens the initial
                        Service Case & Invoice.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={newClient.first_name}
                        onChange={(e) =>
                          setNewClient({ ...newClient, first_name: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        value={newClient.last_name}
                        onChange={(e) => setNewClient({ ...newClient, last_name: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Gender *</label>
                      <select
                        value={newClient.gender}
                        onChange={(e) => setNewClient({ ...newClient, gender: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={newClient.date_of_birth}
                        onChange={(e) =>
                          setNewClient({ ...newClient, date_of_birth: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Phone Number (Ghana) *
                      </label>
                      <input
                        type="text"
                        placeholder="0244123456"
                        value={newClient.phone}
                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={newClient.email}
                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Education Level
                      </label>
                      <select
                        value={newClient.education_level}
                        onChange={(e) =>
                          setNewClient({ ...newClient, education_level: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      >
                        <option value="Basic/JHS">Basic/JHS</option>
                        <option value="Vocational/Technical">Vocational/Technical</option>
                        <option value="SHS/WASSCE">SHS/WASSCE</option>
                        <option value="Diploma">Diploma</option>
                        <option value="HND">HND</option>
                        <option value="Bachelor's Degree">Bachelor&apos;s Degree</option>
                        <option value="Master's Degree">Master&apos;s Degree</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Years Experience
                      </label>
                      <input
                        type="number"
                        value={newClient.years_of_experience}
                        onChange={(e) =>
                          setNewClient({
                            ...newClient,
                            years_of_experience: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Passport Number
                      </label>
                      <input
                        type="text"
                        placeholder="G1234567"
                        value={newClient.passport_number}
                        onChange={(e) =>
                          setNewClient({
                            ...newClient,
                            passport_number: e.target.value,
                            passport_available: Boolean(e.target.value.trim()),
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Passport Expiry Date
                      </label>
                      <input
                        type="date"
                        value={newClient.passport_expiry_date}
                        onChange={(e) =>
                          setNewClient({ ...newClient, passport_expiry_date: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Primary Service Requested
                      </label>
                      <select
                        value={newClient.preferred_service}
                        onChange={(e) =>
                          setNewClient({ ...newClient, preferred_service: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      >
                        <option value="WORK ABROAD">WORK ABROAD</option>
                        <option value="STUDY ABROAD">STUDY ABROAD</option>
                        <option value="VISIT VISA">VISIT VISA</option>
                        <option value="AIR TICKETING">AIR TICKETING</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Initial Service Fee Quote (GHS)
                      </label>
                      <input
                        type="number"
                        value={newClient.initial_case_fee_ghs}
                        onChange={(e) =>
                          setNewClient({
                            ...newClient,
                            initial_case_fee_ghs: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowNewClientForm(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        const res = await dispatchAction('REGISTER_CLIENT', newClient);
                        if (res) {
                          setShowNewClientForm(false);
                        }
                      }}
                      className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold"
                    >
                      Register Client & Create Case
                    </button>
                  </div>
                </div>
              )}

              {/* Master Client Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4">Client ID</th>
                        <th className="py-3 px-4">Full Name & Age</th>
                        <th className="py-3 px-4">Phone & Location</th>
                        <th className="py-3 px-4">Passport</th>
                        <th className="py-3 px-4">Education / Profession</th>
                        <th className="py-3 px-4">Cases & Balance</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">360° Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredClients.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500">
                            <Users className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                            <p className="font-semibold text-slate-700">No Clients Registered Yet</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Demo data has been cleared. Click &ldquo;+ Register New Client&rdquo; above to onboard your first real candidate.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredClients.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-blue-800">
                            {c.reference_code}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{c.full_name}</div>
                            <div className="text-slate-500">
                              {c.gender} • {c.age ?? '?'} yrs
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{c.phone}</div>
                            <div className="text-slate-500">
                              {c.city_town}, {c.region}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge value={c.passport_status} />
                            {c.passport_number && (
                              <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                                {c.passport_number} (Exp: {c.passport_expiry_date})
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{c.education_level}</div>
                            <div className="text-slate-500">
                              {c.profession || '—'} ({c.years_of_experience} yrs)
                              {c.driving_license ? ` • Lic ${c.license_class}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold">{c.cases_count} Case(s)</div>
                            <div
                              className={
                                c.outstanding_balance_ghs > 0
                                  ? 'text-rose-600 font-semibold'
                                  : 'text-emerald-700'
                              }
                            >
                              Bal: GHS {Number(c.outstanding_balance_ghs).toLocaleString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge value={c.client_status} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedClient(c)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-700 text-white font-semibold transition"
                            >
                              <Eye className="w-3.5 h-3.5" /> Open 360°
                            </button>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              MODULE 3: WORK ABROAD (OPPORTUNITIES, TRANSPARENT MATCHING, INTERVIEWS)
             ================================================================ */}
          {activeNav === 'work-abroad' && (
            <div className="space-y-6">
              {/* Sub-navigation */}
              <div className="flex flex-wrap gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                {[
                  {
                    id: 'matching',
                    label: `Transparent Eligibility & Matching (${state.jobMatches.length})`,
                  },
                  {
                    id: 'opportunities',
                    label: `Job Opportunities & Employers (${state.jobOpportunities.length})`,
                  },
                  {
                    id: 'interviews',
                    label: `Interviews & Selection Outcomes (${state.interviews.length})`,
                  },
                  { id: 'pipeline', label: '11-Stage Work Abroad Pipeline' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setWorkTab(t.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      workTab === t.id
                        ? 'bg-[#0B1F3A] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {workTab === 'matching' && (
                <div className="space-y-6">
                  {/* Run New Transparent Match */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                    <h3 className="font-bold text-sm text-slate-900">
                      Run Transparent Eligibility & Job Matching Engine
                    </h3>
                    <p className="text-slate-500">
                      Evaluates Age (15), Gender (10), Experience (20), Sector (20), Country (10),
                      License (10), Ordinal Education Rank (10), and Passport Validity (5) +
                      Mandatory License/Passport Overrides and Compliance Review Flags.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Select Candidate
                        </label>
                        <select
                          value={matchClientId}
                          onChange={(e) => setMatchClientId(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                        >
                          {state.clients.length === 0 ? (
                            <option value="">No clients registered yet (Onboard in 2. Clients)</option>
                          ) : (
                            state.clients.map((c: any) => (
                              <option key={c.id} value={c.id}>
                                {c.reference_code} — {c.full_name} ({c.profession || c.education_level})
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Select Job Opportunity
                        </label>
                        <select
                          value={matchOppId}
                          onChange={(e) => setMatchOppId(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                        >
                          {state.jobOpportunities.map((j: any) => (
                            <option key={j.id} value={j.id}>
                              {j.reference_code} — {j.employer_name}: {j.job_title} ({j.country})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          disabled={state.clients.length === 0}
                          onClick={() => {
                            if (!matchClientId) {
                              setToast({ type: 'error', message: 'Please register and select a candidate first.' });
                              return;
                            }
                            dispatchAction('CREATE_JOB_MATCH', {
                              client_id: matchClientId,
                              opportunity_id: matchOppId,
                            });
                          }}
                          className={`w-full py-2 px-4 rounded-xl font-bold transition ${
                            state.clients.length === 0
                              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                              : 'bg-blue-700 hover:bg-blue-800 text-white'
                          }`}
                        >
                          Evaluate & Create Match Record
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Matches Table with Full Explanations */}
                  <div className="space-y-3">
                    {state.jobMatches.map((m: any) => (
                      <div
                        key={m.id}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-800">
                              {m.reference_code}
                            </span>
                            <span className="font-bold text-slate-900 text-sm">
                              {m.candidate_name} ({m.client_id})
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">
                              {m.employer_name} — {m.job_title} ({m.country})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-black">
                              {m.match_score} / 100
                            </span>
                            <StatusBadge value={m.effective_decision} />
                            <StatusBadge value={m.legacy_eligibility_label} />
                            <StatusBadge value={m.selection_status} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                          <div className="text-emerald-700">
                            <strong>Matched Criteria:</strong> {m.matched_requirements || 'None'}
                          </div>
                          <div className="text-rose-600">
                            <strong>Missing Criteria:</strong>{' '}
                            {m.missing_requirements || 'None (All Met)'}
                          </div>
                        </div>

                        {m.compliance_flags && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-2">
                            <span>
                              <strong>Human Review / Compliance Flag:</strong> {m.compliance_flags}
                            </span>
                            <button
                              onClick={() => {
                                const reason = window.prompt(
                                  `Enter documented justification to approve ${m.candidate_name} (${m.reference_code}) as ELIGIBLE:`,
                                  'Verified candidate renewal/waiver documentation with employer.'
                                );
                                if (reason) {
                                  dispatchAction('OVERRIDE_MATCH_ELIGIBILITY', {
                                    match_id: m.id,
                                    override_decision: 'ELIGIBLE',
                                    override_reason: reason,
                                  });
                                }
                              }}
                              className="shrink-0 px-2.5 py-1 rounded bg-amber-800 text-white font-semibold hover:bg-amber-900"
                            >
                              Authorize Override
                            </button>
                          </div>
                        )}

                        {m.override_reason && (
                          <div className="text-blue-700 font-medium">
                            ✓ Authorized Override by {m.overridden_by}: &ldquo;{m.override_reason}
                            &rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {workTab === 'opportunities' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                          <th className="py-3 px-4">Job ID</th>
                          <th className="py-3 px-4">Employer & Partner</th>
                          <th className="py-3 px-4">Job Title & Sector</th>
                          <th className="py-3 px-4">Destination</th>
                          <th className="py-3 px-4">Original Salary</th>
                          <th className="py-3 px-4">Requirements</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {state.jobOpportunities.map((j: any) => (
                          <tr key={j.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-bold text-blue-800">
                              {j.reference_code}
                            </td>
                            <td className="py-3 px-4 font-semibold">{j.employer_name}</td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{j.job_title}</div>
                              <div className="text-slate-500">{j.sector}</div>
                            </td>
                            <td className="py-3 px-4">
                              {j.city ? `${j.city}, ` : ''}
                              {j.country}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold">
                              {j.salary_minimum
                                ? `${j.salary_currency} ${Number(
                                    j.salary_minimum
                                  ).toLocaleString()}`
                                : 'Program / Stipend'}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              Age: {j.minimum_age}–{j.maximum_age} • Edu: {j.education_requirement}{' '}
                              • Exp: {j.years_experience_required}y
                              {j.license_required ? ` • Lic: ${j.license_type}` : ''}
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge value={j.opportunity_status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {workTab === 'interviews' && (
                <div className="space-y-6">
                  {/* Schedule Interview Form */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                    <h3 className="font-bold text-sm text-slate-900">
                      Schedule Candidate Interview
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      <select
                        value={intClientId}
                        onChange={(e) => setIntClientId(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 bg-white"
                      >
                        {state.clients.length === 0 ? (
                          <option value="">No clients registered yet</option>
                        ) : (
                          state.clients.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.reference_code} — {c.full_name}
                            </option>
                          ))
                        )}
                      </select>
                      <select
                        value={intOppId}
                        onChange={(e) => setIntOppId(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 bg-white"
                      >
                        {state.jobOpportunities.map((j: any) => (
                          <option key={j.id} value={j.id}>
                            {j.reference_code} — {j.employer_name} ({j.job_title})
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={intDate}
                        onChange={(e) => setIntDate(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2.5 py-2"
                      />
                      <input
                        type="text"
                        value={intTime}
                        onChange={(e) => setIntTime(e.target.value)}
                        placeholder="9:00 AM"
                        className="rounded-lg border border-slate-300 px-2.5 py-2"
                      />
                      <button
                        onClick={() =>
                          dispatchAction('SCHEDULE_INTERVIEW', {
                            client_id: intClientId,
                            opportunity_id: intOppId,
                            interview_date: intDate,
                            start_time: intTime,
                          })
                        }
                        className="rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold px-4 py-2"
                      >
                        Schedule Interview
                      </button>
                    </div>
                  </div>

                  {/* Interview List & Outcome Recording */}
                  <div className="space-y-3">
                    {state.interviews.map((i: any) => (
                      <div
                        key={i.id}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-800">
                              {i.reference_code}
                            </span>
                            <span className="font-bold text-slate-900 text-sm">
                              {i.candidate_name} ({i.client_id})
                            </span>
                            <span className="text-slate-600">
                              for <strong>{i.employer_name}</strong> — {i.job_title}
                            </span>
                          </div>
                          <p className="text-slate-500">
                            Date: <strong>{i.interview_date}</strong> ({i.start_time} –{' '}
                            {i.end_time}) • Venue: {i.location} ({i.interview_type})
                          </p>
                          <p className="text-slate-500">Instructions: {i.instructions}</p>
                          {i.next_step && (
                            <p className="text-blue-700 font-semibold">Next Step: {i.next_step}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge value={i.attendance_status} />
                          <StatusBadge value={i.interview_result} />
                          <StatusBadge value={i.selection_status} />

                          <button
                            onClick={() =>
                              dispatchAction('RECORD_INTERVIEW_OUTCOME', {
                                interview_id: i.id,
                                attendance_status: 'ATTENDED',
                                interview_result: 'PASS',
                                selection_status: 'SELECTED',
                                employer_feedback: 'Selected by employer panel',
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            Record Selected
                          </button>
                          <button
                            onClick={() =>
                              dispatchAction('RECORD_INTERVIEW_OUTCOME', {
                                interview_id: i.id,
                                attendance_status: 'ATTENDED',
                                interview_result: 'FAIL',
                                selection_status: 'NOT SELECTED',
                                rejection_reason: 'Not selected in this round — re-match allowed',
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                          >
                            Record Not Selected
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {workTab === 'pipeline' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                  <h3 className="font-bold text-sm text-slate-900">
                    11-Stage Work Abroad Case Progression & Mandatory Document Gate
                  </h3>
                  <div className="space-y-3">
                    {state.serviceCases
                      .filter((sc: any) => sc.service_type === 'WORK ABROAD')
                      .map((sc: any) => (
                        <div
                          key={sc.id}
                          className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-800">
                                {sc.reference_code}
                              </span>
                              <strong className="text-sm">{sc.client_name}</strong>
                              <StatusBadge value={sc.case_status} />
                            </div>
                            <p className="text-slate-600 mt-1">
                              {sc.destination_summary} • Current Stage:{' '}
                              <strong className="text-blue-800">{sc.workflow_stage}</strong>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={sc.workflow_stage}
                              onChange={(e) =>
                                dispatchAction('UPDATE_CASE_STAGE', {
                                  case_id: sc.id,
                                  workflow_stage: e.target.value,
                                })
                              }
                              className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white font-semibold"
                            >
                              {[
                                'CLIENT_REGISTRATION',
                                'ELIGIBILITY_SCREENING',
                                'JOB_MATCHING',
                                'CANDIDATE_NOTIFICATION',
                                'INTERVIEW',
                                'SELECTION',
                                'DOCUMENTATION',
                                'VISA_PROCESSING',
                                'TRAVEL_PREPARATION',
                                'DEPLOYMENT',
                                'CASE_CLOSURE',
                              ].map((stg) => (
                                <option key={stg} value={stg}>
                                  {stg}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              MODULE 4: STUDY ABROAD MANAGEMENT
             ================================================================ */}
          {activeNav === 'study-abroad' && (
            <div className="space-y-6 text-xs">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-slate-900">
                  Partner Universities & Study Programmes ({state.studyOpportunities.length})
                </h3>
                {state.studyOpportunities.map((so: any) => (
                  <div
                    key={so.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <span className="font-mono font-bold text-blue-800 mr-2">
                        {so.reference_code}
                      </span>
                      <strong className="text-sm">
                        {so.institution_name} ({so.city}, {so.country})
                      </strong>
                      <p className="text-slate-600 mt-1">
                        Programme: <strong>{so.program_name}</strong> ({so.qualification_level} •{' '}
                        {so.duration}) • Intake: {so.intake_period}
                      </p>
                      <p className="text-slate-500">
                        Requirements: {so.entry_requirements} | Visa: {so.visa_requirement}
                      </p>
                    </div>
                    <StatusBadge value={so.status} />
                  </div>
                ))}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-slate-900">
                  Student Applications ({state.studyApplications.length})
                </h3>
                {state.studyApplications.map((sa: any) => (
                  <div
                    key={sa.id}
                    className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-mono font-bold text-blue-800 mr-2">
                        {sa.reference_code}
                      </span>
                      <strong className="text-sm">{sa.student_name}</strong> — {sa.institution_name}{' '}
                      ({sa.program_name})
                      <p className="text-slate-500 mt-1">
                        Workflow Stage: <strong>{sa.workflow_stage}</strong> • Advisor:{' '}
                        {sa.assigned_advisor}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={sa.submission_status} />
                      <button
                        onClick={() =>
                          dispatchAction('UPDATE_STUDY_APPLICATION', {
                            application_id: sa.id,
                            submission_status: 'ADMITTED',
                            offer_accepted: true,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
                      >
                        Record Admission & Offer Acceptance
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================
              MODULE 5: VISA ASSISTANCE & DOCUMENT VERIFICATION VAULT
             ================================================================ */}
          {activeNav === 'visa-docs' && (
            <div className="space-y-6 text-xs">
              {/* Verify / Upload Document Form */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-slate-900">
                  Verify / Update Client Document (Synchronizes Passport Expiry Radar)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <select
                    value={docClientId}
                    onChange={(e) => setDocClientId(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2.5 py-2 bg-white"
                  >
                    {state.clients.length === 0 ? (
                      <option value="">No clients registered yet</option>
                    ) : (
                      state.clients.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.reference_code} — {c.full_name}
                        </option>
                      ))
                    )}
                  </select>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2.5 py-2 bg-white"
                  >
                    <option value="Passport">Passport</option>
                    <option value="Police Clearance Certificate">
                      Police Clearance Certificate
                    </option>
                    <option value="CV">CV</option>
                    <option value="Medical Certificate">Medical Certificate</option>
                    <option value="Offer Letter">Offer Letter</option>
                    <option value="Educational Certificate">Educational Certificate</option>
                  </select>
                  <input
                    type="text"
                    value={docNum}
                    onChange={(e) => setDocNum(e.target.value)}
                    placeholder="Document / Passport #"
                    className="rounded-lg border border-slate-300 px-2.5 py-2"
                  />
                  <input
                    type="date"
                    value={docExp}
                    onChange={(e) => setDocExp(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2.5 py-2"
                  />
                  <button
                    onClick={() =>
                      dispatchAction('VERIFY_DOCUMENT', {
                        client_id: docClientId,
                        document_type: docType,
                        document_number: docNum,
                        expiry_date: docExp,
                        verified: true,
                      })
                    }
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2"
                  >
                    Verify Document
                  </button>
                </div>
              </div>

              {/* Visa Cases */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-slate-900">
                  Active Visa Assistance Cases ({state.visaCases.length})
                </h3>
                {state.visaCases.map((vc: any) => (
                  <div
                    key={vc.id}
                    className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-mono font-bold text-blue-800 mr-2">
                        {vc.reference_code}
                      </span>
                      <strong className="text-sm">{vc.candidate_name}</strong> —{' '}
                      {vc.destination_country} ({vc.visa_type})
                      <p className="text-slate-500 mt-1">
                        Next Action: {vc.next_action} • Officer: {vc.assigned_officer}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={vc.visa_status} />
                      {vc.visa_status !== 'APPROVED' && (
                        <button
                          onClick={() => {
                            const visaNum = window.prompt(
                              'Enter Official Visa Number to verify approval:',
                              'UK-VST-2026-99201'
                            );
                            if (visaNum) {
                              dispatchAction('UPDATE_VISA_CASE', {
                                visa_case_id: vc.id,
                                client_id: vc.client_id,
                                service_case_id: vc.service_case_id,
                                visa_type: vc.visa_type,
                                destination_country: vc.destination_country,
                                visa_status: 'APPROVED',
                                visa_number: visaNum,
                                expiry_date: '2027-08-30',
                              });
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold"
                        >
                          Record Verified Visa Approval
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Document Vault */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4">Doc ID</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Document Type</th>
                      <th className="py-3 px-4">Document Number</th>
                      <th className="py-3 px-4">Expiry Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {state.documents.map((d: any) => (
                      <tr key={d.id}>
                        <td className="py-3 px-4 font-mono font-bold">{d.reference_code}</td>
                        <td className="py-3 px-4 font-semibold">{d.candidate_name}</td>
                        <td className="py-3 px-4">{d.document_type}</td>
                        <td className="py-3 px-4 font-mono">{d.document_number || '—'}</td>
                        <td className="py-3 px-4">{d.expiry_date || '—'}</td>
                        <td className="py-3 px-4">
                          <StatusBadge value={d.document_status} />
                        </td>
                        <td className="py-3 px-4 text-slate-500">{d.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================
              MODULE 6: FLIGHTS & TOURISM
             ================================================================ */}
          {activeNav === 'flights-tourism' && (
            <div className="space-y-6 text-xs">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-slate-900">
                  Record Verified Flight Booking & Issue Client Invoice
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select
                    value={fltClientId}
                    onChange={(e) => setFltClientId(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2.5 py-2 bg-white"
                  >
                    {state.clients.length === 0 ? (
                      <option value="">No clients registered yet</option>
                    ) : (
                      state.clients.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.reference_code} — {c.full_name}
                        </option>
                      ))
                    )}
                  </select>
                  <input
                    type="text"
                    value={fltAirline}
                    onChange={(e) => setFltAirline(e.target.value)}
                    placeholder="Airline (e.g. Emirates)"
                    className="rounded-lg border border-slate-300 px-2.5 py-2"
                  />
                  <input
                    type="text"
                    value={fltPnr}
                    onChange={(e) => setFltPnr(e.target.value)}
                    placeholder="Booking Ref (PNR)"
                    className="rounded-lg border border-slate-300 px-2.5 py-2"
                  />
                  <input
                    type="date"
                    value={fltDate}
                    onChange={(e) => setFltDate(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2.5 py-2"
                  />
                  <input
                    type="text"
                    value={fltDep}
                    onChange={(e) => setFltDep(e.target.value)}
                    placeholder="Departure Airport (ACC)"
                    className="rounded-lg border border-slate-300 px-2.5 py-2"
                  />
                  <input
                    type="text"
                    value={fltArr}
                    onChange={(e) => setFltArr(e.target.value)}
                    placeholder="Arrival Airport (DXB)"
                    className="rounded-lg border border-slate-300 px-2.5 py-2"
                  />
                  <input
                    type="number"
                    value={fltCost}
                    onChange={(e) => setFltCost(e.target.value)}
                    placeholder="Supplier Cost (GHS)"
                    className="rounded-lg border border-slate-300 px-2.5 py-2"
                  />
                  <input
                    type="number"
                    value={fltFare}
                    onChange={(e) => setFltFare(e.target.value)}
                    placeholder="Client Charge (GHS)"
                    className="rounded-lg border border-slate-300 px-2.5 py-2"
                  />
                </div>
                <button
                  onClick={() =>
                    dispatchAction('CREATE_FLIGHT_BOOKING', {
                      client_id: fltClientId,
                      airline: fltAirline,
                      booking_reference: fltPnr,
                      departure_airport: fltDep,
                      arrival_airport: fltArr,
                      departure_date: fltDate,
                      supplier_cost: Number(fltCost),
                      client_fare: Number(fltFare),
                      ticket_status: 'ISSUED',
                      create_invoice: true,
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold"
                >
                  Save Flight Booking & Generate Invoice
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4">Ticket ID</th>
                      <th className="py-3 px-4">Passenger</th>
                      <th className="py-3 px-4">Airline & PNR</th>
                      <th className="py-3 px-4">Route & Date</th>
                      <th className="py-3 px-4">Supplier Cost</th>
                      <th className="py-3 px-4">Client Fare</th>
                      <th className="py-3 px-4">Agency Margin</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {state.flightBookings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400">
                          No flight tickets issued yet. Use the form above to record a booking.
                        </td>
                      </tr>
                    ) : (
                      state.flightBookings.map((fb: any) => (
                        <tr key={fb.id}>
                          <td className="py-3 px-4 font-mono font-bold">{fb.reference_code}</td>
                          <td className="py-3 px-4 font-semibold">{fb.passenger_name}</td>
                          <td className="py-3 px-4">
                            {fb.airline} ({fb.booking_reference || '—'})
                          </td>
                          <td className="py-3 px-4">
                            {fb.departure_airport} → {fb.arrival_airport} ({fb.departure_date})
                          </td>
                          <td className="py-3 px-4">
                            {fb.currency} {Number(fb.supplier_cost).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-bold">
                            {fb.currency} {Number(fb.client_fare).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-emerald-700 font-bold">
                            {fb.currency}{' '}
                            {(Number(fb.client_fare) - Number(fb.supplier_cost)).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge value={fb.ticket_status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================
              MODULE 7: FINANCIAL MANAGEMENT & DOUBLE-ENTRY GENERAL LEDGER
             ================================================================ */}
          {activeNav === 'finance' && (
            <div className="space-y-6 text-xs">
              <div className="flex flex-wrap gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                {[
                  { id: 'overview', label: 'Financial Overview & Payment Receipting' },
                  { id: 'invoices', label: `Client Invoices (${state.invoices.length})` },
                  { id: 'payments', label: `Receipts & Reconciliation (${state.payments.length})` },
                  {
                    id: 'ledger',
                    label: `Double-Entry General Ledger & Trial Balance (${state.journalEntries.length})`,
                  },
                  {
                    id: 'expenses',
                    label: `Operating Expenses & Exchange Rates`,
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFinTab(t.id as any)}
                    className={`px-4 py-2 rounded-xl font-bold transition ${
                      finTab === t.id
                        ? 'bg-[#0B1F3A] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {finTab === 'overview' && (
                <div className="space-y-6">
                  {/* Record Client Payment Form */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h3 className="font-bold text-sm text-slate-900">
                      Record Client Payment & Allocate to Invoice (Auto-Posts Double-Entry Journal
                      & Issues Receipt)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                      <select
                        value={payClientId}
                        onChange={(e) => {
                          setPayClientId(e.target.value);
                          const cCase = state.serviceCases.find(
                            (sc: any) => sc.client_id === e.target.value
                          );
                          if (cCase) setPayCaseId(cCase.id);
                        }}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 bg-white sm:col-span-2"
                      >
                        {state.clients.length === 0 ? (
                          <option value="">No clients registered yet</option>
                        ) : (
                          state.clients.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.reference_code} — {c.full_name} (Bal: GHS{' '}
                              {c.outstanding_balance_ghs})
                            </option>
                          ))
                        )}
                      </select>
                      <select
                        value={payCaseId}
                        onChange={(e) => setPayCaseId(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 bg-white"
                      >
                        {state.serviceCases
                          .filter((sc: any) => sc.client_id === payClientId)
                          .map((sc: any) => (
                            <option key={sc.id} value={sc.id}>
                              {sc.reference_code} ({sc.service_type})
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="Amount"
                        className="rounded-lg border border-slate-300 px-2.5 py-2"
                      />
                      <select
                        value={payCurrency}
                        onChange={(e) => setPayCurrency(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 bg-white"
                      >
                        {state.exchangeRates.map((r: any) => (
                          <option key={r.currency_code} value={r.currency_code}>
                            {r.currency_code} (Rate: {r.rate_to_ghs})
                          </option>
                        ))}
                      </select>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as any)}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 bg-white"
                      >
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        placeholder="Transaction Ref (e.g. MM-99201 or Bank Slip #)"
                        className="flex-1 rounded-lg border border-slate-300 px-2.5 py-2"
                      />
                      <button
                        onClick={() =>
                          dispatchAction('RECORD_PAYMENT', {
                            client_id: payClientId,
                            service_case_id: payCaseId,
                            amount_original: Number(payAmount),
                            currency: payCurrency,
                            payment_method: payMethod,
                            transaction_reference: payRef,
                            payment_type: 'Service Fee',
                          })
                        }
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        Post Payment & Issue Receipt
                      </button>
                    </div>
                  </div>

                  {/* Income Statement & Balance Sheet Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <h4 className="font-bold text-sm text-slate-900">
                        Income Statement (GHS — Derived from General Ledger)
                      </h4>
                      <div className="space-y-1.5">
                        {state.financialReports.trialBalance
                          .filter((a: any) => a.account_type === 'REVENUE')
                          .map((a: any) => (
                            <div key={a.code} className="flex justify-between">
                              <span>
                                {a.code} — {a.name}
                              </span>
                              <span className="font-semibold">
                                GHS {a.net_balance_ghs.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        <div className="border-t pt-1.5 flex justify-between font-bold text-emerald-700">
                          <span>Total Recognized Revenue</span>
                          <span>
                            GHS {state.financialReports.totalRecognizedRevenueGhs.toLocaleString()}
                          </span>
                        </div>
                        {state.financialReports.trialBalance
                          .filter((a: any) => a.account_type === 'EXPENSE')
                          .map((a: any) => (
                            <div key={a.code} className="flex justify-between text-slate-600">
                              <span>
                                {a.code} — {a.name}
                              </span>
                              <span>GHS {a.net_balance_ghs.toLocaleString()}</span>
                            </div>
                          ))}
                        <div className="border-t pt-2 flex justify-between font-black text-sm text-slate-900">
                          <span>Net Operating Income (GHS)</span>
                          <span>GHS {state.financialReports.netIncomeGhs.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <h4 className="font-bold text-sm text-slate-900">
                        Balance Sheet Summary (GHS)
                      </h4>
                      <div className="space-y-1.5">
                        {state.financialReports.trialBalance
                          .filter((a: any) => a.account_type === 'ASSET')
                          .map((a: any) => (
                            <div key={a.code} className="flex justify-between">
                              <span>
                                {a.code} — {a.name}
                              </span>
                              <span className="font-semibold">
                                GHS {a.net_balance_ghs.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        <div className="border-t pt-1.5 flex justify-between font-bold text-blue-800">
                          <span>Total Assets</span>
                          <span>
                            GHS {state.financialReports.totalAssetsGhs.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600 pt-1">
                          <span>Total Liabilities</span>
                          <span>
                            GHS {state.financialReports.totalLiabilitiesGhs.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Total Equity & Current Earnings</span>
                          <span>
                            GHS{' '}
                            {state.financialReports.totalEquityWithRetainedGhs.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {finTab === 'invoices' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Client & Case</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Total (GHS)</th>
                        <th className="py-3 px-4">Allocated Paid (GHS)</th>
                        <th className="py-3 px-4">Balance (GHS)</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {state.invoices.map((inv: any) => (
                        <tr key={inv.id}>
                          <td className="py-3 px-4 font-mono font-bold text-blue-800">
                            {inv.reference_code}
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            {inv.client_name} ({inv.service_case_id || '—'})
                          </td>
                          <td className="py-3 px-4">{inv.description}</td>
                          <td className="py-3 px-4 font-bold">
                            GHS {Number(inv.total_amount_ghs).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-emerald-700 font-bold">
                            GHS {Number(inv.paid_amount_ghs).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-rose-600 font-bold">
                            GHS {Number(inv.outstanding_amount_ghs).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge value={inv.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {finTab === 'payments' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4">Payment ID</th>
                        <th className="py-3 px-4">Receipt #</th>
                        <th className="py-3 px-4">Client & Case</th>
                        <th className="py-3 px-4">Amount (GHS)</th>
                        <th className="py-3 px-4">Method & Ref</th>
                        <th className="py-3 px-4">Reconciliation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {state.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="py-3 px-4 font-mono font-bold">{p.reference_code}</td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                            {p.receipt_number}
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            {p.client_name} ({p.service_case_id})
                          </td>
                          <td className="py-3 px-4 font-bold">
                            GHS {Number(p.amount_ghs).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            {p.payment_method} ({p.transaction_reference || 'Cash Drawer'})
                          </td>
                          <td className="py-3 px-4">
                            {p.reconciled ? (
                              <StatusBadge value="RECONCILED" />
                            ) : (
                              <button
                                onClick={() =>
                                  dispatchAction('RECONCILE_PAYMENT', { payment_id: p.id })
                                }
                                className="px-2.5 py-1 rounded bg-blue-700 text-white font-semibold"
                              >
                                Reconcile Now
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {finTab === 'ledger' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
                      <span className="font-bold">
                        Trial Balance (Double-Entry General Ledger Verification)
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        Total Debits: GHS{' '}
                        {state.financialReports.totalDebitsGhs.toLocaleString()} = Total Credits:
                        GHS {state.financialReports.totalCreditsGhs.toLocaleString()}
                      </span>
                    </div>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                          <th className="py-2.5 px-4">Account Code</th>
                          <th className="py-2.5 px-4">Account Name</th>
                          <th className="py-2.5 px-4">Type</th>
                          <th className="py-2.5 px-4 text-right">Total Debits (GHS)</th>
                          <th className="py-2.5 px-4 text-right">Total Credits (GHS)</th>
                          <th className="py-2.5 px-4 text-right">Net Balance (GHS)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {state.financialReports.trialBalance.map((tb: any) => (
                          <tr key={tb.code}>
                            <td className="py-2.5 px-4 font-mono font-bold">{tb.code}</td>
                            <td className="py-2.5 px-4 font-semibold">{tb.name}</td>
                            <td className="py-2.5 px-4">{tb.account_type}</td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              {tb.total_debit_ghs.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              {tb.total_credit_ghs.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold">
                              {tb.net_balance_ghs.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {finTab === 'expenses' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="font-bold text-sm text-slate-900">Record Operating Expense</h4>
                    <input
                      type="text"
                      value={expPayee}
                      onChange={(e) => setExpPayee(e.target.value)}
                      placeholder="Supplier / Payee Name (e.g. ECG or Accra Venue)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <input
                      type="text"
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                      placeholder="Expense Description"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={expAcct}
                        onChange={(e) => setExpAcct(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 bg-white"
                      >
                        <option value="6100">6100 — Office & Admin</option>
                        <option value="6200">6200 — Marketing & Drives</option>
                        <option value="6300">6300 — Staff Allowances</option>
                        <option value="5100">5100 — Direct Supplier Cost</option>
                      </select>
                      <input
                        type="number"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        placeholder="Amount (GHS)"
                        className="rounded-lg border border-slate-300 px-2.5 py-2"
                      />
                    </div>
                    <button
                      onClick={() =>
                        dispatchAction('RECORD_EXPENSE', {
                          category: 'Operations',
                          expense_account_code: expAcct,
                          payment_account_code: '1110',
                          supplier_or_payee: expPayee || 'Office Vendor',
                          description: expDesc || 'Operational Expense',
                          amount_original: Number(expAmount),
                          currency: 'GHS',
                        })
                      }
                      className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold"
                    >
                      Post Operating Expense
                    </button>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="font-bold text-sm text-slate-900">
                      Authoritative Exchange Rates (Base: GHS)
                    </h4>
                    <div className="space-y-2">
                      {state.exchangeRates.map((r: any) => (
                        <div
                          key={r.currency_code}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                        >
                          <div>
                            <strong className="font-mono">{r.currency_code}</strong> — {r.source}
                          </div>
                          <span className="font-mono font-bold text-blue-800">
                            1 {r.currency_code} = GHS {r.rate_to_ghs}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              MODULE 8: TASKS & FOLLOW-UPS + SHARED COMMUNICATION LOG
             ================================================================ */}
          {activeNav === 'tasks-comms' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-slate-900">
                  Operational Tasks & Automated Follow-Ups ({state.tasks.length})
                </h3>
                {state.tasks.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{t.reference_code}</span>
                        <StatusBadge value={t.priority} />
                        <StatusBadge value={t.status} />
                      </div>
                      <p className="font-semibold text-slate-900 mt-1">{t.title}</p>
                      <p className="text-slate-500">
                        Owner: {t.assigned_staff_name} • Due: {t.due_date}{' '}
                        {t.automation_source_event ? `• Auto: ${t.automation_source_event}` : ''}
                      </p>
                    </div>
                    {t.status !== 'COMPLETED' && (
                      <button
                        onClick={() =>
                          dispatchAction('UPDATE_TASK_STATUS', {
                            task_id: t.id,
                            status: 'COMPLETED',
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold shrink-0"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-slate-900">
                  Shared Client Communication History ({state.communications.length})
                </h3>
                {state.communications.map((cm: any) => (
                  <div key={cm.id} className="p-3 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {cm.reference_code} • {cm.client_name} [{cm.channel}]
                      </span>
                      <span className="text-slate-500">{cm.comm_date}</span>
                    </div>
                    <p className="text-slate-700">
                      <strong>{cm.purpose}:</strong> {cm.message_notes}
                    </p>
                    <p className="text-slate-500">
                      Outcome: {cm.outcome || '—'} • Staff: {cm.staff_name} • Verification:{' '}
                      <span className="font-mono">{cm.delivery_verification}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================
              MODULE 9: MANAGEMENT REPORTS
             ================================================================ */}
          {activeNav === 'reports' && (
            <div className="space-y-6 text-xs">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900">
                  Revenue & Receivables Breakdown by Service Line
                </h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4">Service Line</th>
                      <th className="py-3 px-4">Active Cases</th>
                      <th className="py-3 px-4">Invoiced (GHS)</th>
                      <th className="py-3 px-4">Verified Paid (GHS)</th>
                      <th className="py-3 px-4">Outstanding Receivables (GHS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[
                      'WORK ABROAD',
                      'STUDY ABROAD',
                      'VISIT VISA',
                      'BUSINESS VISA',
                      'AIR TICKETING',
                      'TRAVEL CONSULTATION',
                    ].map((svc) => {
                      const svcCases = state.serviceCases.filter(
                        (sc: any) => sc.service_type === svc
                      );
                      const invSum = svcCases.reduce(
                        (s: number, c: any) => s + Number(c.invoiced_ghs || 0),
                        0
                      );
                      const paidSum = svcCases.reduce(
                        (s: number, c: any) => s + Number(c.paid_ghs || 0),
                        0
                      );
                      return (
                        <tr key={svc}>
                          <td className="py-3 px-4 font-bold">{svc}</td>
                          <td className="py-3 px-4">{svcCases.length}</td>
                          <td className="py-3 px-4 font-mono">GHS {invSum.toLocaleString()}</td>
                          <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                            GHS {paidSum.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-mono text-rose-600 font-bold">
                            GHS {(invSum - paidSum).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================
              MODULE 10: SETTINGS, RBAC, AUDIT TRAIL & EXCEL MIGRATION UTILITY
             ================================================================ */}
          {activeNav === 'settings-admin' && (
            <div className="space-y-6 text-xs">
              {/* Production Master Data Status & Purge */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Live Production Workspace & Master Data Status
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Demo candidates, mock cases, and test payments have been purged. Authoritative master data (12 verified Job Opportunities, 9 Employers, Countries, and Chart of Accounts) is active.
                    </p>
                  </div>
                  {isCeoOrManager && (
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            'Are you sure you want to purge all demo client records and test transactions? Real job opportunities and employer partners will remain intact.'
                          )
                        ) {
                          dispatchAction('CLEAR_DEMO_DATA', {});
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Purge Demo Data (Retain Jobs)
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-xl font-black text-blue-900">{state.jobOpportunities.length}</div>
                    <div className="text-[11px] font-semibold text-slate-600">Active Job Opportunities</div>
                    <div className="text-[10px] text-emerald-600 font-medium">Real Master Vacancies</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-xl font-black text-blue-900">{state.partners.length}</div>
                    <div className="text-[11px] font-semibold text-slate-600">Verified Employers</div>
                    <div className="text-[10px] text-emerald-600 font-medium">UAE, Saudi, Europe</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-xl font-black text-blue-900">{state.clients.length}</div>
                    <div className="text-[11px] font-semibold text-slate-600">Registered Clients</div>
                    <div className="text-[10px] text-slate-400 font-medium">Clean Slate (0 Demo)</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-xl font-black text-blue-900">{state.staff.length}</div>
                    <div className="text-[11px] font-semibold text-slate-600">Active Staff Users</div>
                    <div className="text-[10px] text-amber-600 font-medium">Founder & CEO Root</div>
                  </div>
                </div>
              </div>
              {/* Excel Migration & Dry-Run Validator */}
              <div className="bg-white p-5 rounded-2xl border-2 border-amber-500 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-6 h-6 text-amber-600" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        Phase 13 Excel Workbook Dry-Run & Migration Utility
                      </h3>
                      <p className="text-slate-500">
                        Directly scans{' '}
                        <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          Kia_Start_Up_Consult_International_Services_Management_System_1.xlsx
                        </code>{' '}
                        for duplicate clients, broken FKs, and financial variances.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const rep = await dispatchAction('RUN_MIGRATION_ANALYSIS', {
                          runMode: 'DRY_RUN',
                        });
                        if (rep) {
                          setLatestMigReport(rep);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-[#0B1F3A] hover:bg-blue-900 text-white font-bold"
                    >
                      Run Workbook Dry-Run Validation
                    </button>
                  </div>
                </div>

                {latestMigReport && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        Report {latestMigReport.run_id} ({latestMigReport.source_filename}) —
                        Scanned {latestMigReport.total_records_scanned} records across{' '}
                        {latestMigReport.worksheets_found.length} sheets
                      </span>
                      <StatusBadge
                        value={latestMigReport.financial_reconciliation_check.status}
                      />
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                      <strong>Financial Reconciliation Audit:</strong> Workbook Service Cases
                      Quoted = GHS{' '}
                      {latestMigReport.financial_reconciliation_check.service_cases_quoted_ghs} |
                      Workbook Service Cases Reported Paid = GHS{' '}
                      {
                        latestMigReport.financial_reconciliation_check
                          .service_cases_reported_paid_ghs
                      }{' '}
                      | Verified Receipts in Payments Sheet = GHS{' '}
                      {
                        latestMigReport.financial_reconciliation_check
                          .payments_sheet_verified_ghs
                      }{' '}
                      |{' '}
                      <strong>
                        Unreceipted Variance = GHS{' '}
                        {latestMigReport.financial_reconciliation_check.unreceipted_variance_ghs}
                      </strong>
                    </div>
                    <div className="space-y-1.5">
                      {latestMigReport.findings.map((f: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-start justify-between gap-3"
                        >
                          <div>
                            <span className="font-mono font-bold mr-2">
                              [{f.worksheet} • {f.legacy_id}]
                            </span>
                            <span className="font-semibold text-slate-900">{f.issue}</span>
                            <p className="text-emerald-700 mt-0.5">
                              Remediation: {f.remediation}
                            </p>
                          </div>
                          <StatusBadge value={f.severity} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Staff Directory & Multi-Role RBAC */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-700" />
                      Authoritative Staff Directory & RBAC Security ({state.staff.length} Active)
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Only the Founder/CEO can onboard, provision RBAC privileges, and manage operational staff.
                    </p>
                  </div>
                  {isCeoOrManager && (
                    <div className="flex items-center gap-2">
                      {state.staff.length > 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm('Reset staff directory to leave only the Founder & CEO?')) {
                              dispatchAction('CLEAR_NON_CEO_STAFF', {});
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Leave Only CEO
                        </button>
                      )}
                      <button
                        onClick={() => setShowAddStaffModal(!showAddStaffModal)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        {showAddStaffModal ? 'Close Form' : 'Onboard New Staff'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Onboard Staff Form (CEO Only) */}
                {showAddStaffModal && isCeoOrManager && (
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3 animate-in fade-in">
                    <h4 className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-700" />
                      Provision New Staff Member & RBAC Permissions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ama Owusu"
                          value={newStaff.full_name}
                          onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Work Email *
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. ama@kiastartupconsult.com"
                          value={newStaff.email}
                          onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 024 000 0002"
                          value={newStaff.phone}
                          onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Primary Role *
                        </label>
                        <select
                          value={newStaff.primary_role}
                          onChange={(e) => {
                            const role = e.target.value;
                            setNewStaff({
                              ...newStaff,
                              primary_role: role as any,
                              roles: [role as any],
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-900 text-xs font-medium"
                        >
                          <option value="RECRUITMENT_OFFICER">Recruitment Officer (Work Abroad)</option>
                          <option value="VISA_DOCUMENTATION_OFFICER">Visa & Documentation Officer</option>
                          <option value="STUDY_ADVISOR">Study Abroad Advisor</option>
                          <option value="TICKETING_OFFICER">Ticketing Officer (Flights & Tours)</option>
                          <option value="FINANCE_OFFICER">Finance Officer (Ledger & Accounts)</option>
                          <option value="OPERATIONS_MANAGER">Operations Manager</option>
                          <option value="ADMINISTRATOR">System Administrator</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Branch Location
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ajumako Head Office"
                          value={newStaff.branch}
                          onChange={(e) => setNewStaff({ ...newStaff, branch: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-900 text-xs"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={async () => {
                            if (!newStaff.full_name || !newStaff.email) {
                              setToast({ type: 'error', message: 'Full Name and Email are required.' });
                              return;
                            }
                            const res = await dispatchAction('CREATE_STAFF', newStaff);
                            if (res) {
                              setShowAddStaffModal(false);
                              setNewStaff({
                                full_name: '',
                                primary_role: 'RECRUITMENT_OFFICER',
                                roles: ['RECRUITMENT_OFFICER'],
                                phone: '',
                                email: '',
                                branch: 'Ajumako Head Office',
                              });
                            }
                          }}
                          className="w-full px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold transition-colors"
                        >
                          Save & Onboard Staff
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Staff Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {state.staff.map((s: any) => {
                    const isCeoUser = s.id === 'STF-01';
                    const roles: string[] = JSON.parse(s.roles_json || '[]');
                    return (
                      <div
                        key={s.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isCeoUser
                            ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                            : 'bg-white border-slate-200'
                        } flex items-start justify-between gap-3`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-800 text-xs">
                              {s.reference_code}
                            </span>
                            <span className="font-bold text-slate-900 text-xs">{s.full_name}</span>
                            {isCeoUser && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-extrabold uppercase">
                                CEO / Root
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 text-[11px]">
                            {s.email} {s.phone ? `• ${s.phone}` : ''} • {s.branch}
                          </p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {roles.map((r) => (
                              <span
                                key={r}
                                className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <StatusBadge value={s.status} />
                          {!isCeoUser && isCeoOrManager && (
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Are you sure you want to remove staff member ${s.full_name}? Any assigned cases will be reassigned to the CEO.`
                                  )
                                ) {
                                  dispatchAction('DELETE_STAFF', { staff_id: s.id });
                                }
                              }}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Remove Staff"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Immutable Audit Trail */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-slate-900">
                  Immutable System Audit Log ({state.auditLogs.length} Recent Events)
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {state.auditLogs.map((al: any) => (
                    <div
                      key={al.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-700 mr-2">
                          [{al.action}]
                        </span>
                        <span>{al.summary}</span>
                      </div>
                      <span className="text-slate-500 shrink-0 ml-2">
                        {al.actor_name} ({al.actor_role})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 360° Consolidated Client Profile Modal */}
      {selectedClient && (
        <ClientProfileModal
          client={selectedClient}
          state={state}
          onClose={() => setSelectedClient(null)}
          onAction={dispatchAction}
        />
      )}
    </div>
  );
}
