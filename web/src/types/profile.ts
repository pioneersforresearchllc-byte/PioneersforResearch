export type UserRole = 'student' | 'teacher' | 'owner'
export type UserStatus = 'active' | 'pending' | 'rejected'

export interface Profile {
  id: string
  role: UserRole
  status: UserStatus
  name: string
  username: string
  avatar_url: string | null
  bio: string | null
  profile_public: boolean
  specialty: string | null
  qualification: string | null
  years_experience: number | null
  cv_text: string | null
  cv_file_url: string | null
  is_temp_admin: boolean
  created_at: string
}
