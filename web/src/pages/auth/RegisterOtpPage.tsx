import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'
import { useLanguage } from '@/lib/i18n'
import { useAuth } from '@/context/AuthContext'
import { fnErrorBody, isUsernameConflict, isValidUsername } from '@/lib/authHelpers'
import { savePhone } from '@/lib/phone'

interface RegisterOtpState {
  email: string
  profilePayload: Record<string, unknown>
  /** Normalized phone digits from the signup form (saved once the profile exists). */
  phone?: string | null
  successRoute: string
  devCode?: string | null
}

export function RegisterOtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, lang } = useLanguage()
  const { refreshProfile } = useAuth()
  const state = location.state as RegisterOtpState | null

  const [devCode, setDevCode] = useState<string | null>(state?.devCode ?? null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Set once the email code is accepted but create-profile hit a taken username:
  // the code is already consumed, so only the username is asked for again.
  const [emailVerified, setEmailVerified] = useState(false)
  const [newUsername, setNewUsername] = useState<string | null>(null)

  if (!state?.profilePayload) {
    return (
      <AuthCard>
        <div className="text-center text-[14px] text-muted">
          <Link to="/register" className="font-semibold text-navy no-underline">
            {t('registerOtp.backToLogin')}
          </Link>
        </div>
      </AuthCard>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (!emailVerified) {
        const { data, error: fnErr } = await supabase.functions.invoke('verify-signup-otp', {
          body: { code: code.trim() },
        })
        const result = data as { verified?: boolean } | null
        if (fnErr || !result?.verified) {
          // The function's own reasons (expired / too many attempts) are Arabic text.
          const reason = (await fnErrorBody(fnErr))?.error
          setError(lang === 'ar' && typeof reason === 'string' && /[\u0600-\u06FF]/.test(reason) ? reason : t('registerOtp.invalidCode'))
          return
        }
        setEmailVerified(true)
      }

      const payload = { ...state.profilePayload }
      if (newUsername !== null) {
        if (!isValidUsername(newUsername.trim())) {
          setError(t('register.usernameInvalid'))
          return
        }
        payload.username = newUsername.trim()
      }
      const { data: profileData, error: profileErr } = await supabase.functions.invoke('create-profile', {
        body: payload,
      })
      if (profileErr || (profileData as { error?: string } | null)?.error) {
        if (isUsernameConflict(await fnErrorBody(profileErr))) {
          setNewUsername(newUsername ?? '')
          setError(t('registerOtp.usernameTakenPick'))
          return
        }
        setError(t('registerOtp.completeError'))
        return
      }

      // Best effort — the dashboard's phone prompt catches a failure here.
      if (state.phone && typeof payload.user_id === 'string') {
        await savePhone(payload.user_id, state.phone).catch(() => undefined)
      }
      await refreshProfile()
      navigate(state.successRoute)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setError('')
    const { data, error: fnErr } = await supabase.functions.invoke('send-signup-otp')
    if (fnErr) {
      // Non-2xx bodies (429 rate_limited etc.) only arrive on the error object.
      const body = await fnErrorBody(fnErr)
      if (body?.error === 'rate_limited') {
        const minutes = Math.max(1, Math.ceil((Number(body.retryAfterSeconds) || 300) / 60))
        setError(t('registerOtp.rateLimited', { minutes: String(minutes) }))
      } else {
        setError(t('registerOtp.resendError'))
      }
      return
    }
    const result = data as { devCode?: string } | null
    setDevCode(result?.devCode ?? null)
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <div className="font-heading text-xl font-bold text-navy">{t('registerOtp.title')}</div>
        <div className="mt-1.5 text-sm text-muted">{t('registerOtp.subtitle', { email: state.email })}</div>
      </div>

      {devCode && (
        <div className="mb-4.5 rounded-lg border border-[#ecdfb8] bg-[#faf6ea] px-4 py-3 text-center text-[13px] text-[#8a6d2f]">
          {t('registerOtp.sandboxNote')} <b>{devCode}</b>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder={t('registerOtp.codePh')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={emailVerified}
          className={`${inputClass} text-center text-base tracking-[4px]`}
        />
        {newUsername !== null && (
          <input
            type="text"
            placeholder={t('register.usernamePh')}
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className={inputClass}
          />
        )}
        <FieldError>{error}</FieldError>
        <button
          type="submit"
          disabled={busy}
          className="btn-sheen rounded-xl bg-navy py-3.25 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(11,31,58,0.6)] transition-all hover:bg-navy-hover active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? '...' : t('registerOtp.submit')}
        </button>
      </form>

      <div className="mt-4.5 text-center text-[13.5px]">
        <button onClick={() => void resend()} className="font-semibold text-navy">
          {t('registerOtp.resend')}
        </button>
      </div>
      <div className="mt-2.5 text-center">
        <Link to="/login" className="text-[13px] text-muted no-underline">
          {t('registerOtp.backToLogin')}
        </Link>
      </div>
    </AuthCard>
  )
}
