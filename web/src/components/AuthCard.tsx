import type { ReactNode } from 'react'

interface AuthCardProps {
  width?: number
  dark?: boolean
  children: ReactNode
}

/** Shared centered-card shell used by every auth screen. */
export function AuthCard({ width = 400, dark = false, children }: AuthCardProps) {
  return (
    <div
      dir="rtl"
      lang="ar"
      className={`flex min-h-screen items-center justify-center py-10 ${dark ? 'bg-navy' : 'bg-bg-soft'}`}
    >
      <div className="rounded-xl bg-white p-10" style={{ width }}>
        {children}
      </div>
    </div>
  )
}

export function FieldError({ children }: { children: ReactNode }) {
  if (!children) return null
  return <div className="text-[13.5px] text-error">{children}</div>
}

export const inputClass =
  'w-full box-border rounded-md border border-border px-4 py-3.25 text-[14.5px]'
