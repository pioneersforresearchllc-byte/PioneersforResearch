import { supabase } from '@/lib/supabase'
import { translateTexts } from '@/lib/translate'

export type CourseKind = 'course' | 'program'

export interface Course {
  id: string
  title: string
  description: string
  title_en: string | null
  description_en: string | null
  duration_label: string
  price_cents: number
  original_price_cents: number | null
  image_url: string | null
  completed: boolean
  capacity: number | null
  kind: CourseKind
  code_only: boolean
  created_at: string
}

// Fire-and-forget — called right after create/update so English content
// appears within a few seconds without blocking the save.
async function translateCourse(id: string, title: string, description: string) {
  const translations = await translateTexts([title, description])
  if (!translations) return
  await supabase.from('courses').update({ title_en: translations[0], description_en: translations[1] }).eq('id', id)
}

export interface CourseSession {
  id: string
  course_id: string
  title: string
  session_date: string
  session_time: string
  link: string | null
}

export interface CourseWithMeta extends Course {
  teacherIds: string[]
  sessions: CourseSession[]
  enrolledCount: number
}

export interface TeacherOption {
  id: string
  name: string
  username: string
}

export async function listActiveTeachers(): Promise<TeacherOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, username')
    .eq('role', 'teacher')
    .eq('status', 'active')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function listCoursesWithMeta(): Promise<CourseWithMeta[]> {
  const { data: courses, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false })
  if (error) throw error
  if (!courses?.length) return []

  const ids = courses.map((c) => c.id)
  const [{ data: teacherLinks }, { data: sessions }, { data: enrollments }] = await Promise.all([
    supabase.from('course_teachers').select('course_id, teacher_id').in('course_id', ids),
    supabase.from('course_sessions').select('*').in('course_id', ids).order('session_date'),
    supabase.from('enrollments').select('course_id').in('course_id', ids),
  ])

  return courses.map((c) => ({
    ...c,
    teacherIds: (teacherLinks ?? []).filter((t) => t.course_id === c.id).map((t) => t.teacher_id),
    sessions: (sessions ?? []).filter((s) => s.course_id === c.id) as CourseSession[],
    enrolledCount: (enrollments ?? []).filter((e) => e.course_id === c.id).length,
  }))
}

export interface CourseFormValues {
  title: string
  description: string
  duration_label: string
  price_cents: number
  original_price_cents: number | null
  image_url: string | null
  completed: boolean
  capacity: number | null
  kind: CourseKind
  code_only: boolean
}

// Free courses (price_cents = 0) skip payment entirely — RLS
// (enrollments_insert_free) re-checks price and remaining capacity
// server-side, so this can't be used to bypass payment on a paid course.
export async function enrollFree(courseId: string, studentId: string) {
  const { error } = await supabase.from('enrollments').insert({ course_id: courseId, student_id: studentId })
  if (error) throw error
}

export async function createCourse(values: CourseFormValues, teacherIds: string[]): Promise<string> {
  const { data, error } = await supabase.from('courses').insert(values).select('id').single()
  if (error) throw error
  if (teacherIds.length > 0) {
    const { error: tErr } = await supabase
      .from('course_teachers')
      .insert(teacherIds.map((teacher_id) => ({ course_id: data.id, teacher_id })))
    if (tErr) throw tErr
  }
  void translateCourse(data.id, values.title, values.description)
  return data.id
}

export async function updateCourse(id: string, values: CourseFormValues, teacherIds: string[]) {
  const { error } = await supabase.from('courses').update(values).eq('id', id)
  if (error) throw error
  void translateCourse(id, values.title, values.description)

  const { data: existing } = await supabase.from('course_teachers').select('teacher_id').eq('course_id', id)
  const existingIds = new Set((existing ?? []).map((t) => t.teacher_id))
  const nextIds = new Set(teacherIds)

  const toAdd = teacherIds.filter((tid) => !existingIds.has(tid))
  const toRemove = [...existingIds].filter((tid) => !nextIds.has(tid))

  if (toAdd.length > 0) {
    await supabase.from('course_teachers').insert(toAdd.map((teacher_id) => ({ course_id: id, teacher_id })))
  }
  if (toRemove.length > 0) {
    await supabase.from('course_teachers').delete().eq('course_id', id).in('teacher_id', toRemove)
  }
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw error
}

// ── Private-course access codes ────────────────────────────────────────────
/** Owner: the current access code for a course ('' if none). */
export async function getCourseAccessCode(courseId: string): Promise<string> {
  const { data } = await supabase.from('course_access_codes').select('code').eq('course_id', courseId).maybeSingle()
  return data?.code ?? ''
}

/** Owner: set (or clear, when empty) a course's private access code. */
export async function setCourseAccessCode(courseId: string, code: string) {
  const trimmed = code.trim()
  if (!trimmed) {
    const { error } = await supabase.from('course_access_codes').delete().eq('course_id', courseId)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('course_access_codes')
    .upsert({ course_id: courseId, code: trimmed }, { onConflict: 'course_id' })
  if (error) throw error
}

// ── Rich HTML course content (course_contents table) ───────────────────────
/** The course's custom HTML content, or null. RLS lets only enrolled
 * students / the course's teachers / the owner read it. Returns null (never
 * throws) so a missing table pre-migration can't break the page. */
export async function getCourseContent(courseId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('course_contents')
      .select('content_html')
      .eq('course_id', courseId)
      .maybeSingle()
    if (error) return null
    return (data?.content_html as string | null) ?? null
  } catch {
    return null
  }
}

/** Owner: set (or clear, when empty) a course's custom HTML content. */
export async function setCourseContent(courseId: string, html: string) {
  const trimmed = html.trim()
  if (!trimmed) {
    const { error } = await supabase.from('course_contents').delete().eq('course_id', courseId)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('course_contents')
    .upsert({ course_id: courseId, content_html: trimmed, updated_at: new Date().toISOString() }, { onConflict: 'course_id' })
  if (error) throw error
}

/** Student: redeem a course access code to enrol for free. */
export async function redeemCourseCode(courseId: string, code: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('redeem-course-code', { body: { courseId, code: code.trim() } })
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
  const result = data as { enrolled?: boolean; error?: string }
  if (result.error || !result.enrolled) throw new Error(result.error || 'redeem failed')
}

export async function uploadCourseImage(file: File): Promise<string> {
  const path = `${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('course-images').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('course-images').getPublicUrl(path)
  return data.publicUrl
}

export async function addSession(courseId: string, values: Omit<CourseSession, 'id' | 'course_id'>) {
  const { error } = await supabase.from('course_sessions').insert({ course_id: courseId, ...values })
  if (error) throw error
}

export async function updateSession(id: string, values: Omit<CourseSession, 'id' | 'course_id'>) {
  const { error } = await supabase.from('course_sessions').update(values).eq('id', id)
  if (error) throw error
}

export async function deleteSession(id: string) {
  const { error } = await supabase.from('course_sessions').delete().eq('id', id)
  if (error) throw error
}

export interface EnrolledCourse extends Course {
  progress: number
  status: 'active' | 'completed'
  teacherNames: string[]
}

export async function listMyEnrolledCourses(studentId: string): Promise<EnrolledCourse[]> {
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('progress, status, course:courses(*)')
    .eq('student_id', studentId)
  if (error) throw error
  const rows = (enrollments ?? []).filter((e) => e.course) as unknown as {
    progress: number
    status: 'active' | 'completed'
    course: Course
  }[]
  if (rows.length === 0) return []

  const courseIds = rows.map((r) => r.course.id)
  const { data: teacherLinks } = await supabase
    .from('course_teachers')
    .select('course_id, teacher:profiles(name)')
    .in('course_id', courseIds)

  // Progress is computed live from assignments (submitted or graded ÷ the
  // assignments actually visible to this student per course) — the stored
  // enrollments.progress column is never written, so we ignore it.
  const progressByCourse = await computeAssignmentProgress(studentId, courseIds)

  return rows.map((r) => ({
    ...r.course,
    progress: progressByCourse.get(r.course.id) ?? 0,
    status: r.status,
    teacherNames: (teacherLinks ?? [])
      .filter((t) => t.course_id === r.course.id)
      .map((t) => (t.teacher as unknown as { name: string } | null)?.name ?? '')
      .filter(Boolean),
  }))
}

/**
 * Course progress driven by the teacher's grades: every graded assignment
 * contributes up to 10 percentage points, scaled by its grade — so one
 * assignment scored 100/100 = 10% progress, and ten full-mark assignments
 * fill the bar. Ungraded or unsubmitted work contributes nothing. Capped at
 * 100%. A course with no graded work yet reports 0.
 */
const POINTS_PER_ASSIGNMENT = 10

async function computeAssignmentProgress(
  studentId: string,
  courseIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (courseIds.length === 0) return result

  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, course_id')
    .in('course_id', courseIds)
  const all = (assignments ?? []) as { id: string; course_id: string }[]
  const assignmentIds = all.map((a) => a.id)
  const courseByAssignment = new Map(all.map((a) => [a.id, a.course_id]))

  const gradeByCourse = new Map<string, number>()
  if (assignmentIds.length > 0) {
    const { data: submissions } = await supabase
      .from('submissions')
      .select('assignment_id, status, grade')
      .eq('student_id', studentId)
      .eq('status', 'graded')
      .in('assignment_id', assignmentIds)
    for (const s of submissions ?? []) {
      if (s.grade == null) continue
      const courseId = courseByAssignment.get(s.assignment_id)
      if (!courseId) continue
      // grade is 0–100 → grade/100 * 10 points.
      const points = (Math.max(0, Math.min(100, s.grade)) / 100) * POINTS_PER_ASSIGNMENT
      gradeByCourse.set(courseId, (gradeByCourse.get(courseId) ?? 0) + points)
    }
  }

  for (const courseId of courseIds) {
    result.set(courseId, Math.min(100, Math.round(gradeByCourse.get(courseId) ?? 0)))
  }
  return result
}

export async function getEnrolledCourseDetail(
  courseId: string,
  studentId: string,
): Promise<{ course: Course; sessions: CourseSession[]; teacherNames: string[] } | null> {
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (!enrollment) return null

  const [{ data: course }, { data: sessions }, { data: teacherLinks }] = await Promise.all([
    supabase.from('courses').select('*').eq('id', courseId).single(),
    supabase.from('course_sessions').select('*').eq('course_id', courseId).order('session_date'),
    supabase.from('course_teachers').select('teacher:profiles(name)').eq('course_id', courseId),
  ])
  if (!course) return null

  return {
    course,
    sessions: sessions ?? [],
    teacherNames: (teacherLinks ?? [])
      .map((t) => (t.teacher as unknown as { name: string } | null)?.name ?? '')
      .filter(Boolean),
  }
}

export interface TaughtCourse extends Course {
  enrolledCount: number
  sessionCount: number
}

export async function listMyTaughtCourses(teacherId: string): Promise<TaughtCourse[]> {
  const { data: links, error } = await supabase
    .from('course_teachers')
    .select('course:courses(*)')
    .eq('teacher_id', teacherId)
  if (error) throw error
  const courses = (links ?? []).map((l) => l.course).filter(Boolean) as unknown as Course[]
  if (courses.length === 0) return []

  const ids = courses.map((c) => c.id)
  const [{ data: enrollments }, { data: sessions }] = await Promise.all([
    supabase.from('enrollments').select('course_id').in('course_id', ids),
    supabase.from('course_sessions').select('course_id').in('course_id', ids),
  ])

  return courses.map((c) => ({
    ...c,
    enrolledCount: (enrollments ?? []).filter((e) => e.course_id === c.id).length,
    sessionCount: (sessions ?? []).filter((s) => s.course_id === c.id).length,
  }))
}

export interface StudentWithCourses {
  id: string
  name: string
  username: string
  courseTitles: string[]
}

export async function listMyStudents(teacherId: string): Promise<StudentWithCourses[]> {
  const { data: links } = await supabase.from('course_teachers').select('course_id').eq('teacher_id', teacherId)
  const courseIds = (links ?? []).map((l) => l.course_id)
  if (courseIds.length === 0) return []

  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('student:profiles(id, name, username), course:courses(title)')
    .in('course_id', courseIds)
  if (error) throw error

  const byStudent = new Map<string, StudentWithCourses>()
  for (const e of enrollments ?? []) {
    const student = e.student as unknown as { id: string; name: string; username: string } | null
    const course = e.course as unknown as { title: string } | null
    if (!student) continue
    const existing = byStudent.get(student.id)
    if (existing) {
      if (course) existing.courseTitles.push(course.title)
    } else {
      byStudent.set(student.id, { ...student, courseTitles: course ? [course.title] : [] })
    }
  }
  return [...byStudent.values()]
}

export interface EnrolledStudent {
  id: string
  name: string
  username: string
  progress: number
}

export async function getTaughtCourseDetail(
  courseId: string,
  teacherId: string,
): Promise<{ course: Course; sessions: CourseSession[]; students: EnrolledStudent[] } | null> {
  const { data: link } = await supabase
    .from('course_teachers')
    .select('course_id')
    .eq('course_id', courseId)
    .eq('teacher_id', teacherId)
    .maybeSingle()
  if (!link) return null

  const [{ data: course }, { data: sessions }, { data: enrollments }] = await Promise.all([
    supabase.from('courses').select('*').eq('id', courseId).single(),
    supabase.from('course_sessions').select('*').eq('course_id', courseId).order('session_date'),
    supabase.from('enrollments').select('progress, student:profiles(id, name, username)').eq('course_id', courseId),
  ])
  if (!course) return null

  return {
    course,
    sessions: sessions ?? [],
    students: (enrollments ?? [])
      .map((e) => {
        const s = e.student as unknown as { id: string; name: string; username: string } | null
        return s ? { id: s.id, name: s.name, username: s.username, progress: e.progress } : null
      })
      .filter((s): s is EnrolledStudent => s !== null),
  }
}
