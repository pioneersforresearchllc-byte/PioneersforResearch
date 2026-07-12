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
