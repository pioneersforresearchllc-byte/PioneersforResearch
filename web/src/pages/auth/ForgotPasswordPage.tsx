import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { invokeFn } from '@/lib/invokeFn'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'
import { useLanguage } from '@/lib/i18n'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // A code was sent recently: let the user go enter it instead of waiting.
  const [codeAlreadySent, setCodeAlreadySent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setCodeAlreadySent(false)
    if (!email.trim()) {
      setError(t('forgotPassword.fillField'))
      return
    }
    setBusy(true)
    try {
      const result = await invokeFn<{ sent?: boolean; retryAfterSeconds?: number }>('send-password-reset-otp', {
        email: email.trim(),
      })
      if (result?.error === 'email_not_found') {
        setError(t('forgotPassword.emailNotFound'))
        return
      }
      if (result?.error === 'rate_limited') {
        const minutes = Math.max(1, Math.ceil((result.retryAfterSeconds ?? 300) / 60))
        setError(t('forgotPassword.rateLimited', { minutes: String(minutes) }))
        setCodeAlreadySent(true)
        return
      }
      if (!result?.sent) {
        setError(t('forgotPassword.genericError'))
        return
      }
      navigate('/reset-password', { state: { email: email.trim() } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard>
      <div className="mb-7 text-center">
        <div className="font-heading text-xl font-bold text-navy">{t('forgotPassword.title')}</div>
        <div className="mt-1.5 text-sm text-muted">{t('forgotPassword.subtitle')}</div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <input
          type="email"
          placeholder={t('forgotPassword.emailPh')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <FieldError>{error}</FieldError>
        {codeAlreadySent && (
          <button
            type="button"
            onClick={() => navigate('/reset-password', { state: { email: email.trim() } })}
            className="rounded-xl border border-navy py-2.75 text-[14px] font-semibold text-navy hover:bg-bg-soft"
          >
            {t('forgotPassword.haveCode')}
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="btn-sheen rounded-xl bg-navy py-3.25 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(11,31,58,0.6)] transition-all hover:bg-navy-hover active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? '...' : t('forgotPassword.submit')}
        </button>
      </form>

      <div className="mt-5 text-center text-[13.5px] text-muted">
        <Link to="/login" className="font-semibold text-navy no-underline">
          {t('forgotPassword.backToLogin')}
        </Link>
      </div>
    </AuthCard>
  )
}
