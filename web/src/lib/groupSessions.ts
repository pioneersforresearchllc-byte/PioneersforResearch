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
  /** Invite-only (migration 0088). Absent before that migration runs. */
  is_private?: boolean
}

export interface GroupSignupRow {
  session_id: string
  user_id: string
  registered_at: string
  joined_at: string | null
  name?: string
  username?: string
  role?: string
}

const BASE_COLS = 'id, title, description, scheduled_at, duration_min, capacity, seats_taken, host_id, status, created_at'

// Reads ask for is_private too, but fall back to the original columns if
// migration 0088 hasn't been applied yet (42703 = undefined column), so the
// workshops pages keep working either way.
async function selectSessions(
  run: (cols: string) => PromiseLike<{ data: unknown; error: { code?: string } | null }>,
): Promise<unknown> {
  let res = await run(`${BASE_COLS}, is_private`)
  if (res.error?.code === '42703') res = await run(BASE_COLS)
  if (res.error) throw res.error
  return res.data
}

/** Upcoming + live workshops the caller may see (RLS hides others' private ones). */
export async function listOpenWorkshops(): Promise<GroupSession[]> {
  const data = await selectSessions((cols) =>
    supabase.from('group_sessions').select(cols).in('status', ['scheduled', 'live']).order('scheduled_at', { ascending: true }),
  )
  return (data ?? []) as GroupSession[]
}

/** All workshops (admin view), newest first. */
export async function listAllWorkshops(): Promise<GroupSession[]> {
  const data = await selectSessions((cols) => supabase.from('group_sessions').select(cols).order('scheduled_at', { ascending: false }))
  return (data ?? []) as GroupSession[]
}

export async function getWorkshop(id: string): Promise<GroupSession | null> {
  const data = await selectSessions((cols) => supabase.from('group_sessions').select(cols).eq('id', id).maybeSingle())
  return (data as GroupSession | null) ?? null
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
  is_private?: boolean
}

/** Creates a workshop and returns its id. */
export async function createWorkshop(input: WorkshopInput): Promise<string> {
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('group_sessions')
    .insert({ ...input, created_by: auth.user?.id ?? null })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function updateWorkshop(id: string, patch: Partial<WorkshopInput & { status: GroupSessionStatus }>): Promise<void> {
  const { error } = await supabase.from('group_sessions').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteWorkshop(id: string): Promise<void> {
  const { error } = await supabase.from('group_sessions').delete().eq('id', id)
  if (error) throw error
}

/** Roster for a workshop (owner-only via RLS), with names. */
export async function listWorkshopSignups(sessionId: string): Promise<GroupSignupRow[]> {
  const { data, error } = await supabase
    .from('group_session_signups')
    .select('session_id, user_id, registered_at, joined_at, profile:profiles(name, username, role)')
    .eq('session_id', sessionId)
    .order('registered_at')
  if (error) throw error
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>
    const prof = row.profile as { name: string; username: string; role: string } | null
    return { ...(row as unknown as GroupSignupRow), name: prof?.name ?? '', username: prof?.username ?? '', role: prof?.role ?? '' }
  })
}

// ── Private workshops (migration 0088) ───────────────────────────────────────
/** Owner: register people in a workshop (they're notified). Returns how many
 * were newly added. */
export async function inviteToWorkshop(sessionId: string, userIds: string[]): Promise<number> {
  if (userIds.length === 0) return 0
  const { data, error } = await supabase.rpc('invite_to_group_session', { p_session: sessionId, p_users: userIds })
  if (error) throw error
  return (data as number) ?? 0
}

/** Owner: remove one person from a workshop's roster. */
export async function removeFromWorkshop(sessionId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('group_session_signups').delete().eq('session_id', sessionId).eq('user_id', userId)
  if (error) throw error
}

export interface PersonOption {
  id: string
  name: string
  username: string
  role: string
}

/** Owner: accounts (not owners) whose name or username matches. */
export async function searchPeople(q: string): Promise<PersonOption[]> {
  const term = q.trim().replace(/[%,()*]/g, ' ')
  if (term.length < 2) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, username, role')
    .or(`name.ilike.*${term}*,username.ilike.*${term}*`)
    .neq('role', 'owner')
    .order('name')
    .limit(20)
  if (error) throw error
  return (data ?? []) as PersonOption[]
}

/** Owner: courses with their enrolment counts, for "invite a course's students". */
export async function listCourseOptions(): Promise<{ id: string; title: string; enrolled: number }[]> {
  const [{ data: courses, error }, { data: enr }] = await Promise.all([
    supabase.from('courses').select('id, title').order('created_at', { ascending: false }),
    supabase.from('enrollments').select('course_id'),
  ])
  if (error) throw error
  return (courses ?? []).map((c) => ({ ...c, enrolled: (enr ?? []).filter((e) => e.course_id === c.id).length }))
}

/** Owner: every student enrolled in a course. */
export async function listCourseStudents(courseId: string): Promise<PersonOption[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('student:profiles(id, name, username, role)')
    .eq('course_id', courseId)
  if (error) throw error
  return (data ?? []).map((r) => r.student as unknown as PersonOption | null).filter((p): p is PersonOption => !!p)
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
