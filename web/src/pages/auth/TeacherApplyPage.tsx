import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'

export function TeacherApplyPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [qualification, setQualification] = useState('')
  const [years, setYears] = useState('')
  const [cv, setCv] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
      setError('يرجى تعبئة جميع الحقول المطلوبة')
      return
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
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
            ? 'هذا البريد الإلكتروني مستخدم بالفعل'
            : 'تعذر إرسال الطلب، حاول مجددًا',
        )
        return
      }

      const { data: fnData, error: fnErr } = await supabase.functions.invoke('create-profile', {
        body: {
          user_id: signUpData.user.id,
          role: 'teacher',
          name: name.trim(),
          username: username.trim(),
          specialty: specialty.trim(),
          qualification: qualification.trim(),
          years_experience: Number(years) || 0,
          cv_text: cv.trim(),
        },
      })
      if (fnErr || (fnData as { error?: string } | null)?.error) {
        setError(
          (fnData as { error?: string } | null)?.error === 'profile already exists'
            ? 'اسم المستخدم مستخدم بالفعل'
            : 'تعذر إرسال الطلب، حاول مجددًا',
        )
        return
      }

      navigate('/teacher-pending')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard width={480}>
      <div className="mb-6 text-center">
        <div className="font-heading text-xl font-bold text-navy">طلب انضمام كمعلم</div>
        <div className="mt-1.5 text-sm text-muted">
          تُراجع الإدارة كل طلب يدويًا قبل تفعيل الحساب — عبّئ بياناتك كأنك تتقدم لوظيفة
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <input
          type="text"
          placeholder="الاسم الكامل"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="اسم المستخدم"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="التخصص (مثال: إحصاء، كتابة أكاديمية)"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="المؤهل العلمي"
          value={qualification}
          onChange={(e) => setQualification(e.target.value)}
          className={inputClass}
        />
        <input
          type="number"
          min={0}
          placeholder="سنوات الخبرة"
          value={years}
          onChange={(e) => setYears(e.target.value)}
          className={inputClass}
        />
        <textarea
          placeholder="السيرة الذاتية: اذكر خبرتك في الإشراف والتدريب، وأبرز إنجازاتك العلمية"
          value={cv}
          onChange={(e) => setCv(e.target.value)}
          rows={4}
          className={`${inputClass} resize-y font-[inherit]`}
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
        <FieldError>{error}</FieldError>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-navy py-3.25 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
        >
          {busy ? '...' : 'إرسال الطلب'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link to="/login" className="text-[13px] text-muted no-underline">
          → رجوع لتسجيل الدخول
        </Link>
      </div>
    </AuthCard>
  )
}
