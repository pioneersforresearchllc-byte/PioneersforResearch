import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { fetchProfile } from '@/lib/profile'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'
import { GoogleButton } from '@/components/GoogleButton'
import { useLanguage } from '@/lib/i18n'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const passwordResetDone = !!(location.state as { passwordResetDone?: boolean } | null)?.passwordResetDone

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password) {
      setError(t('login.fillFields'))
      return
    }
    setBusy(true)
    try {
      const { data: email, error: resolveErr } = await supabase.rpc('resolve_login_identifier', {
        identifier: identifier.trim(),
      })
      if (resolveErr || !email) {
        setError(t('login.noAccount'))
        return
      }

      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInErr || !data.user) {
        setError(t('login.wrongCreds'))
        return
      }

      const profile = await fetchProfile(data.user.id)
      if (!profile) {
        setError(t('login.profileLoadFail'))
        await supabase.auth.signOut()
        return
      }

      if (profile.role === 'owner') {
        await supabase.auth.signOut()
        setError(t('login.useAdminPortal'))
        return
      }

      if (profile.role === 'teacher' && profile.status === 'pending') {
        navigate('/teacher-pending')
        return
      }
      if (profile.role === 'teacher' && profile.status === 'rejected') {
        await supabase.auth.signOut()
        setError(t('login.teacherRejected'))
        return
      }

      void supabase.from('login_events').insert({ user_id: data.user.id })
      navigate(profile.role === 'student' ? '/student' : '/teacher')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard>
      <div className="mb-7 text-center">
        <div className="font-heading text-xl font-bold text-navy">Pioneers Health Research</div>
        <div className="mt-1.5 text-sm text-muted">{t('login.title')}</div>
      </div>

      {passwordResetDone && (
        <div className="mb-5 rounded-md border border-success/30 bg-success/10 px-4 py-2.5 text-center text-[13.5px] text-success">
          {t('login.passwordResetDone')}
        </div>
      )}

      <div className="mb-4">
        <GoogleButton />
      </div>
      <div className="mb-4 flex items-center gap-3 text-[12px] text-faint">
        <div className="h-px flex-1 bg-border" />
        {t('auth.or')}
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="mb-5 flex rounded-lg bg-[#f0f3f7] p-1">
        <button
          type="button"
          onClick={() => setRole('student')}
          className={`flex-1 rounded-md border-none py-2.25 text-[13.5px] font-semibold ${
            role === 'student' ? 'bg-navy text-white' : 'bg-transparent text-navy'
          }`}
        >
          {t('login.student')}
        </button>
        <button
          type="button"
          onClick={() => setRole('teacher')}
          className={`flex-1 rounded-md border-none py-2.25 text-[13.5px] font-semibold ${
            role === 'teacher' ? 'bg-navy text-white' : 'bg-transparent text-navy'
          }`}
        >
          {t('login.teacher')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <input
          type="text"
          placeholder={t('login.identifierPh')}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          placeholder={t('login.passwordPh')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <div className="-mt-1.5 text-left rtl:text-right">
          <Link to="/forgot-password" className="text-[13px] text-muted no-underline hover:text-navy">
            {t('login.forgotPassword')}
          </Link>
        </div>
        <FieldError>{error}</FieldError>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-navy py-3.25 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
        >
          {busy ? '...' : t('login.submit')}
        </button>
      </form>

      {role === 'teacher' && (
        <div className="mt-4 text-center text-[13.5px]">
          {t('login.notTeacherYet')}{' '}
          <Link to="/teacher-apply" className="font-semibold text-navy no-underline">
            {t('login.applyAsTeacher')}
          </Link>
        </div>
      )}

      <div className="mt-4 text-center text-[13.5px] text-muted">
        {t('login.noAccountYet')}{' '}
        <Link to="/register" className="font-semibold text-navy no-underline">
          {t('login.createAccount')}
        </Link>
      </div>
      <div className="mt-2.5 text-center">
        <Link to="/" className="text-[13px] text-muted no-underline">
          {t('login.backHome')}
        </Link>
      </div>
    </AuthCard>
  )
}
