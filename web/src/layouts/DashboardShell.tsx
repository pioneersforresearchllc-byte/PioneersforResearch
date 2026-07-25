import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import type { translations } from '@/lib/translations'
import { navIcon } from './navIcons'

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

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-error px-1 text-[10.5px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function DashboardShell({ subtitleKey, userName, tabs, badges }: DashboardShellProps) {
  const { signOut } = useAuth()
  const { t, dir, lang, toggleLang } = useLanguage()

  return (
    <div dir={dir} lang={lang} className="flex min-h-screen flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border px-4 py-3.5 md:px-8 md:py-4">
        <div className="font-heading text-base font-bold text-navy md:text-lg">
          Pioneers Health Research{' '}
          <span className="block text-[12.5px] font-normal text-muted md:inline md:text-[13px]">— {t(subtitleKey)}</span>
        </div>
        <div className="flex items-center gap-2.5 md:gap-4.5">
          <span className="hidden text-sm text-navy sm:inline">{userName}</span>
          <button
            onClick={toggleLang}
            className="shrink-0 whitespace-nowrap rounded-md border border-border px-3 py-1.75 text-[12.5px] text-navy hover:border-navy md:px-4 md:py-2 md:text-[13.5px]"
          >
            {t('lang.toggle')}
          </button>
          <Link
            to="/"
            className="shrink-0 whitespace-nowrap rounded-md border border-border px-3 py-1.75 text-[12.5px] text-muted no-underline hover:border-navy hover:text-navy md:px-4 md:py-2 md:text-[13.5px]"
          >
            {t('shell.home')}
          </Link>
          <button
            onClick={() => void signOut()}
            className="shrink-0 whitespace-nowrap rounded-md border border-border px-3 py-1.75 text-[12.5px] text-muted hover:border-navy hover:text-navy md:px-4.5 md:py-2 md:text-[13.5px]"
          >
            {t('shell.signOut')}
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col md:flex-row">
        <div className="hidden w-[236px] shrink-0 flex-col gap-0.5 border-l border-border bg-white p-3 md:flex">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.to}
              end
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3.5 py-2.75 text-[14px] transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-l from-navy to-[#14335c] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(11,31,58,0.5)]'
                    : 'font-normal text-navy/80 hover:bg-navy/[0.055] hover:text-navy'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-gold' : 'text-navy/45 transition-colors group-hover:text-navy'}>
                    {navIcon(tab.key)}
                  </span>
                  <span className="flex-1">{t(tab.labelKey)}</span>
                  <Badge count={badges?.[tab.key] ?? 0} />
                </>
              )}
            </NavLink>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto border-b border-border bg-white px-3 py-2 md:hidden">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.to}
              end
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.75 text-[13px] transition-colors ${
                  isActive ? 'bg-navy font-semibold text-white' : 'bg-bg-soft font-normal text-navy'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-gold' : 'text-navy/50'}>{navIcon(tab.key)}</span>
                  <span>{t(tab.labelKey)}</span>
                  <Badge count={badges?.[tab.key] ?? 0} />
                </>
              )}
            </NavLink>
          ))}
        </div>
        <div className="flex-1 overflow-x-hidden bg-bg-soft px-4 py-5 md:px-10 md:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
