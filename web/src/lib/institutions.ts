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
