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
      <div className="flex items-center justify-between border-b border-border px-8 py-4">
        <div className="font-heading text-lg font-bold text-navy">
          Pioneers for Research{' '}
          <span className="text-[13px] font-normal text-muted">— {subtitle}</span>
        </div>
        <div className="flex items-center gap-4.5">
          <span className="text-sm text-navy">{userName}</span>
          <Link
            to="/"
            className="shrink-0 whitespace-nowrap rounded-md border border-border px-4 py-2 text-[13.5px] text-muted no-underline hover:border-navy hover:text-navy"
          >
            → الرئيسية
          </Link>
          <button
            onClick={() => void signOut()}
            className="shrink-0 whitespace-nowrap rounded-md border border-border px-4.5 py-2 text-[13.5px] text-muted hover:border-navy hover:text-navy"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
      <div className="flex flex-1">
        <div className="flex w-[230px] flex-col gap-1 border-l border-border p-3.5">
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
        <div className="flex-1 bg-bg-soft px-10 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
