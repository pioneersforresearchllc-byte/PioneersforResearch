import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const dashboardPathFor = (role: string) =>
  role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/owner'

export function MarketingLayout() {
  const { session, profile } = useAuth()
  const isTeacherSession = profile?.role === 'teacher'

  return (
    <div dir="rtl" lang="ar" className="min-h-screen w-full bg-white text-navy">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-16 py-5">
        <Link to="/" className="font-heading text-[22px] font-bold text-navy no-underline">
          Pioneers for Research
        </Link>
        <div className="flex gap-8.5 text-[15px]">
          <a href="/#about" className="text-navy no-underline">
            من نحن
          </a>
          {!isTeacherSession && (
            <a href="/#programs" className="text-navy no-underline">
              البرامج
            </a>
          )}
          <a href="/#resources" className="text-navy no-underline">
            الموارد
          </a>
          <a href="/#contact" className="text-navy no-underline">
            تواصل
          </a>
        </div>
        <div className="flex gap-3">
          {session && profile ? (
            <Link
              to={dashboardPathFor(profile.role)}
              className="rounded-md border border-gold bg-gold px-5.5 py-2.5 text-sm text-white no-underline hover:bg-gold-hover"
            >
              → رجوع للوحة التحكم
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md border border-navy px-5.5 py-2.5 text-sm text-navy no-underline hover:bg-bg-soft"
              >
                تسجيل الدخول
              </Link>
              <Link
                to="/register"
                className="rounded-md border border-navy bg-navy px-5.5 py-2.5 text-sm text-white no-underline hover:bg-navy-hover"
              >
                إنشاء حساب
              </Link>
            </>
          )}
        </div>
      </div>

      <Outlet />

      <div className="flex justify-between px-16 py-6.5 text-[13px] text-muted">
        <span>Pioneers for Research © 2026</span>
        <span className="flex gap-4.5">
          <span>منصة تدريب على البحث العلمي</span>
          <Link to="/owner-login" className="text-[#9aa6b5] no-underline">
            بوابة الإدارة
          </Link>{' '}
          <span className="opacity-50">(admin / Admin@2026)</span>
        </span>
      </div>
    </div>
  )
}
