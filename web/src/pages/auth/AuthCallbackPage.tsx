import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { OAUTH_NEXT_KEY } from '@/components/GoogleButton'

const dashboardPathFor = (role: string) =>
  role === 'student'
    ? '/student'
    : role === 'teacher'
      ? '/teacher'
      : role === 'institution'
        ? '/institution'
        : '/owner'

/**
 * Landing route after an OAuth (Google) redirect. Supabase has already set
 * the session by the time we get here; we just decide where to send the
 * user: into their dashboard if they have a profile, to the profile-
 * completion step if they're brand new, or back to login if something went
 * wrong.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { session, profile, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!session) {
      navigate('/login', { replace: true })
      return
    }
    let next: string | null = null
    try {
      next = sessionStorage.getItem(OAUTH_NEXT_KEY)
      sessionStorage.removeItem(OAUTH_NEXT_KEY)
    } catch {
      // storage blocked
    }
    if (profile) {
      navigate(dashboardPathFor(profile.role), { replace: true })
    } else {
      // A new Google user who started from the teacher application goes back
      // to it (allow-listed, never an arbitrary path); everyone else signs up
      // as a student.
      navigate(next === '/teacher-apply' ? '/teacher-apply' : '/complete-profile', { replace: true })
    }
  }, [session, profile, loading, navigate])

  return <div className="flex min-h-screen items-center justify-center text-[14px] text-muted">...</div>
}
