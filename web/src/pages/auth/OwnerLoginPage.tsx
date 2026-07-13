import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { fetchProfile } from '@/lib/profile'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'
import { useLanguage } from '@/lib/i18n'

export function OwnerLoginPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password) {
      setError(t('ownerLogin.fillFields'))
      return
    }

    setBusy(true)
    try {
      const { data: email, error: resolveErr } = await supabase.rpc('resolve_login_identifier', {
        identifier: identifier.trim(),
      })
      if (resolveErr || !email) {
        setError(t('ownerLogin.invalidCreds'))
        return
      }

      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr || !data.user) {
        setError(t('ownerLogin.invalidCreds'))
        return
      }

      const profile = await fetchProfile(data.user.id)
      if (!profile || profile.role !== 'owner') {
        await supabase.auth.signOut()
        setError(t('ownerLogin.invalidCreds'))
        return
      }

      const { data: otpData, error: otpErr } = await supabase.functions.invoke('send-otp')
      if (otpErr) {
        setError(t('ownerLogin.otpSendError'))
        return
      }

      navigate('/owner-otp', { state: { devCode: (otpData as { devCode?: string })?.devCode ?? null } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard dark>
      <div className="mb-7 text-center">
        <div className="font-heading text-xl font-bold text-navy">{t('ownerLogin.title')}</div>
        <div className="mt-1.5 text-sm text-muted">{t('ownerLogin.subtitle')}</div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <input
          type="text"
          placeholder={t('ownerLogin.identifierPh')}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          placeholder={t('ownerLogin.passwordPh')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <FieldError>{error}</FieldError>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-navy py-3.25 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
        >
          {busy ? '...' : t('ownerLogin.submit')}
        </button>
      </form>

      <div className="mt-5 text-center text-[12.5px] text-[#a9b2bd]">{t('ownerLogin.hint')}</div>
      <div className="mt-2.5 text-center">
        <Link to="/" className="text-[13px] text-muted no-underline">
          {t('ownerLogin.backHome')}
        </Link>
      </div>
    </AuthCard>
  )
}
