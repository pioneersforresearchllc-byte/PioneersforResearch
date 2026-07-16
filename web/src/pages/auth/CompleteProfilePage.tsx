import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'
import { useLanguage } from '@/lib/i18n'

/**
 * One-time step for a brand-new OAuth (Google) user who has a session but no
 * profile yet. Google gives us their email and name but not a username or
 * role, so we collect a username here and create a student profile. Teachers
 * still go through the application form (we need their CV/credentials).
 */
export function CompleteProfilePage() {
  const navigate = useNavigate()
  const { session, profile, loading, refreshProfile } = useAuth()
  const { t } = useLanguage()

  const googleName =
    (session?.user.user_metadata?.full_name as string | undefined) ||
    (session?.user.user_metadata?.name as string | undefined) ||
    ''

  const [name, setName] = useState(googleName)
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  if (profile) return <Navigate to={profile.role === 'teacher' ? '/teacher' : profile.role === 'owner' ? '/owner' : '/student'} replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !username.trim()) {
      setError(t('completeProfile.fillFields'))
      return
    }
    setBusy(true)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-profile', {
        body: { user_id: session.user.id, role: 'student', name: name.trim(), username: username.trim() },
      })
      const result = data as { error?: string } | null
      if (fnErr || result?.error) {
        setError(result?.error === 'profile already exists' ? t('completeProfile.usernameTaken') : t('completeProfile.genericError'))
        return
      }
      await refreshProfile()
      navigate('/student', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard>
      <div className="mb-7 text-center">
        <div className="font-heading text-xl font-bold text-navy">{t('completeProfile.title')}</div>
        <div className="mt-1.5 text-sm text-muted">{t('completeProfile.subtitle')}</div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <input
          type="text"
          placeholder={t('completeProfile.namePh')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder={t('completeProfile.usernamePh')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass}
        />
        <FieldError>{error}</FieldError>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-navy py-3.25 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
        >
          {busy ? '...' : t('completeProfile.submit')}
        </button>
      </form>

      <div className="mt-4 text-center text-[12.5px] text-muted">{t('completeProfile.teacherNote')}</div>
    </AuthCard>
  )
}
