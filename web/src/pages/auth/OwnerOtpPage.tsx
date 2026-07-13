import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'
import { useLanguage } from '@/lib/i18n'

export function OwnerOtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const { t } = useLanguage()
  const [devCode, setDevCode] = useState<string | null>(
    (location.state as { devCode?: string | null } | null)?.devCode ?? null,
  )
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('verify-otp', {
        body: { code: code.trim() },
      })
      const result = data as { verified?: boolean; error?: string } | null
      if (fnErr || !result?.verified) {
        setError(result?.error || t('ownerOtp.invalidCode'))
        return
      }
      navigate('/owner')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setError('')
    const { data } = await supabase.functions.invoke('send-otp')
    const result = data as { devCode?: string; error?: string; retryAfterSeconds?: number } | null
    if (result?.error === 'rate_limited') {
      const minutes = Math.max(1, Math.ceil((result.retryAfterSeconds ?? 300) / 60))
      setError(t('ownerOtp.rateLimited', { minutes: String(minutes) }))
      return
    }
    setDevCode(result?.devCode ?? null)
  }

  return (
    <AuthCard dark>
      <div className="mb-6 text-center">
        <div className="font-heading text-xl font-bold text-navy">{t('ownerOtp.title')}</div>
        <div className="mt-1.5 text-sm text-muted">
          {t('ownerOtp.subtitle', { email: session?.user.email ?? '' })}
        </div>
      </div>

      {devCode && (
        <div className="mb-4.5 rounded-lg border border-[#ecdfb8] bg-[#faf6ea] px-4 py-3 text-center text-[13px] text-[#8a6d2f]">
          {t('ownerOtp.sandboxNote')} <b>{devCode}</b>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder={t('ownerOtp.codePh')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`${inputClass} text-center text-base tracking-[4px]`}
        />
        <FieldError>{error}</FieldError>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-navy py-3.25 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
        >
          {busy ? '...' : t('ownerOtp.submit')}
        </button>
      </form>

      <div className="mt-4.5 text-center text-[13.5px]">
        <button onClick={() => void resend()} className="font-semibold text-navy">
          {t('ownerOtp.resend')}
        </button>
      </div>
      <div className="mt-2.5 text-center">
        <Link to="/owner-login" className="text-[13px] text-muted no-underline">
          {t('ownerOtp.backToLogin')}
        </Link>
      </div>
    </AuthCard>
  )
}
