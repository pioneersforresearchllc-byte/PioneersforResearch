import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'
import { useLanguage } from '@/lib/i18n'

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
  const [error, setError] = useState('')
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

    setBusy(true)
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (signUpErr || !signUpData.user) {
        setError(
          signUpErr?.message === 'User already registered'
            ? t('teacherApply.emailInUse')
            : t('teacherApply.genericError'),
        )
        return
      }

      // Private bucket — path is scoped to the applicant's own user id, and
      // only they or a verified owner can read it back (see storage RLS).
      let cvFileUrl: string | null = null
      if (cvFile) {
        const path = `${signUpData.user.id}/${Date.now()}-${cvFile.name}`
        const { error: uploadErr } = await supabase.storage.from('teacher-cv-documents').upload(path, cvFile)
        if (uploadErr) {
          setError(t('teacherApply.cvUploadError'))
          return
        }
        cvFileUrl = path
      }

      const { data: otpData, error: otpErr } = await supabase.functions.invoke('send-signup-otp')
      if (otpErr) {
        setError(t('teacherApply.genericError'))
        return
      }

      navigate('/register-otp', {
        state: {
          email: email.trim(),
          profilePayload: {
            user_id: signUpData.user.id,
            role: 'teacher',
            name: name.trim(),
            username: username.trim(),
            specialty: specialty.trim(),
            qualification: qualification.trim(),
            years_experience: Number(years) || 0,
            cv_text: cv.trim(),
            cv_file_url: cvFileUrl,
          },
          successRoute: '/teacher-pending',
          devCode: (otpData as { devCode?: string })?.devCode ?? null,
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
        <input
          type="password"
          placeholder={t('teacherApply.passwordPh')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
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
        <FieldError>{error}</FieldError>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-navy py-3.25 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
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
