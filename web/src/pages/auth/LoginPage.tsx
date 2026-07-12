import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { fetchProfile } from '@/lib/profile'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'

export function LoginPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const fillDemo = (nextRole: 'student' | 'teacher') => {
    setRole(nextRole)
    if (nextRole === 'teacher') {
      setIdentifier('khalid@example.com')
      setPassword('demo123')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password) {
      setError('يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور')
      return
    }
    setBusy(true)
    try {
      const { data: email, error: resolveErr } = await supabase.rpc('resolve_login_identifier', {
        identifier: identifier.trim(),
      })
      if (resolveErr || !email) {
        setError('لا يوجد حساب بهذا الاسم أو البريد الإلكتروني')
        return
      }

      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInErr || !data.user) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        return
      }

      const profile = await fetchProfile(data.user.id)
      if (!profile) {
        setError('تعذر تحميل بيانات الحساب')
        await supabase.auth.signOut()
        return
      }

      if (profile.role === 'owner') {
        await supabase.auth.signOut()
        setError('يرجى استخدام بوابة الإدارة لتسجيل الدخول')
        return
      }

      if (profile.role === 'teacher' && profile.status === 'pending') {
        navigate('/teacher-pending')
        return
      }
      if (profile.role === 'teacher' && profile.status === 'rejected') {
        await supabase.auth.signOut()
        setError('تم رفض طلب انضمامك كمعلم')
        return
      }

      void supabase.from('login_events').insert({ user_id: data.user.id })
      navigate(profile.role === 'student' ? '/student' : '/teacher')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard>
      <div className="mb-7 text-center">
        <div className="font-heading text-xl font-bold text-navy">Pioneers for Research</div>
        <div className="mt-1.5 text-sm text-muted">تسجيل الدخول إلى حسابك</div>
      </div>

      <div className="mb-5 flex rounded-lg bg-[#f0f3f7] p-1">
        <button
          type="button"
          onClick={() => fillDemo('student')}
          className={`flex-1 rounded-md border-none py-2.25 text-[13.5px] font-semibold ${
            role === 'student' ? 'bg-navy text-white' : 'bg-transparent text-navy'
          }`}
        >
          طالب
        </button>
        <button
          type="button"
          onClick={() => fillDemo('teacher')}
          className={`flex-1 rounded-md border-none py-2.25 text-[13.5px] font-semibold ${
            role === 'teacher' ? 'bg-navy text-white' : 'bg-transparent text-navy'
          }`}
        >
          معلم
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <input
          type="text"
          placeholder="اسم المستخدم أو البريد الإلكتروني"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          placeholder="كلمة المرور"
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
          {busy ? '...' : 'تسجيل الدخول'}
        </button>
      </form>

      {role === 'teacher' && (
        <>
          <div className="mt-4 text-center text-[13px] text-muted">للتجربة: khalid / demo123</div>
          <div className="mt-2.5 text-center text-[13.5px]">
            لست معلمًا مسجلًا؟{' '}
            <Link to="/teacher-apply" className="font-semibold text-navy no-underline">
              قدّم طلب انضمام كمعلم
            </Link>
          </div>
        </>
      )}
      {role === 'student' && (
        <div className="mt-4 text-center text-[13px] text-muted">للتجربة: noura / noura123</div>
      )}

      <div className="mt-4 text-center text-[13.5px] text-muted">
        ليس لديك حساب؟{' '}
        <Link to="/register" className="font-semibold text-navy no-underline">
          إنشاء حساب
        </Link>
      </div>
      <div className="mt-2.5 text-center">
        <Link to="/" className="text-[13px] text-muted no-underline">
          → رجوع للرئيسية
        </Link>
      </div>
    </AuthCard>
  )
}
