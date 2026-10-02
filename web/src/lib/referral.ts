import { supabase } from '@/lib/supabase'

const STORE_KEY = 'pioneers.ref'

/** Remember ?ref=<username> from a referral link until the visitor has an account. */
export function captureReferralFromUrl(search: string) {
  const ref = new URLSearchParams(search).get('ref')
  if (!ref) return
  try {
    localStorage.setItem(STORE_KEY, ref.trim().slice(0, 40))
  } catch {
    // storage blocked: the referral just isn't recorded
  }
}

/**
 * Once the new user's profile exists, credit the referrer (server-side checks:
 * only once, only for new accounts, never yourself). Clears the stored ref
 * whatever the outcome so it is attempted a single time.
 */
export async function applyStoredReferral() {
  let ref: string | null = null
  try {
    ref = localStorage.getItem(STORE_KEY)
  } catch {
    return
  }
  if (!ref) return
  await supabase.rpc('apply_referral', { p_username: ref })
  try {
    localStorage.removeItem(STORE_KEY)
  } catch {
    // ignore
  }
}

export function referralLink(username: string) {
  return `${window.location.origin}/register?ref=${encodeURIComponent(username)}`
}

export interface ReferralRow {
  referrerId: string
  referrerName: string
  referrerUsername: string
  referred: { id: string; name: string; created_at: string }[]
}

/** Owner view: who brought whom (profiles are readable to signed-in users). */
export async function listReferrals(): Promise<ReferralRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, created_at, referred_by, referrer:profiles!profiles_referred_by_fkey(id, name, username)')
    .not('referred_by', 'is', null)
    .order('created_at', { ascending: false })
  if (error) return []
  const map = new Map<string, ReferralRow>()
  for (const row of data ?? []) {
    const r = row.referrer as unknown as { id: string; name: string; username: string } | null
    if (!r) continue
    const entry = map.get(r.id) ?? { referrerId: r.id, referrerName: r.name, referrerUsername: r.username, referred: [] }
    entry.referred.push({ id: row.id as string, name: row.name as string, created_at: row.created_at as string })
    map.set(r.id, entry)
  }
  return [...map.values()].sort((a, b) => b.referred.length - a.referred.length)
}

/** How many people the signed-in user has brought in. */
export async function countMyReferrals(userId: string): Promise<number> {
  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', userId)
  return count ?? 0
}
