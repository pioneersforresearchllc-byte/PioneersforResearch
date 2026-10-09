import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { captureReferralFromUrl } from '@/lib/referral'
import { supabase } from '@/lib/supabase'
import { AuthCard, FieldError, PasswordInput, inputClass } from '@/components/AuthCard'
import { Button } from '@/components/ui/Button'
import { GoogleButton } from '@/components/GoogleButton'
import { useLanguage } from '@/lib/i18n'
import { useAuth } from '@/context/AuthContext'
import { PhoneField } from '@/components/PhoneField'
import { normalizePhone, savePhone } from '@/lib/phone'
import { recordTermsAcceptance } from '@/lib/legal'
import { AgreeTerms } from '@/components/AgreeTerms'
import { clearAbandonedSignup, fnErrorBody, isUsernameTaken, isValidUsername } from '@/lib/authHelpers'

export function RegisterPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { refreshProfile } = useAuth()
  const location = useLocation()
  useEffect(() => captureReferralFromUrl(location.search), [location.search])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phoneCountry, setPhoneCountry] = useState('966')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [showForgotLink, setShowForgotLink] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setShowForgotLink(false)

    if (honeypot) return // silently drop — bot filled the hidden field
    if (!name.trim() || !email.trim() || !username.trim() || !password || !phoneNumber.trim()) {
      setError(t('register.fillFields'))
      return
    }
    const phone = normalizePhone(phoneCountry, phoneNumber)
    if (!phone) {
      setError(t('phone.invalid'))
      return
    }
    if (!isValidUsername(username.trim())) {
      setError(t('register.usernameInvalid'))
      return
    }
    if (password.length < 6) {
      setError(t('register.passwordLength'))
      return
    }
    if (!agreed) {
      setError(t('register.mustAgree'))
      return
    }

    setBusy(true)
    try {
      // Check before creating the auth user: a taken username would otherwise
      // only surface after the email code, when the form can no longer change it.
      if (await isUsernameTaken(username.trim())) {
        setError(t('register.usernameTaken'))
        return
      }

      let signUpData: Awaited<ReturnType<typeof supabase.auth.signUp>>['data']
      let signUpErr: Awaited<ReturnType<typeof supabase.auth.signUp>>['error']
      ;({ data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      }))

      if (signUpErr?.message === 'User already registered') {
        // Could be a real account, or a signup someone abandoned before
        // entering the OTP (which leaves a ghost auth user). Ask the server
        // to clear the abandoned one; only a real account (with a profile)
        // blocks reuse.
        const reset = await clearAbandonedSignup(email.trim(), password)
        if (reset === 'pending') {
          setError(t('register.signupPending'))
          return
        }
        if (reset === 'in_use') {
          setError(t('register.emailInUse'))
          setShowForgotLink(true)
          return
        }
        // Abandoned attempt cleared — sign up fresh with the new password.
        ;({ data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        }))
      }

      if (signUpErr || !signUpData.user) {
        setError(t('register.genericError'))
        return
      }

      const userId = signUpData.user.id
      const hasSession = !!signUpData.session

      if (!hasSession) {
        setError('') // no error — success path with no immediate session
        navigate('/login')
        return
      }

      const profilePayload = { user_id: userId, role: 'student' as const, name: name.trim(), username: username.trim() }

      const { data: otpData, error: otpErr } = await supabase.functions.invoke('send-signup-otp')
      const otpResult = otpData as { error?: string; autoVerified?: boolean; devCode?: string } | null
      if (otpErr) {
        const body = await fnErrorBody(otpErr)
        setError(t(body?.error === 'invalid_email' ? 'register.invalidEmail' : 'registerOtp.sendError'))
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
        // Best effort — the dashboard's phone prompt catches a failure here.
        await savePhone(userId, phone).catch(() => undefined)
        await recordTermsAcceptance(userId).catch(() => undefined)
        await refreshProfile()
        navigate('/student')
        return
      }

      navigate('/register-otp', {
        state: {
          email: email.trim(),
          profilePayload,
          phone,
          acceptedTerms: true,
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
      <div className="mb-6 text-center">
        <img src="/logo.png" alt="" className="mx-auto mb-3 h-14 w-14" />
        <div className="font-heading text-xl font-bold text-navy">Pioneers Health Research</div>
        <div className="mt-1.5 text-sm text-muted">{t('register.title')}</div>
      </div>

      <div className="mb-5">
        <div className="mb-1.5 text-center text-[12.5px] font-semibold text-muted">{t('register.chooseType')}</div>
        <div className="flex rounded-lg bg-bg-soft p-1">
          <button
            type="button"
            className="flex-1 rounded-md bg-navy py-2 text-[13.5px] font-semibold text-white"
          >
            {t('register.asIndividual')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/register-institution')}
            className="flex-1 rounded-md bg-transparent py-2 text-[13.5px] font-semibold text-navy hover:bg-white"
          >
            {t('register.asInstitution')}
          </button>
        </div>
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
        <div>
          <PhoneField country={phoneCountry} number={phoneNumber} onCountry={setPhoneCountry} onNumber={setPhoneNumber} />
          <div className="mt-1.5 text-[12px] leading-5 text-muted">{t('phone.hint')}</div>
        </div>
        <PasswordInput
          autoComplete="new-password"
          placeholder={t('register.passwordPh')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        <AgreeTerms checked={agreed} onChange={setAgreed} />
        <FieldError>{error}</FieldError>
        {showForgotLink && (
          <div className="-mt-2 text-[13px]">
            <Link to="/forgot-password" className="font-semibold text-navy no-underline">
              {t('register.forgotPasswordLink')}
            </Link>
          </div>
        )}
        <Button type="submit" loading={busy} fullWidth size="lg" className="mt-0.5">
          {t('register.submit')}
        </Button>
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
