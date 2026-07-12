import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { fetchProfile } from '@/lib/profile'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'

export function OwnerLoginPage() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
        setError('بيانات الدخول غير صحيحة')
        return
      }

      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr || !data.user) {
        setError('بيانات الدخول غير صحيحة')
        return
      }

      const profile = await fetchProfile(data.user.id)
      if (!profile || profile.role !== 'owner') {
        await supabase.auth.signOut()
        setError('بيانات الدخول غير صحيحة')
        return
      }

      const { data: otpData, error: otpErr } = await supabase.functions.invoke('send-otp')
      if (otpErr) {
        setError('تعذر إرسال رمز التحقق، حاول مجددًا')
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
        <div className="font-heading text-xl font-bold text-navy">بوابة الإدارة</div>
        <div className="mt-1.5 text-sm text-muted">دخول مخصص لفريق الإدارة فقط</div>
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
          {busy ? '...' : 'دخول الإدارة'}
        </button>
      </form>

      <div className="mt-5 text-center text-[12.5px] text-[#a9b2bd]">
        حسابات الإدارة تُنشأ فقط من داخل لوحة الإدارة نفسها
      </div>
      <div className="mt-2.5 text-center">
        <Link to="/" className="text-[13px] text-muted no-underline">
          → رجوع للرئيسية
        </Link>
      </div>
    </AuthCard>
  )
}
