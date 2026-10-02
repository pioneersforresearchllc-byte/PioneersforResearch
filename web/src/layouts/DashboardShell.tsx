import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import type { translations } from '@/lib/translations'
import { navIcon } from './navIcons'
import { NotificationBell } from '@/components/NotificationBell'
import { PageTransition } from '@/components/ui/motion'
import { PushPrompt } from '@/components/PushPrompt'

export interface DashboardTab {
  key: string
  labelKey: keyof typeof translations
  to: string
}

interface DashboardShellProps {
  subtitleKey: keyof typeof translations
  userName: string
  tabs: DashboardTab[]
  /** Per-tab notification counts, keyed by tab.key. 0/undefined shows none. */
  badges?: Record<string, number>
}

const globeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
  </svg>
)

// Long menus are split into labelled sections. Each role has its own set; the
// set whose keys cover a menu's tabs is used, otherwise the menu stays flat.
type Group = { ar: string; en: string; keys: string[] }
const OWNER_GROUPS: Group[] = [
  { ar: 'عام', en: 'General', keys: ['overview'] },
  { ar: 'التعليم', en: 'Education', keys: ['applications', 'teachers', 'courses', 'workshops', 'certificates'] },
  { ar: 'الخدمات والعملاء', en: 'Services & clients', keys: ['services', 'service-requests', 'institutions', 'inst-consultations'] },
  { ar: 'المالية', en: 'Finance', keys: ['billing', 'invoices', 'discounts'] },
  { ar: 'التواصل', en: 'Communication', keys: ['messages', 'contact', 'broadcast', 'reviews'] },
  { ar: 'الموقع والإعدادات', en: 'Website & settings', keys: ['home-content', 'articles', 'admins', 'accounts', 'account'] },
]
const STUDENT_GROUPS: Group[] = [
  { ar: 'عام', en: 'General', keys: ['overview'] },
  { ar: 'التعلّم', en: 'Learning', keys: ['courses', 'assignments', 'grades', 'certificates', 'feedback', 'articles', 'workshops'] },
  { ar: 'الخدمات', en: 'Services', keys: ['my-services', 'requests'] },
  { ar: 'المالية', en: 'Payments', keys: ['billing', 'invoices'] },
  { ar: 'الحساب', en: 'Account', keys: ['chat', 'account'] },
]
const GROUP_SETS = [OWNER_GROUPS, STUDENT_GROUPS]

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-error px-1 text-[10.5px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function NavList({ tabs, badges, onNavigate }: { tabs: DashboardTab[]; badges?: Record<string, number>; onNavigate?: () => void }) {
  const { t, lang } = useLanguage()
  const set = tabs.length > 10 ? GROUP_SETS.find((gs) => tabs.every((tab) => gs.some((g) => g.keys.includes(tab.key)))) : undefined
  const sections = set
    ? set
        .map((g) => ({ title: lang === 'ar' ? g.ar : g.en, items: tabs.filter((tab) => g.keys.includes(tab.key)) }))
        .filter((s) => s.items.length > 0)
    : [{ title: '', items: tabs }]

  return (
    <nav className="flex flex-col gap-0.5">
      {sections.map((s, si) => (
        <div key={si} className={si > 0 ? 'mt-3' : ''}>
          {s.title && <div className="mb-1 px-3.5 text-[11px] font-bold uppercase tracking-[1.5px] text-navy/40">{s.title}</div>}
          {s.items.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.to}
              end
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-l from-navy to-[#14335c] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(11,31,58,0.5)]'
                    : 'font-normal text-navy/80 hover:bg-navy/[0.055] hover:text-navy'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-gold' : 'text-navy/45 transition-colors group-hover:text-navy'}>{navIcon(tab.key)}</span>
                  <span className="flex-1">{t(tab.labelKey)}</span>
                  <Badge count={badges?.[tab.key] ?? 0} />
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

function BackToSite({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLanguage()
  return (
    <Link
      to="/"
      onClick={onNavigate}
      className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-gold/60 bg-gold/[0.07] px-3.5 py-3 text-[13.5px] text-navy no-underline transition-colors hover:bg-gold/15"
    >
      <span className="text-gold">{globeIcon}</span>
      <span className="flex flex-col leading-tight">
        <span className="font-semibold">{t('shell.visitSite')}</span>
        <span className="text-[11.5px] text-muted">{t('shell.visitSiteHint')}</span>
      </span>
    </Link>
  )
}

export function DashboardShell({ subtitleKey, userName, tabs, badges }: DashboardShellProps) {
  const { signOut, profile } = useAuth()
  const { t, dir, lang, toggleLang } = useLanguage()
  const location = useLocation()
  const [drawer, setDrawer] = useState(false)
  const ar = lang === 'ar'

  // Close the phone drawer whenever the route changes.
  useEffect(() => setDrawer(false), [location.pathname])

  const current = [...tabs].sort((a, b) => b.to.length - a.to.length).find((tab) => location.pathname === tab.to || location.pathname.startsWith(tab.to + '/'))
  const totalBadges = Object.values(badges ?? {}).reduce((a, b) => a + (b || 0), 0)
  const roleLabel =
    profile?.role === 'owner'
      ? ar ? 'الإدارة' : 'Admin'
      : profile?.role === 'teacher'
        ? ar ? 'مدرّب' : 'Instructor'
        : profile?.role === 'institution'
          ? ar ? 'مؤسسة' : 'Institution'
          : ar ? 'طالب' : 'Student'

  const avatar = profile?.avatar_url ? (
    <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-gold/60" />
  ) : (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-[14px] font-bold text-gold">{(userName || '?').trim().charAt(0)}</span>
  )

  return (
    <div dir={dir} lang={lang} className="flex min-h-screen flex-col">
      <header className="glass elev-1 sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/70 px-3 py-3 md:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label={ar ? 'القائمة' : 'Menu'}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-navy md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            {totalBadges > 0 && <span className="absolute -top-1 h-3 w-3 rounded-full bg-error ring-2 ring-white ltr:-right-1 rtl:-left-1" />}
          </button>
          {/* Logo + name go back to the public site, like on any web app. */}
          <Link to="/" className="flex min-w-0 items-center gap-2.5 no-underline" title={t('shell.visitSite')}>
            <img src="/logo.png" alt="" className="h-9 w-9 shrink-0 md:h-10 md:w-10" />
            <span className="hidden min-w-0 flex-col leading-tight sm:flex">
              <span className="font-heading truncate text-[16px] font-bold text-navy md:text-lg">Pioneers Health Research</span>
              <span className="truncate text-[12px] text-muted">{t(subtitleKey)}</span>
            </span>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <Link
            to="/"
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-lg border border-gold/60 bg-gold/10 px-3.5 py-2 text-[13px] font-semibold text-navy no-underline hover:border-gold hover:bg-gold/20 lg:flex"
          >
            {globeIcon}
            {t('shell.visitSite')}
          </Link>
          <NotificationBell />
          <button
            onClick={toggleLang}
            className="whitespace-nowrap rounded-lg border border-border px-3 py-2 text-[12.5px] text-navy hover:border-navy md:text-[13px]"
          >
            {t('lang.toggle')}
          </button>
          <div className="hidden items-center gap-2.5 border-border ps-3 sm:flex ltr:border-l rtl:border-r">
            {avatar}
            <span className="flex flex-col leading-tight">
              <span className="max-w-[140px] truncate text-[13.5px] font-semibold text-navy">{userName}</span>
              <span className="text-[11.5px] text-accent">{roleLabel}</span>
            </span>
          </div>
          <button
            onClick={() => void signOut()}
            title={t('shell.signOut')}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[12.5px] text-muted hover:border-error hover:text-error md:px-3 md:text-[13px]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
              <path d="M10 17l-5-5 5-5M5 12h11" />
            </svg>
            <span className="hidden md:inline">{t('shell.signOut')}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-[65px] hidden max-h-[calc(100vh-65px)] w-[248px] shrink-0 flex-col self-start overflow-y-auto border-border bg-white p-3 md:flex ltr:border-r rtl:border-l">
          <NavList tabs={tabs} badges={badges} />
          <BackToSite />
        </aside>

        {/* Phone drawer */}
        {drawer && (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]" onClick={() => setDrawer(false)} />
            <div className="page-in absolute inset-y-0 flex w-[82%] max-w-[320px] flex-col overflow-y-auto bg-white p-4 shadow-2xl ltr:left-0 rtl:right-0">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {avatar}
                  <span className="flex flex-col leading-tight">
                    <span className="text-[14px] font-semibold text-navy">{userName}</span>
                    <span className="text-[11.5px] text-accent">{roleLabel}</span>
                  </span>
                </div>
                <button type="button" onClick={() => setDrawer(false)} aria-label={ar ? 'إغلاق' : 'Close'} className="flex h-9 w-9 items-center justify-center rounded-lg text-[18px] text-muted hover:bg-bg-soft">
                  ✕
                </button>
              </div>
              <NavList tabs={tabs} badges={badges} onNavigate={() => setDrawer(false)} />
              <BackToSite onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 bg-bg-soft px-4 py-5 md:px-10 md:py-8">
          <div className="mx-auto w-full max-w-6xl">
            {/* Where am I — breadcrumb */}
            {current && (
              <div className="mb-4 flex items-center gap-1.5 text-[12.5px] text-muted">
                <span>{t(subtitleKey)}</span>
                <span aria-hidden="true">{ar ? '‹' : '›'}</span>
                <span className="font-semibold text-navy">{t(current.labelKey)}</span>
              </div>
            )}
            <PushPrompt />
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  )
}
