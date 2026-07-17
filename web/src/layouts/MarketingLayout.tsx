import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'

const dashboardPathFor = (role: string) =>
  role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/owner'

export function MarketingLayout() {
  const { session, profile } = useAuth()
  const { lang, dir, toggleLang, t } = useLanguage()
  const isTeacherSession = profile?.role === 'teacher'
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = (
    <>
      <a href="/#about" className="text-navy no-underline" onClick={() => setMenuOpen(false)}>
        {t('nav.about')}
      </a>
      {!isTeacherSession && (
        <>
          <a href="/#courses" className="text-navy no-underline" onClick={() => setMenuOpen(false)}>
            {t('nav.courses')}
          </a>
          <a href="/#services" className="text-navy no-underline" onClick={() => setMenuOpen(false)}>
            {t('nav.services')}
          </a>
        </>
      )}
      <a href="/#resources" className="text-navy no-underline" onClick={() => setMenuOpen(false)}>
        {t('nav.resources')}
      </a>
      <a href="/#contact" className="text-navy no-underline" onClick={() => setMenuOpen(false)}>
        {t('nav.contact')}
      </a>
    </>
  )

  const authLinks = (
    <>
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
          onClick={() => setMenuOpen(false)}
        >
          {t('nav.backToDashboard')}
        </Link>
      ) : (
        <>
          <Link
            to="/login"
            className="rounded-md border border-navy px-5.5 py-2.5 text-sm text-navy no-underline hover:bg-bg-soft"
            onClick={() => setMenuOpen(false)}
          >
            {t('nav.login')}
          </Link>
          <Link
            to="/register"
            className="rounded-md border border-navy bg-navy px-5.5 py-2.5 text-sm text-white no-underline hover:bg-navy-hover"
            onClick={() => setMenuOpen(false)}
          >
            {t('nav.register')}
          </Link>
        </>
      )}
    </>
  )

  return (
    <div dir={dir} lang={lang} className="min-h-screen w-full bg-white text-navy">
      <div className="sticky top-0 z-10 border-b border-border bg-white">
        <div className="flex items-center justify-between px-4 py-4 md:px-16 md:py-5">
          <Link to="/" className="font-heading text-lg font-bold text-navy no-underline md:text-[22px]">
            Pioneers Health Research
          </Link>
          <div className="hidden items-center gap-8.5 text-[15px] md:flex">{navLinks}</div>
          <div className="hidden items-center gap-3 md:flex">{authLinks}</div>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-navy md:hidden"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
        {menuOpen && (
          <div className="flex flex-col gap-4 border-t border-border px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-[15px]">{navLinks}</div>
            <div className="flex flex-wrap items-center gap-3">{authLinks}</div>
          </div>
        )}
      </div>

      <Outlet />

      <div className="flex flex-col gap-2.5 px-4 py-6.5 text-[13px] text-muted md:flex-row md:justify-between md:px-16">
        <span>{t('footer.copyright')}</span>
        <span className="flex flex-wrap gap-4.5">
          <span>{t('footer.tagline')}</span>
          <Link to="/owner-login" className="text-[#9aa6b5] no-underline">
            {t('footer.adminPortal')}
          </Link>
        </span>
      </div>
    </div>
  )
}
