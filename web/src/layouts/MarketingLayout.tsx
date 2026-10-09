import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { fetchSiteContent, resolveSocialLink, resolveWhatsapp } from '@/lib/content'
import { AnnouncementPopup } from '@/components/AnnouncementPopup'
import { WhatsAppFab } from '@/components/WhatsAppFab'
import { NationalDayCelebration } from '@/components/NationalDayCelebration'
import { PageTransition } from '@/components/ui/motion'
import { buttonClasses } from '@/components/ui/Button'

const dashboardPathFor = (role: string) =>
  role === 'student'
    ? '/student'
    : role === 'teacher'
      ? '/teacher'
      : role === 'institution'
        ? '/institution'
        : '/owner'

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
  const whatsapp = resolveWhatsapp(siteContent)

  const navLinks = (
    <>
      <Link
        to="/institutions"
        className="self-start rounded-full bg-gold px-3.5 py-1.5 font-bold text-navy no-underline transition-colors hover:bg-gold/85 xl:me-2 xl:self-auto"
        onClick={() => setMenuOpen(false)}
      >
        {t('nav.institutions')}
      </Link>
      <Link to="/" className="nav-underline text-navy no-underline" onClick={() => setMenuOpen(false)}>
        {t('nav.home')}
      </Link>
      <Link to="/about" className="nav-underline text-navy no-underline" onClick={() => setMenuOpen(false)}>
        {t('nav.about')}
      </Link>
      {!isTeacherSession && (
        <>
          <Link to="/courses" className="nav-underline text-navy no-underline" onClick={() => setMenuOpen(false)}>
            {t('nav.courses')}
          </Link>
          <Link to="/services" className="nav-underline text-navy no-underline" onClick={() => setMenuOpen(false)}>
            {t('nav.services')}
          </Link>
        </>
      )}
      <a href="/#resources" className="nav-underline text-navy no-underline" onClick={() => setMenuOpen(false)}>
        {t('nav.resources')}
      </a>
      <Link to="/contact" className="nav-underline text-navy no-underline" onClick={() => setMenuOpen(false)}>
        {t('nav.contact')}
      </Link>
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
      {!isTeacherSession && (
        <Link to="/quote" onClick={() => setMenuOpen(false)} className={buttonClasses('gold', 'sm')}>
          {t('quote.cta')}
        </Link>
      )}
      {session && profile ? (
        // Signed in: one unmistakable way back into the dashboard, with who you are.
        <Link
          to={dashboardPathFor(profile.role)}
          onClick={() => setMenuOpen(false)}
          className="group flex items-center gap-2.5 rounded-full border border-navy/15 bg-navy py-1 pe-4 ps-1 text-[13.5px] font-semibold text-white no-underline shadow-[0_8px_20px_-10px_rgba(11,31,58,0.7)] transition-all hover:-translate-y-0.5 hover:bg-navy-hover"
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-gold/70" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-[14px] font-bold text-navy">
              {(profile.name || '?').trim().charAt(0)}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
            {t('nav.myDashboard')}
          </span>
        </Link>
      ) : (
        <>
          <Link to="/login" className={buttonClasses('outline', 'sm')} onClick={() => setMenuOpen(false)}>
            {t('nav.login')}
          </Link>
          <Link to="/register" className={buttonClasses('primary', 'sm')} onClick={() => setMenuOpen(false)}>
            {t('nav.register')}
          </Link>
        </>
      )}
    </>
  )

  return (
    <div dir={dir} lang={lang} className="min-h-screen w-full bg-white text-navy">
      <AnnouncementPopup />
      <NationalDayCelebration />
      <WhatsAppFab number={whatsapp} />
      <div className="glass elev-1 sticky top-0 z-20 border-b border-border/70">
        <div className="flex items-center justify-between px-4 py-4 md:px-16 md:py-5">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <img src="/logo.png" alt="" className="h-10 w-10 md:h-11 md:w-11" />
            <span className="flex flex-col leading-tight">
              <span className="font-heading text-[15px] font-bold text-navy md:text-[20px]">Pioneers Health Research</span>
              <span className="text-[10.5px] text-muted md:text-[12px]">الرواد الاستشارية للبحوث الصحية</span>
            </span>
          </Link>
          <div className="hidden items-center gap-6 text-[14.5px] xl:flex">{navLinks}</div>
          <div className="hidden items-center gap-2.5 xl:flex">{authLinks}</div>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-navy xl:hidden"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
        {menuOpen && (
          <div className="flex flex-col gap-4 border-t border-border px-4 py-4 xl:hidden">
            <div className="flex flex-col gap-3 text-[15px]">{navLinks}</div>
            <div className="flex flex-wrap items-center gap-3">{authLinks}</div>
          </div>
        )}
      </div>

      <PageTransition>
        <Outlet />
      </PageTransition>

      <footer className="relative overflow-hidden bg-[#0a1c34] text-white">
        <div className="pointer-events-none absolute -top-24 h-72 w-72 rounded-full bg-gold/10 blur-[100px] ltr:right-0 rtl:left-0" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:grid-cols-2 md:px-16 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Brand */}
          <div>
            <Link to="/" className="mb-4 flex items-center gap-3 no-underline">
              <img src="/logo.png" alt="" className="h-12 w-12" />
              <span className="flex flex-col leading-tight">
                <span className="font-heading text-[18px] font-bold text-white">Pioneers Health Research</span>
                <span className="text-[12px] text-white/60">الرواد الاستشارية للبحوث الصحية</span>
              </span>
            </Link>
            <p className="mb-5 max-w-xs text-[13.5px] leading-7 text-white/65">{t('footer.about')}</p>
            <div className="flex items-center gap-2.5">
              {[
                { href: social.instagram, label: 'Instagram', icon: InstagramIcon },
                { href: social.x, label: 'X', icon: XIcon },
                { href: social.discord, label: 'Discord', icon: DiscordIcon },
              ]
                .filter((s) => s.href)
                .map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-gold hover:text-gold"
                  >
                    {s.icon}
                  </a>
                ))}
            </div>
          </div>
          {/* Explore */}
          <div>
            <div className="mb-4 text-[14px] font-bold text-gold">{t('footer.explore')}</div>
            <ul className="flex flex-col gap-2.5 text-[13.5px]">
              <li><Link to="/services" className="text-white/70 no-underline hover:text-white">{t('nav.services')}</Link></li>
              <li><Link to="/courses" className="text-white/70 no-underline hover:text-white">{t('nav.courses')}</Link></li>
              <li><Link to="/institutions" className="text-white/70 no-underline hover:text-white">{t('nav.institutions')}</Link></li>
              <li><Link to="/quote" className="text-white/70 no-underline hover:text-white">{t('quote.cta')}</Link></li>
              <li><Link to="/about" className="text-white/70 no-underline hover:text-white">{t('nav.about')}</Link></li>
              <li><a href="/#resources" className="text-white/70 no-underline hover:text-white">{t('nav.resources')}</a></li>
            </ul>
          </div>
          {/* Legal & trust */}
          <div>
            <div className="mb-4 text-[14px] font-bold text-gold">{t('footer.legalTitle')}</div>
            <ul className="flex flex-col gap-2.5 text-[13.5px]">
              <li><Link to="/terms" className="text-white/70 no-underline hover:text-white">{t('footer.terms')}</Link></li>
              <li><Link to="/privacy" className="text-white/70 no-underline hover:text-white">{t('footer.privacy')}</Link></li>
              <li><Link to="/refund" className="text-white/70 no-underline hover:text-white">{t('footer.refund')}</Link></li>
              <li><Link to="/verify" className="text-white/70 no-underline hover:text-white">{t('footer.verifyCert')}</Link></li>
            </ul>
          </div>
          {/* Contact */}
          <div>
            <div className="mb-4 text-[14px] font-bold text-gold">{t('nav.contact')}</div>
            <ul className="flex flex-col gap-3 text-[13.5px]">
              <li>
                <a href="mailto:pioneersforresearchllc@gmail.com" className="flex items-center gap-2 text-white/75 no-underline hover:text-white">
                  <span aria-hidden>✉️</span> pioneersforresearchllc@gmail.com
                </a>
              </li>
              {whatsapp && (
                <li>
                  <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" dir="ltr" className="flex items-center gap-2 text-white/75 no-underline hover:text-white">
                    <span aria-hidden>💬</span> +{whatsapp}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2 text-white/75">
                <span aria-hidden>📍</span> {t('footer.city')}
              </li>
            </ul>
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3.5 py-2.5 text-[12.5px] text-white/90">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a24b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              {t('footer.licensed')}
            </div>
          </div>
        </div>
        {/* Legal identity — payment gateways (e.g. Moyasar) require it on the site. */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-[11.5px] leading-6 text-white/45 md:flex-row md:items-center md:justify-between md:px-16">
            <span>{t('footer.legal')}</span>
            <span className="shrink-0">{t('footer.copyright')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
