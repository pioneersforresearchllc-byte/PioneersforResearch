import type { RequestStatus } from '@/lib/services'

/** Owner-facing order of the working stages (legacy 'awaiting_payment'/'paid' fold into them). */
export const STAGE_ORDER: RequestStatus[] = [
  'pending',
  'negotiating',
  'awaiting_deposit',
  'in_progress',
  'awaiting_final',
  'done',
  'cancelled',
]

const LABELS: Record<RequestStatus, [string, string]> = {
  pending: ['جديد', 'New'],
  negotiating: ['قيد التفاوض', 'Negotiating'],
  awaiting_deposit: ['بانتظار المقدم', 'Awaiting deposit'],
  awaiting_payment: ['بانتظار الدفع', 'Awaiting payment'],
  paid: ['مدفوع', 'Paid'],
  in_progress: ['قيد التنفيذ', 'In progress'],
  awaiting_final: ['بانتظار الدفعة النهائية', 'Awaiting final payment'],
  done: ['مكتمل', 'Completed'],
  cancelled: ['ملغي', 'Cancelled'],
}

export const STAGE_ICONS: Record<RequestStatus, string> = {
  pending: '🆕',
  negotiating: '💬',
  awaiting_deposit: '💳',
  awaiting_payment: '💳',
  paid: '✅',
  in_progress: '⚙️',
  awaiting_final: '💰',
  done: '✅',
  cancelled: '✖',
}

export const STAGE_STYLES: Record<RequestStatus, string> = {
  pending: 'bg-gold/15 text-accent',
  negotiating: 'bg-accent/10 text-accent',
  awaiting_deposit: 'bg-gold/15 text-accent',
  awaiting_payment: 'bg-gold/15 text-accent',
  paid: 'bg-success/10 text-success',
  in_progress: 'bg-navy/10 text-navy',
  awaiting_final: 'bg-gold/15 text-accent',
  done: 'bg-success/10 text-success',
  cancelled: 'bg-bg-soft text-muted',
}

export function stageLabel(s: RequestStatus, lang: string): string {
  return LABELS[s][lang === 'ar' ? 0 : 1]
}

/** Which owner tab a status belongs to (legacy statuses grouped with their modern twin). */
export function stageTab(s: RequestStatus): RequestStatus {
  if (s === 'awaiting_payment') return 'awaiting_deposit'
  if (s === 'paid') return 'in_progress'
  return s
}
