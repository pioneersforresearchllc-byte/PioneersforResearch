import { supabase } from '@/lib/supabase'

export interface ServiceSession {
  id: string
  request_id: string
  title: string
  session_date: string | null
  session_time: string | null
  link: string | null
  created_at: string
}

export interface ServiceTask {
  id: string
  request_id: string
  title: string
  description: string | null
  due_date: string | null
  link: string | null
  done: boolean
  created_at: string
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
