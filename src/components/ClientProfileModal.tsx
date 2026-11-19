'use client';

import React, { useState } from 'react';
import { StatusBadge } from './Badge';
import {
  X,
  Briefcase,
  FileText,
  CreditCard,
  MessageSquare,
  Calendar,
  Plane,
  GraduationCap,
  ShieldCheck,
  Plus,
  ExternalLink,
  Edit3,
  Save,
  Download,
} from 'lucide-react';

interface ClientProfileModalProps {
  client: any;
  state: any;
  onClose: () => void;
  onAction: (action: string, payload: Record<string, any>) => Promise<any>;
}

export function ClientProfileModal({
  client,
  state,
  onClose,
  onAction,
}: ClientProfileModalProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'cases' | 'matches' | 'documents' | 'finance' | 'comms'
  >('overview');
  const [newCaseType, setNewCaseType] = useState('WORK ABROAD');
  const [newCaseCountry, setNewCaseCountry] = useState('United Arab Emirates');
  const [newCaseDest, setNewCaseDest] = useState('');
  const [newCaseQuote, setNewCaseQuote] = useState('500');

  const [commChannel, setCommChannel] = useState('WhatsApp');
  const [commPurpose, setCommPurpose] = useState('');
  const [commNotes, setCommNotes] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: client.first_name || '',
    middle_name: client.middle_name || '',
    last_name: client.last_name || '',
    gender: client.gender || 'Male',
    date_of_birth: client.date_of_birth || '',
    phone: client.phone || '',
    email: client.email || '',
    city_town: client.city_town || '',
    region: client.region || 'Greater Accra',
    education_level: client.education_level || 'SHS/WASSCE',
    profession: client.profession || '',
    years_of_experience: client.years_of_experience ?? 0,
    skills: client.skills || '',
    driving_license: Boolean(client.driving_license),
    license_class: client.license_class || '',
    passport_available: Boolean(client.passport_available),
    passport_number: client.passport_number || '',
    passport_expiry_date: client.passport_expiry_date || '',
    preferred_countries: client.preferred_countries || '',
    preferred_sectors: client.preferred_sectors || '',
    preferred_service: client.preferred_service || 'WORK ABROAD',
    emergency_contact: client.emergency_contact || '',
    client_status: client.client_status || 'NEW',
    notes: client.notes || '',
  });

  const cases = state.serviceCases.filter((sc: any) => sc.client_id === client.id);
  const matches = state.jobMatches.filter((m: any) => m.client_id === client.id);
  const interviews = state.interviews.filter((i: any) => i.client_id === client.id);
  const studyApps = state.studyApplications.filter((s: any) => s.client_id === client.id);
  const documents = state.documents.filter((d: any) => d.client_id === client.id);
  const visas = state.visaCases.filter((v: any) => v.client_id === client.id);
  const flights = state.flightBookings.filter((f: any) => f.client_id === client.id);
  const invoices = state.invoices.filter((inv: any) => inv.client_id === client.id);
  const payments = state.payments.filter((p: any) => p.client_id === client.id);
  const tasks = state.tasks.filter((t: any) => t.client_id === client.id);
  const comms = state.communications.filter((cm: any) => cm.client_id === client.id);

  const waDigits = (client.whatsapp_number || client.phone || '').replace(/\D/g, '');
  const intlWa = waDigits.startsWith('0') ? `233${waDigits.slice(1)}` : waDigits;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B1F3A] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-400/30">
                {client.reference_code}
              </span>
              <h2 className="text-xl font-bold">{client.full_name}</h2>
              <StatusBadge value={client.client_status} />
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {client.gender} • {client.age ? `${client.age} yrs` : 'DOB N/A'} • {client.phone} •{' '}
              {client.city_town || client.region}, Ghana • Assigned: {client.assigned_staff_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            aria-label="Close Client Profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 px-6 py-3 border-b border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block">Passport Status</span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <StatusBadge value={client.passport_status} />
              {client.passport_number && (
                <span className="font-mono text-slate-700">{client.passport_number}</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-slate-500 block">Education & License</span>
            <span className="font-semibold text-slate-800">
              {client.education_level}{' '}
              {client.driving_license ? `• Lic: ${client.license_class}` : ''}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Active Service Cases</span>
            <span className="font-bold text-slate-900 text-sm">{cases.length} Case(s)</span>
          </div>
          <div>
            <span className="text-slate-500 block">Total Invoiced / Paid</span>
            <span className="font-semibold text-slate-800">
              GHS {Number(client.total_invoiced_ghs || 0).toLocaleString()} /{' '}
              <span className="text-emerald-700">
                GHS {Number(client.total_paid_ghs || 0).toLocaleString()}
              </span>
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Outstanding Balance</span>
            <span
              className={`font-bold text-sm ${
                client.outstanding_balance_ghs > 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              GHS {Number(client.outstanding_balance_ghs || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: '360° Overview', icon: Briefcase },
            { id: 'cases', label: `Service Cases (${cases.length})`, icon: ShieldCheck },
            {
              id: 'matches',
              label: `Matches & Interviews (${matches.length}/${interviews.length})`,
              icon: Calendar,
            },
            {
              id: 'documents',
              label: `Documents & Visas (${documents.length}/${visas.length})`,
              icon: FileText,
            },
            {
              id: 'finance',
              label: `Invoices & Payments (${invoices.length}/${payments.length})`,
              icon: CreditCard,
            },
            {
              id: 'comms',
              label: `Comms & Tasks (${comms.length}/${tasks.length})`,
              icon: MessageSquare,
            },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-1.5 py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition ${
                  activeTab === t.id
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Personal & Professional Profile
                  </h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                  </button>
                </div>

                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        Phone *
                      </label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={editForm.date_of_birth}
                        onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        Client Status
                      </label>
                      <select
                        value={editForm.client_status}
                        onChange={(e) => setEditForm({ ...editForm, client_status: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      >
                        <option value="NEW">NEW</option>
                        <option value="AWAITING DOCUMENTS">AWAITING DOCUMENTS</option>
                        <option value="READY FOR MATCHING">READY FOR MATCHING</option>
                        <option value="NOTIFIED">NOTIFIED</option>
                        <option value="INTERVIEW SCHEDULED">INTERVIEW SCHEDULED</option>
                        <option value="SELECTED">SELECTED</option>
                        <option value="IN PROCESS">IN PROCESS</option>
                        <option value="PLACED">PLACED</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        Education Level
                      </label>
                      <select
                        value={editForm.education_level}
                        onChange={(e) =>
                          setEditForm({ ...editForm, education_level: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      >
                        <option value="Basic/JHS">Basic/JHS</option>
                        <option value="SHS/WASSCE">SHS/WASSCE</option>
                        <option value="Vocational/Technical">Vocational/Technical</option>
                        <option value="Diploma">Diploma</option>
                        <option value="HND">HND</option>
                        <option value="Bachelor's Degree">Bachelor&apos;s Degree</option>
                        <option value="Master's Degree">Master&apos;s Degree</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        Profession & Exp (Yrs)
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={editForm.profession}
                          onChange={(e) => setEditForm({ ...editForm, profession: e.target.value })}
                          placeholder="Profession"
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 bg-white"
                        />
                        <input
                          type="number"
                          value={editForm.years_of_experience}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              years_of_experience: Number(e.target.value),
                            })
                          }
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        Passport Number
                      </label>
                      <input
                        type="text"
                        value={editForm.passport_number}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            passport_number: e.target.value,
                            passport_available: Boolean(e.target.value.trim()),
                          })
                        }
                        placeholder="e.g. G1234567"
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        Passport Expiry
                      </label>
                      <input
                        type="date"
                        value={editForm.passport_expiry_date}
                        onChange={(e) =>
                          setEditForm({ ...editForm, passport_expiry_date: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        City / Town
                      </label>
                      <input
                        type="text"
                        value={editForm.city_town}
                        onChange={(e) => setEditForm({ ...editForm, city_town: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        Driving License Class
                      </label>
                      <input
                        type="text"
                        value={editForm.license_class}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            license_class: e.target.value,
                            driving_license: Boolean(e.target.value.trim()),
                          })
                        }
                        placeholder="None or B / C / F"
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <div className="col-span-2 pt-1">
                      <button
                        onClick={async () => {
                          const res = await onAction('UPDATE_CLIENT', {
                            client_id: client.id,
                            ...editForm,
                          });
                          if (res) setIsEditing(false);
                        }}
                        className="w-full py-2 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <Save className="w-4 h-4" />
                        Save Updated Client Profile
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block">Full Name</span>
                      <span className="font-medium">{client.full_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Date of Birth / Age</span>
                      <span className="font-medium">
                        {client.date_of_birth || 'N/A'} ({client.age ?? '?'} yrs)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Phone / WhatsApp</span>
                      <span className="font-medium">{client.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Email</span>
                      <span className="font-medium">{client.email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Profession / Experience</span>
                      <span className="font-medium">
                        {client.profession || '—'} ({client.years_of_experience} yrs)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Skills & Languages</span>
                      <span className="font-medium">
                        {client.skills || '—'} ({client.languages})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Preferred Destinations</span>
                      <span className="font-medium">{client.preferred_countries || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Preferred Sectors</span>
                      <span className="font-medium">{client.preferred_sectors || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Emergency Contact</span>
                      <span className="font-medium">{client.emergency_contact || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Passport Expiry</span>
                      <span className="font-medium">{client.passport_expiry_date || 'None'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
                <h3 className="font-bold text-slate-900 text-sm">
                  Add Another Service Case (Register Once, Use Many Services)
                </h3>
                <p className="text-slate-600">
                  Attach a new Work Abroad, Study Abroad, Visa, or Flight Booking case to{' '}
                  <strong>{client.reference_code}</strong> without duplicating their client record.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1">Service Type</label>
                    <select
                      value={newCaseType}
                      onChange={(e) => setNewCaseType(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                    >
                      <option value="WORK ABROAD">WORK ABROAD</option>
                      <option value="STUDY ABROAD">STUDY ABROAD</option>
                      <option value="VISIT VISA">VISIT VISA</option>
                      <option value="BUSINESS VISA">BUSINESS VISA</option>
                      <option value="AIR TICKETING">AIR TICKETING</option>
                      <option value="TRAVEL CONSULTATION">TRAVEL CONSULTATION</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Destination Country</label>
                    <select
                      value={newCaseCountry}
                      onChange={(e) => setNewCaseCountry(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                    >
                      {state.countries.map((c: any) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-slate-600 mb-1">
                      Case Description / Role / Programme
                    </label>
                    <input
                      type="text"
                      value={newCaseDest}
                      onChange={(e) => setNewCaseDest(e.target.value)}
                      placeholder="e.g. UK Tourist Visa or Emirates Return Ticket"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Quoted Fee (GHS)</label>
                    <input
                      type="number"
                      value={newCaseQuote}
                      onChange={(e) => setNewCaseQuote(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={async () => {
                        if (!newCaseDest.trim()) return;
                        await onAction('CREATE_SERVICE_CASE', {
                          client_id: client.id,
                          service_type: newCaseType,
                          country: newCaseCountry,
                          destination_summary: newCaseDest.trim(),
                          quoted_amount_ghs: Number(newCaseQuote || 0),
                        });
                        setNewCaseDest('');
                        setActiveTab('cases');
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold py-1.5 px-3 transition"
                    >
                      <Plus className="w-4 h-4" /> Open Linked Case
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cases' && (
            <div className="space-y-3">
              {cases.map((sc: any) => (
                <div
                  key={sc.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-800">
                        {sc.reference_code}
                      </span>
                      <StatusBadge value={sc.service_type} />
                      <StatusBadge value={sc.case_status} />
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        Stage: {sc.workflow_stage}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {sc.country} — {sc.destination_summary}
                    </p>
                    <p className="text-xs text-slate-500">
                      Next Action: {sc.next_action || '—'} (Due: {sc.next_action_date || '—'}) •
                      Owner: {sc.assigned_staff_name}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <div>
                      Invoiced: <strong>GHS {sc.invoiced_ghs.toLocaleString()}</strong>
                    </div>
                    <div className="text-emerald-700">
                      Verified Paid: <strong>GHS {sc.paid_ghs.toLocaleString()}</strong>
                    </div>
                    <div
                      className={
                        sc.outstanding_ghs > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'
                      }
                    >
                      Balance: GHS {sc.outstanding_ghs.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Job Matches ({matches.length})
              </h4>
              {matches.map((m: any) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{m.reference_code}</span>
                      <span className="font-semibold text-slate-900">
                        {m.employer_name} — {m.job_title} ({m.country})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{m.match_score}/100</span>
                      <StatusBadge value={m.effective_decision} />
                      <StatusBadge value={m.selection_status} />
                    </div>
                  </div>
                  <p className="text-emerald-700">✓ Matched: {m.matched_requirements || 'None'}</p>
                  {m.missing_requirements && (
                    <p className="text-rose-600">✗ Missing: {m.missing_requirements}</p>
                  )}
                  {m.compliance_flags && (
                    <p className="text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      ⚠ Review Note: {m.compliance_flags}
                    </p>
                  )}
                </div>
              ))}

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-2">
                Interviews ({interviews.length}) & Study Applications ({studyApps.length}) & Flights ({flights.length})
              </h4>
              {interviews.map((i: any) => (
                <div
                  key={i.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold mr-2">{i.reference_code}</span>
                    <strong>{i.employer_name}</strong> ({i.job_title}) on {i.interview_date} at{' '}
                    {i.start_time} ({i.location})
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={i.attendance_status} />
                    <StatusBadge value={i.selection_status} />
                  </div>
                </div>
              ))}
              {studyApps.map((sa: any) => (
                <div
                  key={sa.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-700" />
                    <span className="font-mono font-bold">{sa.reference_code}</span>
                    <span>
                      {sa.institution_name} — {sa.program_name} ({sa.country})
                    </span>
                  </div>
                  <StatusBadge value={sa.submission_status} />
                </div>
              ))}
              {flights.map((fb: any) => (
                <div
                  key={fb.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-blue-700" />
                    <span className="font-mono font-bold">{fb.reference_code}</span>
                    <span>
                      {fb.airline}: {fb.departure_airport} → {fb.arrival_airport} ({fb.departure_date})
                    </span>
                  </div>
                  <StatusBadge value={fb.ticket_status} />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Document Checklist & Vault ({documents.length})
              </h4>
              {documents.map((d: any) => (
                <div
                  key={d.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold mr-2">{d.reference_code}</span>
                    <span className="font-semibold text-slate-900">{d.document_type}</span>
                    {d.document_number && (
                      <span className="ml-2 font-mono text-slate-600">#{d.document_number}</span>
                    )}
                    {d.expiry_date && (
                      <span className="ml-2 text-slate-500">(Expires: {d.expiry_date})</span>
                    )}
                    {d.file_name && (
                      <span className="ml-2 text-blue-700 font-medium">📎 {d.file_name}</span>
                    )}
                    {d.notes && <p className="text-slate-500 mt-0.5">{d.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {d.file_data_url && (
                      <a
                        href={d.file_data_url}
                        download={d.file_name || `${d.reference_code}-${d.document_type}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold hover:bg-blue-100"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download File
                      </a>
                    )}
                    <StatusBadge value={d.document_status} />
                  </div>
                </div>
              ))}

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-2">
                Visa Cases ({visas.length})
              </h4>
              {visas.map((v: any) => (
                <div
                  key={v.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold mr-2">{v.reference_code}</span>
                    <strong>
                      {v.destination_country} — {v.visa_type}
                    </strong>
                    {v.visa_number && <span className="ml-2 font-mono">Visa #{v.visa_number}</span>}
                    <p className="text-slate-500 mt-0.5">Next Action: {v.next_action || '—'}</p>
                  </div>
                  <StatusBadge value={v.visa_status} />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-500">
                Authoritative Invoices ({invoices.length})
              </h4>
              {invoices.map((inv: any) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold mr-2">{inv.reference_code}</span>
                    <span className="font-semibold">{inv.description}</span>
                    <span className="text-slate-500 ml-2">({inv.issue_date})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>Total: GHS {Number(inv.total_amount_ghs).toLocaleString()}</span>
                    <span className="text-emerald-700">
                      Paid: GHS {Number(inv.paid_amount_ghs).toLocaleString()}
                    </span>
                    <StatusBadge value={inv.status} />
                  </div>
                </div>
              ))}

              <h4 className="font-bold uppercase tracking-wider text-slate-500 pt-2">
                Verified Payment Receipts ({payments.length})
              </h4>
              {payments.map((p: any) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl border border-slate-200 bg-emerald-50/40 flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold mr-2 text-emerald-800">
                      {p.receipt_number}
                    </span>
                    <span className="font-semibold">{p.payment_type}</span> via {p.payment_method}{' '}
                    ({p.payment_date})
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-800">
                      GHS {Number(p.amount_ghs).toLocaleString()}
                    </span>
                    <StatusBadge value={p.reconciled ? 'RECONCILED' : 'PAID'} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'comms' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">Log Communication / Outreach</h4>
                  {intlWa && (
                    <a
                      href={`https://wa.me/${intlWa}?text=${encodeURIComponent(
                        `Hello ${client.first_name}, this is KIA-Start Up Consult regarding your service case.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                    >
                      Open WhatsApp Deep Link <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={commChannel}
                    onChange={(e) => setCommChannel(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                  >
                    <option value="WhatsApp">WhatsApp (Manual Verification)</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="Walk-In">Office Walk-In</option>
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                  </select>
                  <input
                    type="text"
                    value={commPurpose}
                    onChange={(e) => setCommPurpose(e.target.value)}
                    placeholder="Purpose (e.g. Document follow-up)"
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                  <input
                    type="text"
                    value={commNotes}
                    onChange={(e) => setCommNotes(e.target.value)}
                    placeholder="Summary of conversation & outcome"
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!commPurpose.trim() || !commNotes.trim()) return;
                    await onAction('LOG_COMMUNICATION', {
                      client_id: client.id,
                      service_case_id: cases[0]?.id,
                      channel: commChannel,
                      purpose: commPurpose.trim(),
                      message_notes: commNotes.trim(),
                      outcome: 'Logged by staff',
                    });
                    setCommPurpose('');
                    setCommNotes('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800"
                >
                  Save Communication Record
                </button>
              </div>

              <div className="space-y-2">
                {comms.map((cm: any) => (
                  <div
                    key={cm.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold mr-2">{cm.reference_code}</span>
                      <span className="font-semibold">[{cm.channel}]</span> {cm.purpose} —{' '}
                      {cm.message_notes}
                    </div>
                    <span className="text-slate-500">
                      {cm.comm_date} ({cm.staff_name})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
