import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'
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
      const { data, error: fnErr } = await supabase.functions.invoke('verify-password-reset-otp', {
        body: { email, code: code.trim(), newPassword },
      })
      const result = data as { reset?: boolean; error?: string } | null
      if (fnErr || !result?.reset) {
        setError(result?.error || t('resetPassword.genericError'))
        return
      }
      navigate('/login', { state: { passwordResetDone: true } })
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setError('')
    await supabase.functions.invoke('send-password-reset-otp', { body: { email } })
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
        <input
          type="password"
          placeholder={t('resetPassword.newPasswordPh')}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          placeholder={t('resetPassword.confirmPasswordPh')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />
        <FieldError>{error}</FieldError>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-navy py-3.25 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
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
