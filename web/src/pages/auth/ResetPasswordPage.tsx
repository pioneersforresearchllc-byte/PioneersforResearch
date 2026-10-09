import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { invokeFn } from '@/lib/invokeFn'
import { AuthCard, FieldError, PasswordInput, inputClass } from '@/components/AuthCard'
import { useLanguage } from '@/lib/i18n'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const email = (location.state as { email?: string } | null)?.email ?? ''

  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!email) {
    return (
      <AuthCard>
        <div className="text-center text-[14px] text-muted">
          <Link to="/forgot-password" className="font-semibold text-navy no-underline">
            {t('resetPassword.backToForgot')}
          </Link>
        </div>
      </AuthCard>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) {
      setError(t('resetPassword.passwordLength'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch'))
      return
    }
    setBusy(true)
    try {
      const result = await invokeFn<{ reset?: boolean }>('verify-password-reset-otp', { email, code: code.trim(), newPassword })
      if (!result?.reset) {
        // Server error codes are English identifiers — show the translated message.
        setError(t('resetPassword.genericError'))
        return
      }
      navigate('/login', { state: { passwordResetDone: true } })
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setError('')
    const result = await invokeFn<{ retryAfterSeconds?: number }>('send-password-reset-otp', { email })
    if (result?.error === 'rate_limited') {
      const minutes = Math.max(1, Math.ceil((result.retryAfterSeconds ?? 300) / 60))
      setError(t('resetPassword.rateLimited', { minutes: String(minutes) }))
    }
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <div className="font-heading text-xl font-bold text-navy">{t('resetPassword.title')}</div>
        <div className="mt-1.5 text-sm text-muted">{t('resetPassword.subtitle', { email })}</div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder={t('resetPassword.codePh')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`${inputClass} text-center text-base tracking-[4px]`}
        />
        <PasswordInput
          autoComplete="new-password"
          placeholder={t('resetPassword.newPasswordPh')}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <PasswordInput
          autoComplete="new-password"
          placeholder={t('resetPassword.confirmPasswordPh')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <FieldError>{error}</FieldError>
        <button
          type="submit"
          disabled={busy}
          className="btn-sheen rounded-xl bg-navy py-3.25 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(11,31,58,0.6)] transition-all hover:bg-navy-hover active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? '...' : t('resetPassword.submit')}
        </button>
      </form>

      <div className="mt-4.5 text-center text-[13.5px]">
        <button onClick={() => void resend()} className="font-semibold text-navy">
          {t('resetPassword.resend')}
        </button>
      </div>
      <div className="mt-2.5 text-center">
        <Link to="/login" className="text-[13px] text-muted no-underline">
          {t('resetPassword.backToLogin')}
        </Link>
      </div>
    </AuthCard>
  )
}
