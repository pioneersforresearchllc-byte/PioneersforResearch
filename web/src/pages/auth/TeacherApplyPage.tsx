import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthCard, FieldError, PasswordInput, inputClass } from '@/components/AuthCard'
import { useLanguage } from '@/lib/i18n'
import { clearAbandonedSignup, fnErrorBody, isUsernameTaken, isValidUsername } from '@/lib/authHelpers'
import { AgreeTerms } from '@/components/AgreeTerms'
import { recordTermsAcceptance } from '@/lib/legal'

const MAX_CV_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_CV_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export function TeacherApplyPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [qualification, setQualification] = useState('')
  const [years, setYears] = useState('')
  const [cv, setCv] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [honeypot, setHoneypot] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [showForgotLink, setShowForgotLink] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleCvFile = (file: File | null) => {
    setError('')
    if (!file) {
      setCvFile(null)
      return
    }
    if (!ALLOWED_CV_TYPES.includes(file.type)) {
      setError(t('teacherApply.fileTypeError'))
      return
    }
    if (file.size > MAX_CV_FILE_BYTES) {
      setError(t('teacherApply.fileSizeError'))
      return
    }
    setCvFile(file)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setShowForgotLink(false)
    if (honeypot) return

    if (
      !name.trim() ||
      !email.trim() ||
      !username.trim() ||
      !password ||
      !specialty.trim() ||
      !qualification.trim() ||
      !cv.trim()
    ) {
      setError(t('teacherApply.requiredFields'))
      return
    }
    if (password.length < 6) {
      setError(t('teacherApply.passwordLength'))
      return
    }
    if (!isValidUsername(username.trim())) {
      setError(t('register.usernameInvalid'))
      return
    }
    if (!agreed) {
      setError(t('register.mustAgree'))
      return
    }

    setBusy(true)
    try {
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
        // Real account, or an application abandoned before OTP (ghost auth
        // user). Clear the abandoned one; only a real profile blocks reuse.
        const reset = await clearAbandonedSignup(email.trim(), password)
        if (reset === 'pending') {
          setError(t('register.signupPending'))
          return
        }
        if (reset === 'in_use') {
          setError(t('teacherApply.emailInUse'))
          setShowForgotLink(true)
          return
        }
        ;({ data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        }))
      }

      if (signUpErr || !signUpData.user) {
        setError(t('teacherApply.genericError'))
        return
      }

      const userId = signUpData.user.id

      // Private bucket — path is scoped to the applicant's own user id, and
      // only they or a verified owner can read it back (see storage RLS).
      let cvFileUrl: string | null = null
      if (cvFile) {
        const path = `${userId}/${Date.now()}-${cvFile.name}`
        const { error: uploadErr } = await supabase.storage.from('teacher-cv-documents').upload(path, cvFile)
        if (uploadErr) {
          setError(t('teacherApply.cvUploadError'))
          return
        }
        cvFileUrl = path
      }

      const profilePayload = {
        user_id: userId,
        role: 'teacher' as const,
        name: name.trim(),
        username: username.trim(),
        specialty: specialty.trim(),
        qualification: qualification.trim(),
        years_experience: Number(years) || 0,
        cv_text: cv.trim(),
        cv_file_url: cvFileUrl,
      }

      const { data: otpData, error: otpErr } = await supabase.functions.invoke('send-signup-otp')
      const otpResult = otpData as { error?: string; autoVerified?: boolean; devCode?: string } | null
      if (otpErr) {
        const body = await fnErrorBody(otpErr)
        setError(t(body?.error === 'invalid_email' ? 'teacherApply.invalidEmail' : 'registerOtp.sendError'))
        return
      }

      if (otpResult?.autoVerified) {
        const { data: profileData, error: profileErr } = await supabase.functions.invoke('create-profile', {
          body: profilePayload,
        })
        if (profileErr || (profileData as { error?: string } | null)?.error) {
          setError(t('teacherApply.genericError'))
          return
        }
        await recordTermsAcceptance(userId).catch(() => undefined)
        navigate('/teacher-pending')
        return
      }

      navigate('/register-otp', {
        state: {
          email: email.trim(),
          profilePayload,
          acceptedTerms: true,
          successRoute: '/teacher-pending',
          devCode: otpResult?.devCode ?? null,
        },
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard width={480}>
      <div className="mb-6 text-center">
        <div className="font-heading text-xl font-bold text-navy">{t('teacherApply.title')}</div>
        <div className="mt-1.5 text-sm text-muted">{t('teacherApply.subtitle')}</div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <input
          type="text"
          placeholder={t('teacherApply.namePh')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          type="email"
          placeholder={t('teacherApply.emailPh')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder={t('teacherApply.usernamePh')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass}
        />
        <PasswordInput
          autoComplete="new-password"
          placeholder={t('teacherApply.passwordPh')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="text"
          placeholder={t('teacherApply.specialtyPh')}
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder={t('teacherApply.qualificationPh')}
          value={qualification}
          onChange={(e) => setQualification(e.target.value)}
          className={inputClass}
        />
        <input
          type="number"
          min={0}
          placeholder={t('teacherApply.yearsPh')}
          value={years}
          onChange={(e) => setYears(e.target.value)}
          className={inputClass}
        />
        <textarea
          placeholder={t('teacherApply.cvPh')}
          value={cv}
          onChange={(e) => setCv(e.target.value)}
          rows={4}
          className={`${inputClass} resize-y font-[inherit]`}
        />
        <div>
          <label className="mb-1.5 block text-[13px] text-muted">{t('teacherApply.attachLabel')}</label>
          <input
            type="file"
            accept="application/pdf,.pdf,.doc,.docx"
            onChange={(e) => handleCvFile(e.target.files?.[0] ?? null)}
          />
          {cvFile && <div className="mt-1 text-[12.5px] text-navy">{cvFile.name}</div>}
        </div>
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
              {t('teacherApply.forgotPasswordLink')}
            </Link>
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="btn-sheen rounded-xl bg-navy py-3.25 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(11,31,58,0.6)] transition-all hover:bg-navy-hover active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? '...' : t('teacherApply.submit')}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link to="/login" className="text-[13px] text-muted no-underline">
          {t('teacherApply.backToLogin')}
        </Link>
      </div>
    </AuthCard>
  )
}
