import { supabase } from '@/lib/supabase'

export interface AttentionItem {
  key: string
  count: number
  to: string
}

type CountQuery = PromiseLike<{ count: number | null; error: unknown }>

/** A count that silently drops out (null) when its table/column isn't available. */
async function count(q: CountQuery): Promise<number | null> {
  const { count: n, error } = await q
  return error ? null : (n ?? 0)
}

/**
 * Owner "needs your attention" counters — each is work waiting on the owner,
 * with the page that resolves it. Zero / unavailable items are filtered out.
 */
export async function getOwnerAttention(): Promise<AttentionItem[]> {
  const head = { count: 'exact' as const, head: true }
  const [toPrice, unassigned, applications, institutions, consultations, receipts, contact, reviews] = await Promise.all([
    count(supabase.from('service_requests').select('id', head).eq('status', 'pending')),
    count(supabase.from('service_requests').select('id', head).in('status', ['paid', 'in_progress']).is('assigned_teacher_id', null)),
    count(supabase.from('profiles').select('id', head).eq('role', 'teacher').eq('status', 'pending')),
    count(supabase.from('profiles').select('id', head).eq('role', 'institution').eq('status', 'pending')),
    count(supabase.from('institution_consultations').select('id', head).eq('status', 'pending')),
    count(supabase.from('student_invoices').select('id', head).eq('status', 'submitted')),
    count(supabase.from('contact_messages').select('id', head).eq('read', false)),
    count(supabase.from('testimonials').select('id', head).eq('approved', false)),
  ])
  const items: { key: string; count: number | null; to: string }[] = [
    { key: 'toPrice', count: toPrice, to: '/owner/service-requests' },
    { key: 'unassigned', count: unassigned, to: '/owner/service-requests' },
    { key: 'receipts', count: receipts, to: '/owner/billing' },
    { key: 'applications', count: applications, to: '/owner/applications' },
    { key: 'institutions', count: institutions, to: '/owner/institutions' },
    { key: 'consultations', count: consultations, to: '/owner/institution-consultations' },
    { key: 'contact', count: contact, to: '/owner/contact' },
    { key: 'reviews', count: reviews, to: '/owner/reviews' },
  ]
  return items.filter((i): i is AttentionItem => (i.count ?? 0) > 0)
}
