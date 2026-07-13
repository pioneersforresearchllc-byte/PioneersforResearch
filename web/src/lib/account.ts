import { supabase } from '@/lib/supabase'

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const path = `${userId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

export async function updateProfileName(userId: string, name: string) {
  const { error } = await supabase.from('profiles').update({ name }).eq('id', userId)
  if (error) throw error
}

export async function updateAvatarUrl(userId: string, avatarUrl: string) {
  const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId)
  if (error) throw error
}

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export interface GradedItem {
  id: string
  assignmentTitle: string
  courseTitle: string
  grade: number | null
  feedback: string | null
  gradedAt: string | null
}

export async function listMyGrades(studentId: string): Promise<GradedItem[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, grade, feedback, graded_at, assignment:assignments(title, course:courses(title))')
    .eq('student_id', studentId)
    .eq('status', 'graded')
    .order('graded_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((s) => {
    const assignment = s.assignment as unknown as { title: string; course: { title: string } | null } | null
    return {
      id: s.id,
      assignmentTitle: assignment?.title ?? '',
      courseTitle: assignment?.course?.title ?? '',
      grade: s.grade,
      feedback: s.feedback,
      gradedAt: s.graded_at,
    }
  })
}
