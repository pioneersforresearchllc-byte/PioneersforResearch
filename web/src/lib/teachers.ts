import { supabase } from '@/lib/supabase'

export interface TeacherApplication {
  id: string
  name: string
  username: string
  specialty: string | null
  qualification: string | null
  years_experience: number | null
  cv_text: string | null
  created_at: string
}

export interface TeacherRow {
  id: string
  name: string
  username: string
  specialty: string | null
  qualification: string | null
  years_experience: number | null
  status: 'active' | 'pending' | 'rejected'
  created_at: string
}

export async function listPendingTeachers(): Promise<TeacherApplication[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, username, specialty, qualification, years_experience, cv_text, created_at')
    .eq('role', 'teacher')
    .eq('status', 'pending')
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function listAllTeachers(): Promise<TeacherRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, username, specialty, qualification, years_experience, status, created_at')
    .eq('role', 'teacher')
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function approveTeacher(id: string) {
  const { error } = await supabase.from('profiles').update({ status: 'active' }).eq('id', id)
  if (error) throw error
}

export async function rejectTeacher(id: string) {
  const { error } = await supabase.from('profiles').update({ status: 'rejected' }).eq('id', id)
  if (error) throw error
}
