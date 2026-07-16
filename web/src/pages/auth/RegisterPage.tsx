import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { fetchProfile } from '@/lib/profile'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'
import { GoogleButton } from '@/components/GoogleButton'
import { useLanguage } from '@/lib/i18n'

export function RegisterPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [error, setError] = useState('')
  const [showForgotLink, setShowForgotLink] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setShowForgotLink(false)

    if (honeypot) return // silently drop — bot filled the hidden field
    if (!name.trim() || !email.trim() || !username.trim() || !password) {
      setError(t('register.fillFields'))
      return
    }
    if (password.length < 6) {
      setError(t('register.passwordLength'))
      return
    }

    setBusy(true)
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      let userId: string
      let hasSession: boolean

      if (signUpErr || !signUpData.user) {
        if (signUpErr?.message !== 'User already registered') {
          setError(t('register.genericError'))
          return
        }
        // Could be someone who signed up earlier but abandoned the email
        // verification step. signInWithPassword only succeeds if they
        // actually know this account's password, so this can't be used to
        // probe whether a stranger's email is registered.
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInErr || !signInData.user) {
          setError(t('register.emailInUseWrongPassword'))
          setShowForgotLink(true)
          return
        }
        const existingProfile = await fetchProfile(signInData.user.id)
        if (existingProfile) {
          await supabase.auth.signOut()
          setError(t('register.emailInUse'))
          return
        }
        userId = signInData.user.id
        hasSession = true
      } else {
        userId = signUpData.user.id
        hasSession = !!signUpData.session
      }

      if (!hasSession) {
        setError('') // no error — success path with no immediate session
        navigate('/login')
        return
      }

      const profilePayload = { user_id: userId, role: 'student' as const, name: name.trim(), username: username.trim() }

      const { data: otpData, error: otpErr } = await supabase.functions.invoke('send-signup-otp')
      const otpResult = otpData as { error?: string; autoVerified?: boolean; devCode?: string } | null
      if (otpErr || otpResult?.error === 'invalid_email') {
        setError(t('register.invalidEmail'))
        return
      }
      if (otpErr) {
        setError(t('register.completeError'))
        return
      }

      // Our own email quota was exhausted — the server already verified
      // the domain and auto-approved this signup, so skip straight to
      // creating the profile instead of asking for a code we never sent.
      if (otpResult?.autoVerified) {
        const { data: profileData, error: profileErr } = await supabase.functions.invoke('create-profile', {
          body: profilePayload,
        })
        if (profileErr || (profileData as { error?: string } | null)?.error) {
          setError(t('register.completeError'))
          return
        }
        navigate('/student')
        return
      }

      navigate('/register-otp', {
        state: {
          email: email.trim(),
          profilePayload,
          successRoute: '/student',
          devCode: otpResult?.devCode ?? null,
        },
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard>
      <div className="mb-7 text-center">
        <div className="font-heading text-xl font-bold text-navy">Pioneers for Research</div>
        <div className="mt-1.5 text-sm text-muted">{t('register.title')}</div>
      </div>

      <div className="mb-4">
        <GoogleButton />
      </div>
      <div className="mb-4 flex items-center gap-3 text-[12px] text-faint">
        <div className="h-px flex-1 bg-border" />
        {t('auth.or')}
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <input
          type="text"
          placeholder={t('register.namePh')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          type="email"
          placeholder={t('register.emailPh')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder={t('register.usernamePh')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          placeholder={t('register.passwordPh')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="absolute left-[-9999px] h-px w-px opacity-0"
        />
        <FieldError>{error}</FieldError>
        {showForgotLink && (
          <div className="-mt-2 text-[13px]">
            <Link to="/forgot-password" className="font-semibold text-navy no-underline">
              {t('register.forgotPasswordLink')}
            </Link>
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-navy py-3.25 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
        >
          {busy ? '...' : t('register.submit')}
        </button>
      </form>

      <div className="mt-5 text-center text-[13.5px] text-muted">
        {t('register.haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-navy no-underline">
          {t('register.login')}
        </Link>
      </div>
      <div className="mt-2.5 text-center">
        <Link to="/" className="text-[13px] text-muted no-underline">
          {t('register.backHome')}
        </Link>
      </div>
    </AuthCard>
  )
}
