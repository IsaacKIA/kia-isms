import React from 'react';

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const v = (value || 'N/A').toUpperCase().trim();

  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (
    [
      'ELIGIBLE',
      'EXCELLENT MATCH',
      'STRONG MATCH',
      'VERIFIED',
      'VALID',
      'APPROVED',
      'SELECTED',
      'PAID',
      'COMPLETED',
      'PLACED',
      'CONFIRMED',
      'ATTENDED',
      'PASS',
      'ACTIVE',
      'SIGNED',
      'ISSUED',
      'RECONCILED',
      'ADMITTED',
    ].includes(v)
  ) {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (
    [
      'REQUIRES_REVIEW',
      'POSSIBLE MATCH',
      'REVIEW',
      'PENDING',
      'PENDING VERIFICATION',
      'EXPIRING SOON',
      'PARTIAL',
      'AWAITING DOCUMENTS',
      'AWAITING CONFIRMATION',
      'AWAITING CLIENT',
      'AWAITING PARTNER',
      'DOCUMENTS REQUIRED',
      'UNDER REVIEW',
      'CONDITIONAL_OFFER',
      'QUOTED',
      'NOT STARTED',
      'VARIANCE_DETECTED',
      'WARNING',
    ].includes(v)
  ) {
    colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (
    [
      'NOT_ELIGIBLE',
      'NOT ELIGIBLE (LICENSE)',
      'NOT ELIGIBLE (PASSPORT)',
      'NOT RECOMMENDED',
      'EXPIRED',
      'MISSING',
      'NOT AVAILABLE',
      'REJECTED',
      'NOT SELECTED',
      'FAIL',
      'NO SHOW',
      'UNPAID',
      'OVERDUE',
      'CANCELLED',
      'URGENT',
      'HIGH',
      'ERROR',
    ].includes(v)
  ) {
    colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (
    [
      'IN PROGRESS',
      'IN PROCESS',
      'READY FOR MATCHING',
      'INTERVIEW SCHEDULED',
      'CANDIDATE NOTIFIED',
      'NOTIFIED',
      'NEW MATCH',
      'OPEN',
      'SUBMITTED',
      'BOOKED',
    ].includes(v)
  ) {
    colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}
    >
      {value || 'N/A'}
    </span>
  );
}
