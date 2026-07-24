import { supabase } from '@/lib/supabase'

export interface Institution {
  id: string
  primary_contact_user_id: string | null
  name: string
  org_type: string | null
  registration_number: string | null
  country: string | null
  city: string | null
  contact_name: string | null
  contact_title: string | null
  contact_email: string | null
  contact_phone: string | null
  consultation_type: string | null
  size: string | null
  verified: boolean
  created_at: string
}

/** The institution the signed-in user belongs to (primary contact or member). */
export async function getMyInstitution(): Promise<Institution | null> {
  const { data } = await supabase.from('institutions').select('*').limit(1).maybeSingle()
  return (data as Institution) ?? null
}

// ── Team members ──────────────────────────────────────────────────────────
export type MemberRole = 'admin' | 'coordinator' | 'member'

export interface InstitutionMember {
  id: string
  institution_id: string
  user_id: string
  member_role: MemberRole
  created_at: string
  name: string
  username: string
}

/** True when the signed-in user may manage their institution's team. */
export async function amInstitutionAdmin(): Promise<boolean> {
  const { data } = await supabase.rpc('is_institution_admin')
  return Boolean(data)
}

export async function listInstitutionMembers(): Promise<InstitutionMember[]> {
  const { data, error } = await supabase
    .from('institution_members')
    .select('*, profile:profiles(name, username)')
    .order('created_at')
  if (error) throw error
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>
    const p = row.profile as { name: string; username: string } | null
    return {
      ...(row as unknown as InstitutionMember),
      name: p?.name ?? '',
      username: p?.username ?? '',
    }
  })
}

export async function createInstitutionMember(input: {
  name: string
  username: string
  email: string
  password: string
  memberRole: MemberRole
}) {
  const { data, error } = await supabase.functions.invoke('create-institution-member', { body: input })
  if (error) {
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.text === 'function') {
      try {
        const raw = await ctx.text()
        const parsed = JSON.parse(raw) as { error?: string }
        throw new Error(parsed.error || raw)
      } catch (e) {
        if (e instanceof Error && e.message) throw e
      }
    }
    throw error
  }
  const result = data as { created?: boolean; error?: string }
  if (result?.error) throw new Error(result.error)
}

export async function removeInstitutionMember(id: string) {
  const { error } = await supabase.from('institution_members').delete().eq('id', id)
  if (error) throw error
}

// ── Consultations ─────────────────────────────────────────────────────────
export type ConsultationStatus = 'pending' | 'awaiting_payment' | 'in_progress' | 'done' | 'cancelled'

export interface Consultation {
  id: string
  institution_id: string
  created_by: string | null
  title: string
  description: string | null
  consultation_type: string | null
  budget_estimate: string | null
  timeline: string | null
  attachment_url: string | null
  final_price_cents: number | null
  status: ConsultationStatus
  created_at: string
  institutionName?: string
}

export interface ConsultationInput {
  institution_id: string
  created_by: string
  title: string
  description: string | null
  consultation_type: string | null
  budget_estimate: string | null
  timeline: string | null
}

export async function createConsultation(values: ConsultationInput) {
  const { error } = await supabase.from('institution_consultations').insert(values)
  if (error) throw error
}

/** The signed-in institution's own consultations (RLS-scoped). */
export async function listMyConsultations(): Promise<Consultation[]> {
  const { data, error } = await supabase
    .from('institution_consultations')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Consultation[]) ?? []
}

/** Owner: every institution's consultations, with the institution name. */
export async function listAllConsultations(): Promise<Consultation[]> {
  const { data, error } = await supabase
    .from('institution_consultations')
    .select('*, institution:institutions(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>
    return {
      ...(row as unknown as Consultation),
      institutionName: (row.institution as { name: string } | null)?.name ?? '',
    }
  })
}

/** Starts Stripe Checkout for a priced consultation; returns the hosted URL. */
export async function startConsultationCheckout(consultationId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-consultation-checkout', {
    body: { consultationId },
  })
  if (error) {
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.text === 'function') {
      try {
        const raw = await ctx.text()
        const parsed = JSON.parse(raw) as { error?: string }
        throw new Error(parsed.error || raw)
      } catch (e) {
        if (e instanceof Error && e.message) throw e
      }
    }
    throw error
  }
  const result = data as { url?: string; error?: string }
  if (result.error || !result.url) throw new Error(result.error || 'checkout failed')
  return result.url
}

export interface Invoice {
  id: string
  consultation_id: string | null
  amount_cents: number
  method: 'stripe' | 'bank'
  status: 'unpaid' | 'paid'
  created_at: string
}

export async function listMyInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('institution_invoices')
    .select('id, consultation_id, amount_cents, method, status, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Invoice[]) ?? []
}

/** Owner marks a bank-transfer consultation paid once the transfer lands. */
export async function markConsultationPaid(consultationId: string, amountCents: number, institutionId: string) {
  const { error } = await supabase.from('institution_invoices').insert({
    institution_id: institutionId,
    consultation_id: consultationId,
    amount_cents: amountCents,
    method: 'bank',
    status: 'paid',
  })
  if (error) throw error
  const { error: cErr } = await supabase
    .from('institution_consultations')
    .update({ status: 'in_progress' })
    .eq('id', consultationId)
  if (cErr) throw cErr
}

export async function updateConsultationStatus(id: string, status: ConsultationStatus) {
  const { error } = await supabase.from('institution_consultations').update({ status }).eq('id', id)
  if (error) throw error
}

export async function setConsultationPrice(id: string, finalPriceCents: number) {
  const { error } = await supabase
    .from('institution_consultations')
    .update({ final_price_cents: finalPriceCents, status: 'awaiting_payment' })
    .eq('id', id)
  if (error) throw error
}

// ── Owner verification ────────────────────────────────────────────────────
export async function listInstitutions(): Promise<Institution[]> {
  const { data, error } = await supabase.from('institutions').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as Institution[]) ?? []
}

/** Verify: activate the institution's account (profile status active + verified). */
export async function verifyInstitution(inst: Institution) {
  const { error } = await supabase.from('institutions').update({ verified: true }).eq('id', inst.id)
  if (error) throw error
  if (inst.primary_contact_user_id) {
    const { error: pErr } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', inst.primary_contact_user_id)
    if (pErr) throw pErr
  }
}

export async function rejectInstitution(inst: Institution) {
  if (inst.primary_contact_user_id) {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'rejected' })
      .eq('id', inst.primary_contact_user_id)
    if (error) throw error
  }
  await supabase.from('institutions').update({ verified: false }).eq('id', inst.id)
}
