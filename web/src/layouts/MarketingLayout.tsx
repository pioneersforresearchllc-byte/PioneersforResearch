import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'

const dashboardPathFor = (role: string) =>
  role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/owner'

export function MarketingLayout() {
  const { session, profile } = useAuth()
  const { lang, dir, toggleLang, t } = useLanguage()
  const isTeacherSession = profile?.role === 'teacher'

  return (
    <div dir={dir} lang={lang} className="min-h-screen w-full bg-white text-navy">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-16 py-5">
        <Link to="/" className="font-heading text-[22px] font-bold text-navy no-underline">
          Pioneers for Research
        </Link>
        <div className="flex gap-8.5 text-[15px]">
          <a href="/#about" className="text-navy no-underline">
            {t('nav.about')}
          </a>
          {!isTeacherSession && (
            <a href="/#programs" className="text-navy no-underline">
              {t('nav.programs')}
            </a>
          )}
          <a href="/#resources" className="text-navy no-underline">
            {t('nav.resources')}
          </a>
          <a href="/#contact" className="text-navy no-underline">
            {t('nav.contact')}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="rounded-md border border-border px-3.5 py-2 text-[13px] text-navy hover:border-navy"
          >
            {t('lang.toggle')}
          </button>
          {session && profile ? (
            <Link
              to={dashboardPathFor(profile.role)}
              className="rounded-md border border-gold bg-gold px-5.5 py-2.5 text-sm text-white no-underline hover:bg-gold-hover"
            >
              {t('nav.backToDashboard')}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md border border-navy px-5.5 py-2.5 text-sm text-navy no-underline hover:bg-bg-soft"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="rounded-md border border-navy bg-navy px-5.5 py-2.5 text-sm text-white no-underline hover:bg-navy-hover"
              >
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>
      </div>

      <Outlet />

      <div className="flex justify-between px-16 py-6.5 text-[13px] text-muted">
        <span>{t('footer.copyright')}</span>
        <span className="flex gap-4.5">
          <span>{t('footer.tagline')}</span>
          <Link to="/owner-login" className="text-[#9aa6b5] no-underline">
            {t('footer.adminPortal')}
          </Link>
        </span>
      </div>
    </div>
  )
}
