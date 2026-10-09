import { supabase } from '@/lib/supabase'

/**
 * Version of the Terms / Privacy / Refund documents. Bump it whenever the legal
 * pages change materially: every signed-in user is then asked (TermsGate) to
 * accept the new version, and the acceptance is recorded in terms_acceptances
 * (migration 0073) as evidence — who, which version, when, from which browser.
 */
export const TERMS_VERSION = '2026-10-09'

/** true = accepted current version; false = not yet; undefined = table missing (migration pending). */
export async function hasAcceptedTerms(userId: string): Promise<boolean | undefined> {
  const { data, error } = await supabase
    .from('terms_acceptances')
    .select('version')
    .eq('user_id', userId)
    .eq('version', TERMS_VERSION)
    .maybeSingle()
  if (error) return undefined
  return !!data
}

export async function recordTermsAcceptance(userId: string) {
  const { error } = await supabase.from('terms_acceptances').upsert(
    {
      user_id: userId,
      version: TERMS_VERSION,
      accepted_at: new Date().toISOString(),
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: 'user_id,version', ignoreDuplicates: true },
  )
  if (error) throw error
}
