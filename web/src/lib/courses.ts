import { supabase } from '@/lib/supabase'

export interface Course {
  id: string
  title: string
  description: string
  duration_label: string
  price_cents: number
  original_price_cents: number | null
  image_url: string | null
  completed: boolean
  created_at: string
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
  return data.id
}

export async function updateCourse(id: string, values: CourseFormValues, teacherIds: string[]) {
  const { error } = await supabase.from('courses').update(values).eq('id', id)
  if (error) throw error

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

  return rows.map((r) => ({
    ...r.course,
    progress: r.progress,
    status: r.status,
    teacherNames: (teacherLinks ?? [])
      .filter((t) => t.course_id === r.course.id)
      .map((t) => (t.teacher as unknown as { name: string } | null)?.name ?? '')
      .filter(Boolean),
  }))
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
