import { supabase } from '@/lib/supabase'
import { PRIVACY, REFUND, TERMS } from '@/lib/legalDocs'

/**
 * Version of the Terms / Privacy / Refund documents. Bump it whenever the legal
 * pages change materially: every signed-in user is then asked (TermsGate) to
 * accept the new version, and the acceptance is recorded in terms_acceptances
 * (migrations 0073 + 0074) as evidence — who, which version, which exact text
 * (doc_hash), when and from which IP / browser (both set server-side).
 */
export const TERMS_VERSION = '2026-10-15'

let hashPromise: Promise<string> | null = null

/**
 * SHA-256 (hex) of the exact legal texts, both languages. Shown at the foot of
 * each legal page and stored with every acceptance, so an archived copy of the
 * page can be matched to the acceptances that were made against it.
 */
export function legalDocsHash(): Promise<string> {
  hashPromise ??= (async () => {
    const text = JSON.stringify({ version: TERMS_VERSION, terms: TERMS, privacy: PRIVACY, refund: REFUND })
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
  })()
  return hashPromise
}

const userAgent = () => navigator.userAgent.slice(0, 300)

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

export async function recordTermsAcceptance(userId: string, context: 'signup' | 'gate' = 'signup') {
  const doc_hash = await legalDocsHash()
  const row = { user_id: userId, version: TERMS_VERSION, accepted_at: new Date().toISOString(), user_agent: userAgent() }
  let { error } = await supabase
    .from('terms_acceptances')
    .upsert({ ...row, doc_hash, context }, { onConflict: 'user_id,version', ignoreDuplicates: true })
  // Before migration 0074 the doc_hash / context columns don't exist yet.
  if (error && /doc_hash|context/.test(error.message)) {
    ;({ error } = await supabase.from('terms_acceptances').upsert(row, { onConflict: 'user_id,version', ignoreDuplicates: true }))
  }
  if (error) throw error
}

export type ConsentKind =
  | 'payment_no_refund'
  | 'marketing_opt_in'
  | 'marketing_opt_out'
  | 'sensitive_data'
  | 'service_request_terms'
  | 'consultant_agreement'

/**
 * Append a consent to the consent_events ledger (migration 0074). The server
 * fills the time, IP and — for signed-in users — email and name. Never throws:
 * a missing table (migration pending) must not block a payment or a request.
 */
export async function recordConsent(
  kind: ConsentKind,
  opts: { userId?: string | null; ref?: string | null; email?: string | null; name?: string | null } = {},
): Promise<void> {
  try {
    const { error } = await supabase.from('consent_events').insert({
      user_id: opts.userId ?? null,
      kind,
      ref: opts.ref ?? null,
      email: opts.email ?? null,
      full_name: opts.name ?? null,
      terms_version: TERMS_VERSION,
      doc_hash: await legalDocsHash(),
      user_agent: userAgent(),
    })
    if (error) console.warn('consent not recorded', error.message)
  } catch (e) {
    console.warn('consent not recorded', e)
  }
}

/** The user's latest marketing choice: true / false, null if never asked, undefined if migration 0074 is pending. */
export async function getMarketingConsent(userId: string): Promise<boolean | null | undefined> {
  const { data, error } = await supabase
    .from('consent_events')
    .select('kind')
    .eq('user_id', userId)
    .in('kind', ['marketing_opt_in', 'marketing_opt_out'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return undefined
  if (!data) return null
  return data.kind === 'marketing_opt_in'
}

export async function setMarketingConsent(userId: string, optIn: boolean) {
  const { error } = await supabase.from('consent_events').insert({
    user_id: userId,
    kind: optIn ? 'marketing_opt_in' : 'marketing_opt_out',
    terms_version: TERMS_VERSION,
    doc_hash: await legalDocsHash(),
    user_agent: userAgent(),
  })
  if (error) throw error
}

// ── Owner: evidence lookup ────────────────────────────────────────────────
export interface AcceptanceRow {
  user_id: string
  version: string
  accepted_at: string
  email: string | null
  full_name: string | null
  ip: string | null
  user_agent: string | null
  doc_hash: string | null
  context: string | null
}
export interface ConsentRow {
  id: number
  user_id: string | null
  email: string | null
  full_name: string | null
  kind: ConsentKind
  ref: string | null
  terms_version: string | null
  doc_hash: string | null
  ip: string | null
  user_agent: string | null
  created_at: string
}

/** Owner-only (RLS): latest acceptances and consent events, optionally filtered by email / name. */
export async function listConsentEvidence(search: string): Promise<{ acceptances: AcceptanceRow[]; events: ConsentRow[] }> {
  const q = search.trim().replace(/[%,()]/g, '')
  let acc = supabase.from('terms_acceptances').select('*').order('accepted_at', { ascending: false }).limit(500)
  let ev = supabase.from('consent_events').select('*').order('created_at', { ascending: false }).limit(500)
  if (q) {
    acc = acc.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
    ev = ev.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,ref.ilike.%${q}%`)
  }
  const [a, e] = await Promise.all([acc, ev])
  return { acceptances: (a.data ?? []) as AcceptanceRow[], events: (e.data ?? []) as ConsentRow[] }
}
