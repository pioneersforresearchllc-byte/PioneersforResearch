import { supabase } from '@/lib/supabase'

export interface TeacherApplication {
  id: string
  name: string
  username: string
  specialty: string | null
  qualification: string | null
  years_experience: number | null
  cv_text: string | null
  cv_file_url: string | null
  created_at: string
}

// teacher-cv-documents is a private bucket — cv_file_url on the row is just
// the storage path, resolved to a short-lived signed URL on demand.
export async function signCvFile(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('teacher-cv-documents').createSignedUrl(path, 60 * 10)
  return data?.signedUrl ?? null
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
    .select('id, name, username, specialty, qualification, years_experience, cv_text, cv_file_url, created_at')
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

// Revokes an already-active teacher's access and unassigns them from every
// course they were teaching (a dismissed teacher shouldn't keep showing up
// on students' course pages).
export async function dismissTeacher(id: string) {
  const { error: statusErr } = await supabase.from('profiles').update({ status: 'rejected' }).eq('id', id)
  if (statusErr) throw statusErr
  const { error: unassignErr } = await supabase.from('course_teachers').delete().eq('teacher_id', id)
  if (unassignErr) throw unassignErr
}
