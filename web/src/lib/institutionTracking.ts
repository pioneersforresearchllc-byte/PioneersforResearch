import { supabase } from '@/lib/supabase'

/**
 * Institution trainee tracking (migration 0071). The owner links courses to an
 * institution; the institution's accounts then see aggregated progress of the
 * trainees enrolled in those courses through two SECURITY DEFINER RPCs.
 * Every reader tolerates the migration not being applied yet (returns empty).
 */

export interface InstitutionCourseOverview {
  course_id: string
  title: string
  title_en: string | null
  trainees: number
  avg_progress: number
  certificates: number
  sessions_total: number
  sessions_held: number
}

export interface TraineeRow {
  student_id: string
  name: string
  username: string
  enrolled_at: string
  status: 'active' | 'completed'
  progress: number
  assignments_total: number
  submitted: number
  graded: number
  avg_grade: number | null
  sessions_held: number
  attended: number
  cert_number: string | null
  cert_issued_at: string | null
}

/** Linked courses with headline numbers. Owner may pass an institution id. */
export async function listInstitutionCourses(institutionId?: string): Promise<InstitutionCourseOverview[]> {
  const { data, error } = await supabase.rpc('institution_courses_overview', institutionId ? { p_institution_id: institutionId } : {})
  if (error) return []
  return (data as InstitutionCourseOverview[]) ?? []
}

export async function getTraineeReport(courseId: string): Promise<TraineeRow[]> {
  const { data, error } = await supabase.rpc('institution_trainee_report', { p_course_id: courseId })
  if (error) throw error
  return (data as TraineeRow[]) ?? []
}

// ── Owner: link / unlink courses ─────────────────────────────────────────
export async function listLinkedCourseIds(institutionId: string): Promise<string[]> {
  const { data, error } = await supabase.from('institution_courses').select('course_id').eq('institution_id', institutionId)
  if (error) return []
  return (data ?? []).map((r) => r.course_id as string)
}

export async function linkCourse(institutionId: string, courseId: string) {
  const { error } = await supabase.from('institution_courses').insert({ institution_id: institutionId, course_id: courseId })
  if (error) throw error
}

export async function unlinkCourse(institutionId: string, courseId: string) {
  const { error } = await supabase.from('institution_courses').delete().eq('institution_id', institutionId).eq('course_id', courseId)
  if (error) throw error
}

// ── Attendance (owner or course teacher) ─────────────────────────────────
export interface SessionLite {
  id: string
  title: string
  session_date: string
  session_time: string
}

export async function listCourseSessions(courseId: string): Promise<SessionLite[]> {
  const { data, error } = await supabase
    .from('course_sessions')
    .select('id, title, session_date, session_time')
    .eq('course_id', courseId)
    .order('session_date')
  if (error) return []
  return (data as SessionLite[]) ?? []
}

/** Map of "sessionId:studentId" → present, for the given sessions. */
export async function listAttendance(sessionIds: string[]): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>()
  if (sessionIds.length === 0) return map
  const { data, error } = await supabase.from('session_attendance').select('session_id, student_id, present').in('session_id', sessionIds)
  if (error) return map
  for (const r of data ?? []) map.set(`${r.session_id}:${r.student_id}`, r.present as boolean)
  return map
}

/** present=true/false records attendance; null clears the mark. */
export async function setAttendance(sessionId: string, studentId: string, present: boolean | null, markedBy: string) {
  if (present === null) {
    const { error } = await supabase.from('session_attendance').delete().eq('session_id', sessionId).eq('student_id', studentId)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('session_attendance')
    .upsert({ session_id: sessionId, student_id: studentId, present, marked_by: markedBy, marked_at: new Date().toISOString() })
  if (error) throw error
}
