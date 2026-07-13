import type { ReactNode } from 'react'
import { useLanguage } from '@/lib/i18n'

interface AuthCardProps {
  width?: number
  dark?: boolean
  children: ReactNode
}

/** Shared centered-card shell used by every auth screen. */
export function AuthCard({ width = 400, dark = false, children }: AuthCardProps) {
  const { lang, dir, toggleLang, t } = useLanguage()

  return (
    <div
      dir={dir}
      lang={lang}
      className={`relative flex min-h-screen items-center justify-center py-10 ${dark ? 'bg-navy' : 'bg-bg-soft'}`}
    >
      <button
        onClick={toggleLang}
        className={`absolute top-6 rounded-md border px-3.5 py-2 text-[13px] ltr:left-6 rtl:right-6 ${
          dark ? 'border-white/30 text-white hover:bg-white/10' : 'border-border text-navy hover:bg-white'
        }`}
      >
        {t('lang.toggle')}
      </button>
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
