import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export interface DashboardTab {
  key: string
  label: string
  to: string
}

interface DashboardShellProps {
  subtitle: string
  userName: string
  tabs: DashboardTab[]
}

export function DashboardShell({ subtitle, userName, tabs }: DashboardShellProps) {
  const { signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border px-4 py-3.5 md:px-8 md:py-4">
        <div className="font-heading text-base font-bold text-navy md:text-lg">
          Pioneers for Research{' '}
          <span className="block text-[12.5px] font-normal text-muted md:inline md:text-[13px]">— {subtitle}</span>
        </div>
        <div className="flex items-center gap-2.5 md:gap-4.5">
          <span className="hidden text-sm text-navy sm:inline">{userName}</span>
          <Link
            to="/"
            className="shrink-0 whitespace-nowrap rounded-md border border-border px-3 py-1.75 text-[12.5px] text-muted no-underline hover:border-navy hover:text-navy md:px-4 md:py-2 md:text-[13.5px]"
          >
            → الرئيسية
          </Link>
          <button
            onClick={() => void signOut()}
            className="shrink-0 whitespace-nowrap rounded-md border border-border px-3 py-1.75 text-[12.5px] text-muted hover:border-navy hover:text-navy md:px-4.5 md:py-2 md:text-[13.5px]"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col md:flex-row">
        <div className="hidden w-[230px] shrink-0 flex-col gap-1 border-l border-border p-3.5 md:flex">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.to}
              end
              className={({ isActive }) =>
                `rounded-lg px-4 py-3 text-right text-[14.5px] ${
                  isActive ? 'bg-navy font-semibold text-white' : 'bg-transparent font-normal text-navy'
                }`
              }
            >
              {tab.label}
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
                `shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.75 text-[13px] ${
                  isActive ? 'bg-navy font-semibold text-white' : 'bg-bg-soft font-normal text-navy'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
        <div className="flex-1 overflow-x-hidden bg-bg-soft px-4 py-5 md:px-10 md:py-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
