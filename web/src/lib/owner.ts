import { supabase } from '@/lib/supabase'

export interface OwnerOverviewStats {
  pending_teacher_count: number
  approved_teacher_count: number
  courses_count: number
  students_count: number
  total_revenue_cents: number
  login_count: number
  overall_avg_rating: number
}

export async function getOverviewStats(): Promise<OwnerOverviewStats> {
  const { data, error } = await supabase.rpc('get_owner_overview_stats').single()
  if (error) throw error
  return data as OwnerOverviewStats
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
