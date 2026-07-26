import { supabase } from '@/lib/supabase'

export type PaymentStatus = 'pending' | 'completed' | 'failed'

export interface Invoice {
  id: string
  created_at: string
  amount_cents: number
  status: PaymentStatus
  provider: string
  provider_ref: string | null
  kind: 'course' | 'service'
  /** Human label for what was paid for (course title or service/request subject). */
  item: string
  /** Only populated for the owner view. */
  studentName?: string
  studentUsername?: string
}

// Shape returned by the joined select below. Supabase types the embedded
// relations as arrays; they're actually to-one here (FK columns), so we read
// index 0 / cast accordingly.
interface PaymentRow {
  id: string
  amount_cents: number
  status: PaymentStatus
  provider: string
  provider_ref: string | null
  created_at: string
  course: { title: string | null } | null
  service_request: { subject: string | null; service: { title: string | null } | null } | null
  student: { name: string | null; username: string | null } | null
}

const SELECT =
  'id, amount_cents, status, provider, provider_ref, created_at, ' +
  'course:courses(title), ' +
  'service_request:service_requests(subject, service:services(title)), ' +
  'student:profiles!payments_student_id_fkey(name, username)'

function toInvoice(r: PaymentRow): Invoice {
  const isService = !r.course && !!r.service_request
  const item = isService
    ? r.service_request?.service?.title || r.service_request?.subject || 'خدمة'
    : r.course?.title || 'دورة'
  return {
    id: r.id,
    created_at: r.created_at,
    amount_cents: r.amount_cents,
    status: r.status,
    provider: r.provider,
    provider_ref: r.provider_ref,
    kind: isService ? 'service' : 'course',
    item,
    studentName: r.student?.name ?? undefined,
    studentUsername: r.student?.username ?? undefined,
  }
}

/** A student's own payment history (RLS also restricts to their rows). */
export async function listStudentInvoices(studentId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('payments')
    .select(SELECT)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as PaymentRow[]).map(toInvoice)
}

/** Every payment on the platform — owner only (RLS gates this to owners). */
export async function listAllInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('payments')
    .select(SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as PaymentRow[]).map(toInvoice)
}
