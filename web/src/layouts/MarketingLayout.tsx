import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { fetchSiteContent, resolveSocialLink } from '@/lib/content'
import { AnnouncementPopup } from '@/components/AnnouncementPopup'

const dashboardPathFor = (role: string) =>
  role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/owner'

const InstagramIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
)

const DiscordIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.369a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

const XIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

export function MarketingLayout() {
  const { session, profile } = useAuth()
  const { lang, dir, toggleLang, t } = useLanguage()
  const isTeacherSession = profile?.role === 'teacher'
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: siteContent } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const social = {
    instagram: resolveSocialLink(siteContent, 'social.instagram'),
    x: resolveSocialLink(siteContent, 'social.x'),
    discord: resolveSocialLink(siteContent, 'social.discord'),
  }

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
          <Link
            to="/"
            className="flex items-center gap-2.5 font-heading text-lg font-bold text-navy no-underline md:text-[22px]"
          >
            <img src="/logo.png" alt="" className="h-9 w-9 md:h-10 md:w-10" />
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

      <div className="flex flex-col gap-4 px-4 py-6.5 text-[13px] text-muted md:flex-row md:items-center md:justify-between md:px-16">
        <span>{t('footer.copyright')}</span>
        <div className="flex items-center gap-4">
          {social.instagram && (
            <a
              href={social.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="text-muted transition-colors hover:text-navy"
            >
              {InstagramIcon}
            </a>
          )}
          {social.discord && (
            <a
              href={social.discord}
              target="_blank"
              rel="noreferrer"
              aria-label="Discord"
              className="text-muted transition-colors hover:text-navy"
            >
              {DiscordIcon}
            </a>
          )}
          {social.x && (
            <a
              href={social.x}
              target="_blank"
              rel="noreferrer"
              aria-label="X"
              className="text-muted transition-colors hover:text-navy"
            >
              {XIcon}
            </a>
          )}
        </div>
        <span className="flex flex-wrap gap-4.5">
          <span>{t('footer.tagline')}</span>
          <Link to="/owner-login" className="text-[#9aa6b5] no-underline">
            {t('footer.adminPortal')}
          </Link>
        </span>
      </div>

      <AnnouncementPopup />
    </div>
  )
}
