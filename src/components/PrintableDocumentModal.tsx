'use client';

import React from 'react';
import { X, Printer, CheckCircle2, Building2 } from 'lucide-react';

interface PrintableDocumentModalProps {
  doc:
    | {
        kind: 'RECEIPT';
        payment: any;
        client?: any;
        serviceCase?: any;
        invoice?: any;
      }
    | {
        kind: 'INVOICE';
        invoice: any;
        client?: any;
        serviceCase?: any;
      }
    | null;
  onClose: () => void;
}

export function PrintableDocumentModal({ doc, onClose }: PrintableDocumentModalProps) {
  if (!doc) return null;

  const isReceipt = doc.kind === 'RECEIPT';
  const client = doc.client;
  const serviceCase = doc.serviceCase;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="bg-[#0B1F3A] text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm">
              Official KIA-Start Up Consult {isReceipt ? 'Payment Receipt' : 'Tax / Service Invoice'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-8 space-y-6 text-xs text-slate-800" id="kia-printable-document">
          {/* Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-[#0B1F3A] pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0B1F3A] text-amber-400 flex items-center justify-center font-black text-lg">
                KIA
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-[#0B1F3A]">
                  KIA-START UP CONSULT
                </h1>
                <p className="text-[11px] font-semibold text-slate-600">
                  International Recruitment • Study Abroad • Visa Assistance • Air Ticketing
                </p>
                <p className="text-[11px] text-slate-500">
                  Ajumako Head Office & Greater Accra Branch, Ghana • travels.kiastartupconsult.com
                </p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 rounded-lg font-black text-xs uppercase tracking-wider ${
                  isReceipt
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-blue-100 text-blue-900 border border-blue-300'
                }`}
              >
                {isReceipt ? 'OFFICIAL RECEIPT' : 'SERVICE INVOICE'}
              </span>
              <div className="mt-2 font-mono font-bold text-sm text-slate-900">
                {isReceipt ? doc.payment.receipt_number : doc.invoice.reference_code}
              </div>
              <div className="text-[11px] text-slate-500">
                Date: {isReceipt ? doc.payment.payment_date : doc.invoice.issue_date}
              </div>
            </div>
          </div>

          {/* Client & Case Info Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Billed / Issued To Client
              </div>
              <div className="font-bold text-sm text-slate-900 mt-0.5">
                {client?.full_name ||
                  (isReceipt ? doc.payment.client_id : doc.invoice.client_id)}
              </div>
              <div className="font-mono text-blue-800 font-semibold">
                Client ID: {isReceipt ? doc.payment.client_id : doc.invoice.client_id}
              </div>
              {client?.phone && <div className="text-slate-600">Phone: {client.phone}</div>}
              {client?.city_town && (
                <div className="text-slate-500">
                  Location: {client.city_town}, {client.region}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Service Case & Reference
              </div>
              <div className="font-mono font-bold text-slate-900 mt-0.5">
                Case: {serviceCase?.reference_code || (isReceipt ? doc.payment.service_case_id : doc.invoice.service_case_id) || 'General'}
              </div>
              <div className="font-semibold text-slate-700">
                Service: {isReceipt ? doc.payment.service_type : doc.invoice.service_type}
              </div>
              {serviceCase?.destination_summary && (
                <div className="text-slate-600">{serviceCase.destination_summary}</div>
              )}
              {isReceipt && (
                <div className="text-slate-500">
                  Payment Ref: {doc.payment.reference_code} ({doc.payment.payment_method})
                </div>
              )}
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px]">
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Category / Method</th>
                  <th className="py-2.5 px-4 text-right">Original Amount</th>
                  <th className="py-2.5 px-4 text-right">Amount (GHS ₵)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isReceipt ? (
                  <tr>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {doc.payment.payment_type || 'Service Payment'} —{' '}
                        {serviceCase?.destination_summary || doc.payment.service_type}
                      </div>
                      {doc.payment.transaction_reference && (
                        <div className="text-slate-500 font-mono text-[11px]">
                          Tx Ref: {doc.payment.transaction_reference}
                        </div>
                      )}
                      {doc.payment.notes && (
                        <div className="text-slate-500 text-[11px] mt-0.5">{doc.payment.notes}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">{doc.payment.payment_method}</td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      {doc.payment.currency} {Number(doc.payment.amount_original).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800 text-sm">
                      GHS {Number(doc.payment.amount_ghs).toLocaleString()}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {doc.invoice.description || `${doc.invoice.service_type} Service Fee`}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Due Date: {doc.invoice.due_date || doc.invoice.issue_date}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold">{doc.invoice.service_type}</td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      {doc.invoice.currency} {Number(doc.invoice.total_amount_original).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      GHS {Number(doc.invoice.total_amount_ghs).toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Totals */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {isReceipt
                  ? `Posted to Double-Entry General Ledger • Status: ${doc.payment.payment_status}`
                  : `Invoice Status: ${doc.invoice.status} • Paid to Date: GHS ${Number(doc.invoice.paid_amount_ghs || 0).toLocaleString()}`}
              </span>
            </div>
            <div className="text-right space-y-1">
              {isReceipt ? (
                <>
                  <div className="text-sm font-black text-emerald-800">
                    TOTAL RECEIVED: GHS {Number(doc.payment.amount_ghs).toLocaleString()}
                  </div>
                  {serviceCase && (
                    <div className="text-[11px] text-slate-600">
                      Case Total Billed: GHS {Number(serviceCase.invoiced_ghs || 0).toLocaleString()} •
                      Remaining Balance: GHS {Number(serviceCase.outstanding_ghs || 0).toLocaleString()}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-sm font-black text-slate-900">
                    OUTSTANDING DUE: GHS {Number(doc.invoice.outstanding_amount_ghs || 0).toLocaleString()}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Signature & Verification Footer */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Issued & Verified By (KIA-Start Up Consult)
              </div>
              <div className="mt-6 border-b border-slate-400 w-48" />
              <div className="font-bold text-slate-800 mt-1">
                {isReceipt ? doc.payment.received_by : doc.invoice.created_by}
              </div>
              <div className="text-[10px] text-slate-500">Authorized Finance / Operations Officer</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Client Acknowledgement
              </div>
              <div className="mt-6 border-b border-slate-400 w-48 ml-auto" />
              <div className="font-bold text-slate-800 mt-1">
                {client?.full_name || 'Client Signature'}
              </div>
              <div className="text-[10px] text-slate-500">
                Generated by KIA-ISMS Double-Entry Accounting Engine
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
