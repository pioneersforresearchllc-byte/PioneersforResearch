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

export async function updateProfileDetails(
  userId: string,
  fields: {
    name?: string
    bio?: string | null
    profile_public?: boolean
    specialty?: string | null
    qualification?: string | null
    years_experience?: number | null
    certifications?: string | null
  },
) {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId)
  if (error) throw error
}

export interface PublicProfile {
  id: string
  name: string
  username: string
  role: string
  avatar_url: string | null
  bio: string | null
  profile_public: boolean
  specialty: string | null
  qualification: string | null
  years_experience: number | null
  certifications: string | null
  certificates: { id: string; course_title: string; image_url: string | null }[]
}

// Loads the profile card a viewer sees when they tap someone's avatar. Only
// returns the rich card when that user allows it (profile_public); otherwise
// returns just the basic identity so the caller can show a "private" state.
export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data: p, error } = await supabase
    .from('profiles')
    .select('id, name, username, role, avatar_url, bio, profile_public, specialty, qualification, years_experience, certifications')
    .eq('id', userId)
    .maybeSingle()
  if (error || !p) return null

  let certificates: PublicProfile['certificates'] = []
  if (p.profile_public) {
    const { data: certs } = await supabase
      .from('certificate_issuances')
      .select('id, image_url, course:courses(title)')
      .eq('student_id', userId)
      .order('issued_at', { ascending: false })
    certificates = (certs ?? []).map((c) => ({
      id: c.id,
      image_url: c.image_url,
      course_title: (c.course as unknown as { title: string } | null)?.title ?? '',
    }))
  }

  return { ...(p as Omit<PublicProfile, 'certificates'>), certificates }
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
