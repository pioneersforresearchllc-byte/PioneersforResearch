import { supabase } from '@/lib/supabase'

export interface Assignment {
  id: string
  course_id: string
  title: string
  due_date: string
  details: string | null
  file_url: string | null
  target_all: boolean
  created_by: string
  created_at: string
}

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  answer_text: string | null
  file_url: string | null
  status: 'pending' | 'submitted' | 'graded'
  grade: number | null
  feedback: string | null
  submitted_at: string | null
  graded_at: string | null
}

export async function uploadAssignmentFile(courseId: string, file: File): Promise<string> {
  const path = `${courseId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('assignment-files').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('assignment-files').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadSubmissionFile(studentId: string, file: File): Promise<string> {
  const path = `${studentId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('submission-files').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('submission-files').getPublicUrl(path)
  return data.publicUrl
}

export async function createAssignment(params: {
  courseId: string
  teacherId: string
  title: string
  dueDate: string
  details: string | null
  fileUrl: string | null
  targetAll: boolean
  targetStudentIds: string[]
}) {
  const { data, error } = await supabase
    .from('assignments')
    .insert({
      course_id: params.courseId,
      title: params.title,
      due_date: params.dueDate,
      details: params.details,
      file_url: params.fileUrl,
      target_all: params.targetAll,
      created_by: params.teacherId,
    })
    .select('id')
    .single()
  if (error) throw error

  if (!params.targetAll && params.targetStudentIds.length > 0) {
    const { error: tErr } = await supabase
      .from('assignment_targets')
      .insert(params.targetStudentIds.map((student_id) => ({ assignment_id: data.id, student_id })))
    if (tErr) throw tErr
  }
  return data.id
}

export async function deleteAssignment(id: string) {
  const { error } = await supabase.from('assignments').delete().eq('id', id)
  if (error) throw error
}

export interface AssignmentWithCounts extends Assignment {
  submittedCount: number
  gradedCount: number
  targetCount: number
}

export async function listAssignmentsForCourse(courseId: string): Promise<AssignmentWithCounts[]> {
  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('course_id', courseId)
    .order('due_date')
  if (error) throw error
  if (!assignments?.length) return []

  const ids = assignments.map((a) => a.id)
  const [{ data: submissions }, { data: targets }] = await Promise.all([
    supabase.from('submissions').select('assignment_id, status').in('assignment_id', ids),
    supabase.from('assignment_targets').select('assignment_id').in('assignment_id', ids),
  ])

  return assignments.map((a) => ({
    ...a,
    submittedCount: (submissions ?? []).filter((s) => s.assignment_id === a.id && s.status !== 'pending').length,
    gradedCount: (submissions ?? []).filter((s) => s.assignment_id === a.id && s.status === 'graded').length,
    targetCount: (targets ?? []).filter((t) => t.assignment_id === a.id).length,
  }))
}

export interface AssignmentForReview extends AssignmentWithCounts {
  courseTitle: string
}

export async function listAssignmentsForTeacher(teacherId: string): Promise<AssignmentForReview[]> {
  const { data: links } = await supabase.from('course_teachers').select('course_id').eq('teacher_id', teacherId)
  const courseIds = (links ?? []).map((l) => l.course_id)
  if (courseIds.length === 0) return []

  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('*, course:courses(title)')
    .in('course_id', courseIds)
    .order('due_date')
  if (error) throw error
  if (!assignments?.length) return []

  const ids = assignments.map((a) => a.id)
  const [{ data: submissions }, { data: targets }] = await Promise.all([
    supabase.from('submissions').select('assignment_id, status').in('assignment_id', ids),
    supabase.from('assignment_targets').select('assignment_id').in('assignment_id', ids),
  ])

  return assignments.map((a) => ({
    ...a,
    courseTitle: (a.course as unknown as { title: string } | null)?.title ?? '',
    submittedCount: (submissions ?? []).filter((s) => s.assignment_id === a.id && s.status !== 'pending').length,
    gradedCount: (submissions ?? []).filter((s) => s.assignment_id === a.id && s.status === 'graded').length,
    targetCount: (targets ?? []).filter((t) => t.assignment_id === a.id).length,
  }))
}

export interface SubmissionWithStudent extends Submission {
  studentName: string
  studentUsername: string
}

export async function listSubmissionsForAssignment(assignmentId: string): Promise<SubmissionWithStudent[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*, student:profiles(name, username)')
    .eq('assignment_id', assignmentId)
  if (error) throw error
  return (data ?? []).map((s) => ({
    ...s,
    studentName: (s.student as unknown as { name: string } | null)?.name ?? '',
    studentUsername: (s.student as unknown as { username: string } | null)?.username ?? '',
  }))
}

export async function gradeSubmission(submissionId: string, grade: number, feedback: string | null) {
  const { error } = await supabase
    .from('submissions')
    .update({ grade, feedback, status: 'graded', graded_at: new Date().toISOString() })
    .eq('id', submissionId)
  if (error) throw error
}

export interface MyAssignment extends Assignment {
  courseTitle: string
  submission: Submission | null
}

export async function listMyAssignments(studentId: string): Promise<MyAssignment[]> {
  const { data: enrollments } = await supabase.from('enrollments').select('course_id').eq('student_id', studentId)
  const courseIds = (enrollments ?? []).map((e) => e.course_id)
  if (courseIds.length === 0) return []

  const { data: targeted } = await supabase
    .from('assignment_targets')
    .select('assignment_id')
    .eq('student_id', studentId)
  const targetedIds = new Set((targeted ?? []).map((t) => t.assignment_id))

  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('*, course:courses(title)')
    .in('course_id', courseIds)
  if (error) throw error

  const visible = (assignments ?? []).filter((a) => a.target_all || targetedIds.has(a.id))
  if (visible.length === 0) return []

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .eq('student_id', studentId)
    .in(
      'assignment_id',
      visible.map((a) => a.id),
    )
  const submissionByAssignment = new Map((submissions ?? []).map((s) => [s.assignment_id, s]))

  return visible
    .map((a) => ({
      ...a,
      courseTitle: (a.course as unknown as { title: string } | null)?.title ?? '',
      submission: submissionByAssignment.get(a.id) ?? null,
    }))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
}

export async function submitAnswer(params: {
  assignmentId: string
  studentId: string
  answerText: string | null
  fileUrl: string | null
}) {
  const { error } = await supabase.from('submissions').upsert(
    {
      assignment_id: params.assignmentId,
      student_id: params.studentId,
      answer_text: params.answerText,
      file_url: params.fileUrl,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'assignment_id,student_id' },
  )
  if (error) throw error
}
