import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'
import { useLanguage } from '@/lib/i18n'

const ORG_TYPES = ['hospital', 'clinic', 'center', 'insurer', 'gov', 'other'] as const

export function InstitutionApplyPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('')
  const [regNo, setRegNo] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactTitle, setContactTitle] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [consultType, setConsultType] = useState('')
  const [size, setSize] = useState('')
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
    if (honeypot) return

    if (!orgName.trim() || !email.trim() || !username.trim() || !password || !contactName.trim()) {
      setError(t('instApply.requiredFields'))
      return
    }
    if (password.length < 6) {
      setError(t('instApply.passwordLength'))
      return
    }

    setBusy(true)
    try {
      let signUpData: Awaited<ReturnType<typeof supabase.auth.signUp>>['data']
      let signUpErr: Awaited<ReturnType<typeof supabase.auth.signUp>>['error']
      ;({ data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email: email.trim(), password }))

      if (signUpErr?.message === 'User already registered') {
        const { data: resetData } = await supabase.functions.invoke('reset-unverified-signup', {
          body: { email: email.trim() },
        })
        const reset = resetData as { cleared?: boolean; hasProfile?: boolean } | null
        if (reset?.hasProfile) {
          setError(t('instApply.emailInUse'))
          setShowForgotLink(true)
          return
        }
        ;({ data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email: email.trim(), password }))
      }

      if (signUpErr || !signUpData.user) {
        setError(t('instApply.genericError'))
        return
      }

      const profilePayload = {
        user_id: signUpData.user.id,
        role: 'institution' as const,
        name: orgName.trim(),
        username: username.trim(),
        institution: {
          name: orgName.trim(),
          org_type: orgType || null,
          registration_number: regNo.trim(),
          country: country.trim(),
          city: city.trim(),
          contact_name: contactName.trim(),
          contact_title: contactTitle.trim(),
          contact_email: email.trim(),
          contact_phone: phone.trim(),
          consultation_type: consultType.trim(),
          size: size.trim(),
        },
      }

      const { data: otpData, error: otpErr } = await supabase.functions.invoke('send-signup-otp')
      const otpResult = otpData as { error?: string; autoVerified?: boolean; devCode?: string } | null
      if (otpErr || otpResult?.error === 'invalid_email') {
        setError(t('instApply.invalidEmail'))
        return
      }
      if (otpErr) {
        setError(t('instApply.genericError'))
        return
      }

      if (otpResult?.autoVerified) {
        const { data: profileData, error: profileErr } = await supabase.functions.invoke('create-profile', {
          body: profilePayload,
        })
        if (profileErr || (profileData as { error?: string } | null)?.error) {
          setError(t('instApply.genericError'))
          return
        }
        navigate('/institution-pending')
        return
      }

      navigate('/register-otp', {
        state: {
          email: email.trim(),
          profilePayload,
          successRoute: '/institution-pending',
          devCode: otpResult?.devCode ?? null,
        },
      })
    } finally {
      setBusy(false)
    }
  }

  const label = 'mb-1.5 block text-[13px] font-semibold text-navy'
  return (
    <AuthCard width={520}>
      <div className="mb-6 text-center">
        <div className="font-heading text-xl font-bold text-navy">{t('instApply.title')}</div>
        <div className="mt-1.5 text-sm text-muted">{t('instApply.subtitle')}</div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className={label}>{t('instApply.orgSection')}</div>
        <input placeholder={t('instApply.orgNamePh')} value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputClass} />
        <select value={orgType} onChange={(e) => setOrgType(e.target.value)} className={inputClass}>
          <option value="">{t('instApply.orgType')}</option>
          {ORG_TYPES.map((o) => (
            <option key={o} value={o}>
              {t(`instType.${o}` as `instType.${typeof o}`)}
            </option>
          ))}
        </select>
        <input placeholder={t('instApply.regNumberPh')} value={regNo} onChange={(e) => setRegNo(e.target.value)} className={inputClass} />
        <div className="flex gap-3">
          <input placeholder={t('instApply.countryPh')} value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass} />
          <input placeholder={t('instApply.cityPh')} value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
        </div>

        <div className={`${label} mt-2`}>{t('instApply.contactSection')}</div>
        <input placeholder={t('instApply.contactNamePh')} value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
        <input placeholder={t('instApply.contactTitlePh')} value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} className={inputClass} />
        <input type="email" placeholder={t('instApply.emailPh')} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        <input placeholder={t('instApply.phonePh')} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />

        <div className={`${label} mt-2`}>{t('instApply.needSection')}</div>
        <input placeholder={t('instApply.consultTypePh')} value={consultType} onChange={(e) => setConsultType(e.target.value)} className={inputClass} />
        <input placeholder={t('instApply.sizePh')} value={size} onChange={(e) => setSize(e.target.value)} className={inputClass} />

        <div className={`${label} mt-2`}>{t('instApply.accountSection')}</div>
        <input placeholder={t('instApply.usernamePh')} value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} />
        <input type="password" placeholder={t('instApply.passwordPh')} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />

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
              {t('teacherApply.forgotPasswordLink')}
            </Link>
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-navy py-3.25 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
        >
          {busy ? '...' : t('instApply.submit')}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link to="/login" className="text-[13px] text-muted no-underline">
          {t('instApply.backToLogin')}
        </Link>
      </div>
    </AuthCard>
  )
}
