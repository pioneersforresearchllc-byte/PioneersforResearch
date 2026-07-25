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

const ASSIGNMENT_BUCKET = 'assignment-files'
const SUBMISSION_BUCKET = 'submission-files'

// Supabase Storage rejects object keys with non-ASCII characters or spaces, so
// the stored key is a UUID plus a sanitised extension — never the human name.
function safeExt(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const ext = dot > -1 ? fileName.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : ''
  return ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID()
}

/**
 * Both buckets are PRIVATE, so we store only the object path and hand out a
 * short-lived signed URL on demand (see signAssignmentFile / signSubmissionFile).
 * A public URL for a private bucket 404s with "Bucket not found".
 */
export async function uploadAssignmentFile(courseId: string, file: File): Promise<string> {
  const path = `${courseId}/${safeExt(file.name)}`
  const { error } = await supabase.storage.from(ASSIGNMENT_BUCKET).upload(path, file)
  if (error) throw error
  return path
}

export async function uploadSubmissionFile(studentId: string, file: File): Promise<string> {
  const path = `${studentId}/${safeExt(file.name)}`
  const { error } = await supabase.storage.from(SUBMISSION_BUCKET).upload(path, file)
  if (error) throw error
  return path
}

/**
 * Accepts either a bare object path (new records) or a full Supabase Storage
 * URL (older records saved before we switched to signed URLs) and returns the
 * object path relative to the bucket.
 */
function toObjectPath(bucket: string, stored: string): string {
  const marker = '/storage/v1/object/'
  const idx = stored.indexOf(marker)
  if (idx === -1) return stored
  let rest = stored.slice(idx + marker.length).replace(/^public\//, '').replace(/^sign\//, '')
  if (rest.startsWith(`${bucket}/`)) rest = rest.slice(bucket.length + 1)
  const q = rest.indexOf('?')
  if (q > -1) rest = rest.slice(0, q)
  return decodeURIComponent(rest)
}

/** Short-lived signed URL to open a teacher-authored assignment file. */
export async function signAssignmentFile(stored: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from(ASSIGNMENT_BUCKET)
    .createSignedUrl(toObjectPath(ASSIGNMENT_BUCKET, stored), 600)
  return data?.signedUrl ?? null
}

/** Short-lived signed URL to open a student's submission file. */
export async function signSubmissionFile(stored: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from(SUBMISSION_BUCKET)
    .createSignedUrl(toObjectPath(SUBMISSION_BUCKET, stored), 600)
  return data?.signedUrl ?? null
}

// ── Submission thread (teacher ↔ student back-and-forth with files) ─────────
export interface SubmissionMessage {
  id: string
  submission_id: string
  sender_id: string
  body: string | null
  file_url: string | null
  file_name: string | null
  created_at: string
  senderName: string
}

export async function listSubmissionMessages(submissionId: string): Promise<SubmissionMessage[]> {
  const { data, error } = await supabase
    .from('submission_messages')
    .select('*, sender:profiles(name)')
    .eq('submission_id', submissionId)
    .order('created_at')
  if (error) throw error
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>
    return {
      ...(row as unknown as SubmissionMessage),
      senderName: (row.sender as { name: string } | null)?.name ?? '',
    }
  })
}

/** Attachments go under thread/<submission>/… so both parties can read them. */
async function uploadThreadFile(submissionId: string, file: File): Promise<string> {
  const path = `thread/${submissionId}/${safeExt(file.name)}`
  const { error } = await supabase.storage.from(SUBMISSION_BUCKET).upload(path, file)
  if (error) throw error
  return path
}

export async function sendSubmissionMessage(params: {
  submissionId: string
  senderId: string
  body: string | null
  file: File | null
}) {
  let fileUrl: string | null = null
  let fileName: string | null = null
  if (params.file) {
    fileUrl = await uploadThreadFile(params.submissionId, params.file)
    fileName = params.file.name
  }
  const { error } = await supabase.from('submission_messages').insert({
    submission_id: params.submissionId,
    sender_id: params.senderId,
    body: params.body,
    file_url: fileUrl,
    file_name: fileName,
  })
  if (error) throw error
}

export async function markSubmissionThreadSeen(submissionId: string) {
  await supabase.rpc('mark_submission_thread_seen', { p_submission: submissionId })
}

export async function countMyStudentUnseen(): Promise<number> {
  const { data } = await supabase.rpc('my_student_unseen_submissions')
  return Number(data ?? 0)
}

export async function countMyTeacherUnseen(): Promise<number> {
  const { data } = await supabase.rpc('my_teacher_unseen_submissions')
  return Number(data ?? 0)
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
