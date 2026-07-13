import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'
import { useLanguage } from '@/lib/i18n'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError(t('forgotPassword.fillField'))
      return
    }
    setBusy(true)
    try {
      await supabase.functions.invoke('send-password-reset-otp', { body: { email: email.trim() } })
      // Always proceed regardless of whether the email is registered — the
      // response is intentionally generic so this page can't be used to
      // check which emails have accounts.
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
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-navy py-3.25 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
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
