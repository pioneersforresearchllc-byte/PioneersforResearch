import { supabase } from '@/lib/supabase'

export interface ServiceSession {
  id: string
  request_id: string
  title: string
  session_date: string | null
  session_time: string | null
  link: string | null
  is_video?: boolean
  daily_room_url?: string | null
  reminder_sent_at?: string | null
  created_at: string
}

/** Asks the backend for a Daily room + per-user token for an in-app video
 * session (access is verified server-side). */
export async function getCallToken(sessionId: string): Promise<{ roomUrl: string; token: string; isStaff: boolean }> {
  const { data, error } = await supabase.functions.invoke('create-call-token', { body: { sessionId } })
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
  const r = data as { roomUrl?: string; token?: string; isStaff?: boolean; error?: string }
  if (r.error || !r.roomUrl || !r.token) throw new Error(r.error || 'call failed')
  return { roomUrl: r.roomUrl, token: r.token, isStaff: !!r.isStaff }
}

// Saudi Arabia is a fixed UTC+3 (no DST). Sessions are scheduled in local Saudi
// time, so we anchor date+time to +03:00 to get the true instant — correct no
// matter what timezone the viewer's browser is in.
export function sessionStartMs(s: Pick<ServiceSession, 'session_date' | 'session_time'>): number | null {
  if (!s.session_date || !s.session_time) return null
  const t = s.session_time.length === 5 ? `${s.session_time}:00` : s.session_time
  const ms = Date.parse(`${s.session_date}T${t}+03:00`)
  return Number.isNaN(ms) ? null : ms
}

export const JOIN_WINDOW_MS = 15 * 60 * 1000 // door opens 15 min before start
export const SESSION_GRACE_MS = 3 * 60 * 60 * 1000 // "join" stays live 3h after

export type SessionPhase = 'no_time' | 'upcoming' | 'joinable' | 'live' | 'ended'

/** What state a session is in right now, driving the join button + countdown. */
export function sessionPhase(s: ServiceSession, now = Date.now()): SessionPhase {
  const start = sessionStartMs(s)
  if (start === null) return 'no_time'
  if (now < start - JOIN_WINDOW_MS) return 'upcoming'
  if (now < start) return 'joinable'
  if (now < start + SESSION_GRACE_MS) return 'live'
  return 'ended'
}

export interface ServiceTask {
  id: string
  request_id: string
  title: string
  description: string | null
  due_date: string | null
  link: string | null
  done: boolean
  submission_url?: string | null
  submission_name?: string | null
  submitted_at?: string | null
  grade?: number | null
  feedback?: string | null
  graded_at?: string | null
  created_at: string
}

export type TaskState = 'open' | 'submitted' | 'graded'

export function taskState(t: ServiceTask): TaskState {
  if (t.graded_at || typeof t.grade === 'number') return 'graded'
  if (t.submission_url) return 'submitted'
  return 'open'
}

export interface ServiceAttachment {
  url: string // storage path
  kind: 'image' | 'audio' | 'file'
  name: string
}

/** Upload a file into the private per-service bucket. Everything is stored
 * under "<requestId>/..." so the storage RLS can authorize by request. */
export async function uploadServiceAttachment(
  requestId: string,
  file: File,
  folder = 'chat',
): Promise<ServiceAttachment> {
  const kind: ServiceAttachment['kind'] = file.type.startsWith('image/')
    ? 'image'
    : file.type.startsWith('audio/')
      ? 'audio'
      : 'file'
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${requestId}/${folder}/${Date.now()}-${safe}`
  const { error } = await supabase.storage.from('service-files').upload(path, file)
  if (error) throw error
  return { url: path, kind, name: file.name }
}

export async function signServiceAttachment(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('service-files').createSignedUrl(path, 60 * 60)
  return data?.signedUrl ?? null
}

/** One of the student's subscribed services (a paid/active request). */
export interface MyServiceWorkspace {
  id: string
  status: string
  subject: string
  serviceTitle: string
  teacherName: string | null
  created_at: string
}

// The student's active service subscriptions — anything they've paid for.
const ACTIVE_STATUSES = ['paid', 'in_progress', 'done']

export async function listMyServiceWorkspaces(userId: string): Promise<MyServiceWorkspace[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select(
      'id, status, subject, created_at, service:services(title), teacher:profiles!service_requests_assigned_teacher_id_fkey(name)',
    )
    .eq('user_id', userId)
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    status: r.status as string,
    subject: r.subject as string,
    created_at: r.created_at as string,
    serviceTitle: ((r.service as { title: string } | null)?.title) ?? '',
    teacherName: ((r.teacher as { name: string } | null)?.name) ?? null,
  }))
}

export interface ServiceActivity {
  sessions: number
  tasks: number
}

/** Counts of sessions + tasks per request, for the "My Services" cards. Returns
 * zeros (no crash) if the workspace tables aren't migrated yet. */
export async function getServicesActivity(requestIds: string[]): Promise<Record<string, ServiceActivity>> {
  const result: Record<string, ServiceActivity> = {}
  for (const id of requestIds) result[id] = { sessions: 0, tasks: 0 }
  if (requestIds.length === 0) return result
  const [{ data: ses }, { data: tsk }] = await Promise.all([
    supabase.from('service_sessions').select('request_id').in('request_id', requestIds),
    supabase.from('service_tasks').select('request_id').in('request_id', requestIds),
  ])
  for (const r of ses ?? []) {
    const id = (r as { request_id: string }).request_id
    if (result[id]) result[id].sessions += 1
  }
  for (const r of tsk ?? []) {
    const id = (r as { request_id: string }).request_id
    if (result[id]) result[id].tasks += 1
  }
  return result
}

// ── Sessions ────────────────────────────────────────────────────────────
export async function listSessions(requestId: string): Promise<ServiceSession[]> {
  const { data, error } = await supabase
    .from('service_sessions')
    .select('*')
    .eq('request_id', requestId)
    .order('session_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as ServiceSession[]
}

export async function addSession(input: {
  request_id: string
  title: string
  session_date: string | null
  session_time: string | null
  link: string | null
  is_video?: boolean
}) {
  const { error } = await supabase.from('service_sessions').insert(input)
  if (error) throw error
}

export async function deleteSession(id: string) {
  const { error } = await supabase.from('service_sessions').delete().eq('id', id)
  if (error) throw error
}

// ── Tasks ───────────────────────────────────────────────────────────────
export async function listTasks(requestId: string): Promise<ServiceTask[]> {
  const { data, error } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as ServiceTask[]
}

export async function addTask(input: {
  request_id: string
  title: string
  description: string | null
  due_date: string | null
  link: string | null
}) {
  const { error } = await supabase.from('service_tasks').insert(input)
  if (error) throw error
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('service_tasks').delete().eq('id', id)
  if (error) throw error
}

/** Student toggles a task done (RPC touches only the `done` column). */
export async function setTaskDone(taskId: string, done: boolean) {
  const { error } = await supabase.rpc('set_service_task_done', { p_task: taskId, p_done: done })
  if (error) throw error
}

/** Student submits (or replaces) their deliverable file for a task. Clears any
 * previous grade so the teacher reviews the new file. */
export async function submitServiceTask(taskId: string, attachment: ServiceAttachment) {
  const { error } = await supabase.rpc('submit_service_task', {
    p_task: taskId,
    p_url: attachment.url,
    p_name: attachment.name,
  })
  if (error) throw error
}

/** Student withdraws their submission (only allowed before it's graded). */
export async function clearServiceTaskSubmission(taskId: string) {
  const { error } = await supabase.rpc('clear_service_task_submission', { p_task: taskId })
  if (error) throw error
}

/** Teacher/owner grades a submitted task out of 100 (write policy enforced). */
export async function gradeServiceTask(taskId: string, grade: number, feedback: string | null) {
  const { error } = await supabase
    .from('service_tasks')
    .update({ grade, feedback, graded_at: new Date().toISOString(), done: true })
    .eq('id', taskId)
  if (error) throw error
}

// ── Service chat (assigned teacher ↔ student, scoped to the request) ──────
export interface ServiceMessage {
  id: string
  request_id: string
  sender_id: string
  text: string | null
  attachment_url: string | null
  attachment_kind: string | null
  attachment_name: string | null
  created_at: string
  sender?: { id: string; name: string; role: string } | null
}

export async function listServiceMessages(requestId: string): Promise<ServiceMessage[]> {
  const { data, error } = await supabase
    .from('service_messages')
    .select('*, sender:profiles!service_messages_sender_id_fkey(id, name, role)')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
  // Deploy-safe: if the table isn't migrated yet, show an empty thread rather
  // than throwing into the workspace UI.
  if (error) return []
  return (data ?? []) as unknown as ServiceMessage[]
}

export async function editServiceMessage(id: string, text: string) {
  const { error } = await supabase.from('service_messages').update({ text: text.trim() || null }).eq('id', id)
  if (error) throw error
}

export async function deleteServiceMessage(id: string) {
  const { error } = await supabase.from('service_messages').delete().eq('id', id)
  if (error) throw error
}

export async function sendServiceMessage(input: {
  request_id: string
  sender_id: string
  text: string
  attachment?: ServiceAttachment | null
}) {
  const { error } = await supabase.from('service_messages').insert({
    request_id: input.request_id,
    sender_id: input.sender_id,
    text: input.text.trim() || null,
    attachment_url: input.attachment?.url ?? null,
    attachment_kind: input.attachment?.kind ?? null,
    attachment_name: input.attachment?.name ?? null,
  })
  if (error) throw error
}

export function subscribeServiceMessages(requestId: string, onInsert: () => void): () => void {
  const channel = supabase
    .channel(`svc-msgs:${requestId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'service_messages', filter: `request_id=eq.${requestId}` },
      onInsert,
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
