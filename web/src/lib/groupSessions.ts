import { supabase } from '@/lib/supabase'

export type GroupSessionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled'

export interface GroupSession {
  id: string
  title: string
  description: string | null
  scheduled_at: string
  duration_min: number
  capacity: number
  seats_taken: number
  host_id: string | null
  status: GroupSessionStatus
  created_at: string
}

export interface GroupSignupRow {
  session_id: string
  user_id: string
  registered_at: string
  joined_at: string | null
}

/** Upcoming + live workshops any logged-in account holder can see. */
export async function listOpenWorkshops(): Promise<GroupSession[]> {
  const { data, error } = await supabase
    .from('group_sessions')
    .select('id, title, description, scheduled_at, duration_min, capacity, seats_taken, host_id, status, created_at')
    .in('status', ['scheduled', 'live'])
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as GroupSession[]
}

/** All workshops (admin view), newest first. */
export async function listAllWorkshops(): Promise<GroupSession[]> {
  const { data, error } = await supabase
    .from('group_sessions')
    .select('id, title, description, scheduled_at, duration_min, capacity, seats_taken, host_id, status, created_at')
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as GroupSession[]
}

export async function getWorkshop(id: string): Promise<GroupSession | null> {
  const { data, error } = await supabase
    .from('group_sessions')
    .select('id, title, description, scheduled_at, duration_min, capacity, seats_taken, host_id, status, created_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as GroupSession) ?? null
}

/** The workshop ids the current user has reserved a seat in. */
export async function listMySignups(): Promise<Set<string>> {
  const { data, error } = await supabase.from('group_session_signups').select('session_id')
  if (error) return new Set()
  return new Set((data ?? []).map((r) => (r as { session_id: string }).session_id))
}

export type SignupResult = 'ok' | 'already' | 'full' | 'closed' | 'missing'

export async function reserveSeat(sessionId: string): Promise<SignupResult> {
  const { data, error } = await supabase.rpc('signup_group_session', { p_session: sessionId })
  if (error) throw error
  return (data as SignupResult) ?? 'missing'
}

export async function cancelSeat(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_group_signup', { p_session: sessionId })
  if (error) throw error
}

// ── Admin CRUD ─────────────────────────────────────────────────────────────
export interface WorkshopInput {
  title: string
  description: string | null
  scheduled_at: string
  duration_min: number
  capacity: number
  host_id: string | null
}

export async function createWorkshop(input: WorkshopInput): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const { error } = await supabase.from('group_sessions').insert({ ...input, created_by: auth.user?.id ?? null })
  if (error) throw error
}

export async function updateWorkshop(id: string, patch: Partial<WorkshopInput & { status: GroupSessionStatus }>): Promise<void> {
  const { error } = await supabase.from('group_sessions').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteWorkshop(id: string): Promise<void> {
  const { error } = await supabase.from('group_sessions').delete().eq('id', id)
  if (error) throw error
}

/** Roster for a workshop (owner-only via RLS). */
export async function listWorkshopSignups(sessionId: string): Promise<GroupSignupRow[]> {
  const { data, error } = await supabase
    .from('group_session_signups')
    .select('session_id, user_id, registered_at, joined_at')
    .eq('session_id', sessionId)
  if (error) throw error
  return (data ?? []) as GroupSignupRow[]
}

/** Daily room + per-user token for a workshop (access verified server-side). */
export async function getGroupCallToken(
  sessionId: string,
): Promise<{ roomUrl: string; token: string; isHost: boolean; title: string }> {
  const { data, error } = await supabase.functions.invoke('create-group-call-token', { body: { sessionId } })
  if (error) {
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.text === 'function') {
      try {
        const parsed = JSON.parse(await ctx.text()) as { error?: string }
        throw new Error(parsed.error || error.message)
      } catch (e) {
        if (e instanceof Error && e.message) throw e
      }
    }
    throw error
  }
  const r = data as { roomUrl?: string; token?: string; isHost?: boolean; title?: string; error?: string }
  if (r.error || !r.roomUrl || !r.token) throw new Error(r.error || 'call failed')
  return { roomUrl: r.roomUrl, token: r.token, isHost: !!r.isHost, title: r.title ?? '' }
}

// Saudi Arabia is a fixed UTC+3. scheduled_at is a real instant (timestamptz),
// so these helpers are timezone-safe for display and for gating the join.
export function workshopStartMs(s: Pick<GroupSession, 'scheduled_at'>): number {
  return new Date(s.scheduled_at).getTime()
}

/** The join button opens this many minutes before the scheduled start. */
export const JOIN_WINDOW_MIN = 15

export function canJoinNow(s: Pick<GroupSession, 'scheduled_at' | 'duration_min' | 'status'>): boolean {
  if (s.status === 'ended' || s.status === 'cancelled') return false
  const start = workshopStartMs(s)
  const open = start - JOIN_WINDOW_MIN * 60 * 1000
  const close = start + (s.duration_min || 60) * 60 * 1000 + 60 * 60 * 1000 // + 1h grace
  const now = Date.now()
  return now >= open && now <= close
}
