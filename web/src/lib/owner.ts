import { supabase } from '@/lib/supabase'

export interface OwnerOverviewStats {
  pending_teacher_count: number
  approved_teacher_count: number
  courses_count: number
  students_count: number
  total_revenue_cents: number
  login_count: number
  overall_avg_rating: number
  // v2 extras (0 when the v2 RPC isn't available yet)
  enrollments_count: number
  requests_count: number
  students_this_week: number
  students_last_week: number
  enrollments_this_week: number
  enrollments_last_week: number
  requests_this_week: number
  requests_last_week: number
  revenue_this_week_cents: number
  revenue_last_week_cents: number
  logins_this_week: number
  logins_last_week: number
}

const ZERO_WEEKLY = {
  enrollments_count: 0,
  requests_count: 0,
  students_this_week: 0,
  students_last_week: 0,
  enrollments_this_week: 0,
  enrollments_last_week: 0,
  requests_this_week: 0,
  requests_last_week: 0,
  revenue_this_week_cents: 0,
  revenue_last_week_cents: 0,
  logins_this_week: 0,
  logins_last_week: 0,
}

/** Prefers the richer v2 RPC (week-over-week); falls back to v1 (totals only)
 * so the dashboard keeps working before migration 0052 is applied. */
export async function getOverviewStats(): Promise<OwnerOverviewStats> {
  const v2 = await supabase.rpc('get_owner_overview_stats_v2').single()
  if (!v2.error && v2.data) return v2.data as OwnerOverviewStats
  const { data, error } = await supabase.rpc('get_owner_overview_stats').single()
  if (error) throw error
  return { ...ZERO_WEEKLY, ...(data as Record<string, number>) } as OwnerOverviewStats
}

export interface AccountRow {
  id: string
  name: string
  username: string
  role: 'student' | 'teacher' | 'owner'
  status: 'active' | 'pending' | 'rejected'
  is_temp_admin: boolean
  suspended: boolean
  restrictions: string[]
  email: string | null
  last_sign_in_at: string | null
  created_at: string
}

/** Capabilities an admin can ban a user from (must match the edge function). */
export const RESTRICTION_CAPS = ['chat', 'requests', 'comments', 'submissions'] as const
export type RestrictionCap = (typeof RESTRICTION_CAPS)[number]

async function adminAction(body: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-accounts', { body })
  if (error) {
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.text === 'function') {
      try {
        const parsed = JSON.parse(await ctx.text()) as { error?: string }
        if (parsed.error) throw new Error(parsed.error)
      } catch (e) {
        if (e instanceof Error && e.message) throw e
      }
    }
    throw error
  }
  const result = data as { error?: string }
  if (result?.error) throw new Error(result.error)
}

export const setUserSuspended = (userId: string, suspended: boolean) =>
  adminAction({ action: 'set_suspended', userId, suspended })

export const setUserRestrictions = (userId: string, restrictions: string[]) =>
  adminAction({ action: 'set_restrictions', userId, restrictions })

export const deleteUserAccount = (userId: string) => adminAction({ action: 'delete_user', userId })

export const enrollStudent = (userId: string, courseId: string) =>
  adminAction({ action: 'enroll', userId, courseId })

export const unenrollStudent = (userId: string, courseId: string) =>
  adminAction({ action: 'unenroll', userId, courseId })

export type BroadcastAudience = 'students' | 'teachers' | 'all'

export interface BroadcastRow {
  id: string
  audience: BroadcastAudience
  subject: string
  message: string
  recipient_count: number
  created_at: string
}

/** Send an email to every active student / teacher (or both). Returns how
 * many recipients it reached; `sent` is false when SMTP isn't configured or
 * there were no matching accounts. */
export async function sendBroadcast(input: {
  audience: BroadcastAudience
  subject: string
  message: string
}): Promise<{ sent: boolean; recipientCount: number }> {
  const { data, error } = await supabase.functions.invoke('admin-broadcast', { body: input })
  if (error) {
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.text === 'function') {
      try {
        const parsed = JSON.parse(await ctx.text()) as { error?: string }
        if (parsed.error) throw new Error(parsed.error)
      } catch (e) {
        if (e instanceof Error && e.message) throw e
      }
    }
    throw error
  }
  const result = data as { sent?: boolean; recipientCount?: number; error?: string }
  if (result?.error) throw new Error(result.error)
  return { sent: !!result?.sent, recipientCount: result?.recipientCount ?? 0 }
}

export async function listBroadcasts(): Promise<BroadcastRow[]> {
  const { data, error } = await supabase
    .from('admin_broadcasts')
    .select('id, audience, subject, message, recipient_count, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as BroadcastRow[]
}

export async function listAllAccounts(): Promise<AccountRow[]> {
  const { data, error } = await supabase.functions.invoke('admin-accounts', { body: { action: 'list' } })
  if (error) throw error
  const result = data as { accounts?: AccountRow[]; error?: string }
  if (result.error) throw new Error(result.error)
  return result.accounts ?? []
}

export async function adminSetPassword(userId: string, newPassword: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-accounts', {
    body: { action: 'set_password', userId, newPassword },
  })
  if (error) throw error
  const result = data as { updated?: boolean; error?: string }
  if (result.error || !result.updated) throw new Error(result.error || 'failed')
}

export interface AdminRow {
  id: string
  name: string
  username: string
  is_temp_admin: boolean
  created_at: string
}

export async function listAdmins(): Promise<AdminRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, username, is_temp_admin, created_at')
    .eq('role', 'owner')
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function createAdmin(params: {
  name: string
  username: string
  email: string
  password: string
  isTemp: boolean
}) {
  const { data: session } = await supabase.auth.getSession()
  const { data, error } = await supabase.functions.invoke('create-admin', {
    body: params,
    headers: session.session ? { Authorization: `Bearer ${session.session.access_token}` } : undefined,
  })
  if (error) throw error
  if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error)
  return data
}

export async function removeAdmin(id: string) {
  const { error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) throw error
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  message: string
  read: boolean
  created_at: string
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function markContactMessageRead(id: string) {
  const { error } = await supabase.from('contact_messages').update({ read: true }).eq('id', id)
  if (error) throw error
}
