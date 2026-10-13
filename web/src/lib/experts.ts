import { supabase } from '@/lib/supabase'
import type { RequestStatus } from '@/lib/services'

// Experts ("teachers" in the data model): what each one can deliver, what they
// earn per request, and who they may chat with. Tables come from migration
// 0077; every read tolerates the table not existing yet (deploy-safe).

export interface ExpertProfile {
  user_id: string
  service_ids: string[]
  fields: string
  languages: string
  share_percent: number
  notes: string | null
}

export interface RequestPayout {
  request_id: string
  teacher_id: string
  amount_cents: number
  paid_at: string | null
}

export interface MyPayout extends RequestPayout {
  subject: string
  status: RequestStatus | null
  serviceTitle: string
}

/** Active requests count as the expert's current load. */
export const ACTIVE_STAGES: RequestStatus[] = ['paid', 'in_progress', 'awaiting_final']

export const emptyExpert = (user_id: string): ExpertProfile => ({
  user_id,
  service_ids: [],
  fields: '',
  languages: '',
  share_percent: 50,
  notes: null,
})

export async function listExpertProfiles(): Promise<Record<string, ExpertProfile>> {
  const { data, error } = await supabase.from('expert_profiles').select('*')
  if (error) return {}
  return Object.fromEntries((data ?? []).map((p) => [p.user_id as string, p as ExpertProfile]))
}

export async function saveExpertProfile(p: ExpertProfile) {
  const { error } = await supabase.from('expert_profiles').upsert({ ...p, updated_at: new Date().toISOString() })
  if (error) throw error
}

/** Per-expert counts over all requests (owner). */
export async function expertWorkload(): Promise<Record<string, { active: number; done: number }>> {
  const { data, error } = await supabase.from('service_requests').select('assigned_teacher_id, status').not('assigned_teacher_id', 'is', null)
  if (error) return {}
  const out: Record<string, { active: number; done: number }> = {}
  for (const r of data ?? []) {
    const id = r.assigned_teacher_id as string
    out[id] ??= { active: 0, done: 0 }
    if (ACTIVE_STAGES.includes(r.status as RequestStatus)) out[id].active += 1
    if (r.status === 'done') out[id].done += 1
  }
  return out
}

export async function listPayouts(requestIds: string[]): Promise<Record<string, RequestPayout>> {
  if (requestIds.length === 0) return {}
  const { data, error } = await supabase.from('request_payouts').select('request_id, teacher_id, amount_cents, paid_at').in('request_id', requestIds)
  if (error) return {}
  return Object.fromEntries((data ?? []).map((p) => [p.request_id as string, p as RequestPayout]))
}

export async function setPayout(requestId: string, teacherId: string, amountCents: number) {
  const { error } = await supabase
    .from('request_payouts')
    .upsert({ request_id: requestId, teacher_id: teacherId, amount_cents: amountCents, updated_at: new Date().toISOString() })
  if (error) throw error
}

/** Records the payout as a teacher_fees expense and marks it paid, atomically. */
export async function markPayoutPaid(requestId: string, method: 'bank' | 'cash' | 'card' = 'bank') {
  const { error } = await supabase.rpc('mark_payout_paid', { p_request: requestId, p_method: method })
  if (error) throw error
}

/** The signed-in expert's own earnings. */
export async function listMyPayouts(teacherId: string): Promise<MyPayout[]> {
  const { data, error } = await supabase
    .from('request_payouts')
    .select('request_id, teacher_id, amount_cents, paid_at, request:service_requests(subject, full_name, status, service:services(title))')
    .eq('teacher_id', teacherId)
    .order('updated_at', { ascending: false })
  if (error) return []
  return (data ?? []).map((p) => {
    const req = p.request as unknown as { subject: string | null; full_name: string; status: RequestStatus; service: { title: string } | null } | null
    return {
      request_id: p.request_id as string,
      teacher_id: p.teacher_id as string,
      amount_cents: p.amount_cents as number,
      paid_at: p.paid_at as string | null,
      subject: req?.subject || req?.full_name || '',
      status: req?.status ?? null,
      serviceTitle: req?.service?.title ?? '',
    }
  })
}

/**
 * Ids the caller may start a chat with — only people they actually work with
 * (assigned request or course). null = no restriction (owner, or before 0077).
 */
export async function myChatContactIds(): Promise<string[] | null> {
  const { data, error } = await supabase.rpc('my_chat_contact_ids')
  if (error) return null
  return ((data ?? []) as unknown[]).map((v) => (typeof v === 'string' ? v : (v as Record<string, string>).my_chat_contact_ids))
}
