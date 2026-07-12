import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthCard, FieldError, inputClass } from '@/components/AuthCard'

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (honeypot) return // silently drop — bot filled the hidden field
    if (!name.trim() || !email.trim() || !username.trim() || !password) {
      setError('يرجى تعبئة جميع الحقول')
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
            : 'تعذر إنشاء الحساب، حاول مجددًا',
        )
        return
      }

      const { data: fnData, error: fnErr } = await supabase.functions.invoke('create-profile', {
        body: { user_id: signUpData.user.id, role: 'student', name: name.trim(), username: username.trim() },
      })
      if (fnErr || (fnData as { error?: string } | null)?.error) {
        setError(
          (fnData as { error?: string } | null)?.error === 'profile already exists'
            ? 'اسم المستخدم مستخدم بالفعل'
            : 'تعذر إكمال إنشاء الحساب، حاول مجددًا',
        )
        return
      }

      if (signUpData.session) {
        navigate('/student')
      } else {
        setError('') // no error — success path with no immediate session
        navigate('/login')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard>
      <div className="mb-7 text-center">
        <div className="font-heading text-xl font-bold text-navy">Pioneers for Research</div>
        <div className="mt-1.5 text-sm text-muted">إنشاء حساب طالب جديد</div>
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
          {busy ? '...' : 'إنشاء الحساب'}
        </button>
      </form>

      <div className="mt-5 text-center text-[13.5px] text-muted">
        لديك حساب؟{' '}
        <Link to="/login" className="font-semibold text-navy no-underline">
          تسجيل الدخول
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
