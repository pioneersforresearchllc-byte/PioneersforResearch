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
      className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 ${
        dark ? 'bg-[#0a1c34]' : 'bg-gradient-to-b from-white to-bg-soft'
      }`}
    >
      {dark && (
        <>
          {/* Layered background so the dark screens read as designed, not a flat navy fill. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0d2748] via-[#0a1c34] to-[#050e1a]" />
          <div className="pointer-events-none absolute -top-24 h-80 w-80 rounded-full bg-gold/15 blur-[90px] ltr:right-[-5rem] rtl:left-[-5rem]" />
          <div className="pointer-events-none absolute bottom-[-8rem] h-96 w-96 rounded-full bg-[#1a3f6e]/50 blur-[110px] ltr:left-[-6rem] rtl:right-[-6rem]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
          />
        </>
      )}
      <button
        onClick={toggleLang}
        className={`absolute top-4 z-10 rounded-md border px-3.5 py-2 text-[13px] ltr:left-4 rtl:right-4 md:top-6 md:ltr:left-6 md:rtl:right-6 ${
          dark ? 'border-white/30 text-white hover:bg-white/10' : 'border-border text-navy hover:bg-white'
        }`}
      >
        {t('lang.toggle')}
      </button>
      <div
        className={`relative z-10 w-full rounded-2xl bg-white p-6 md:p-10 ${
          dark ? 'shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/10' : 'shadow-[0_18px_50px_-24px_rgba(11,31,58,0.35)]'
        }`}
        style={{ maxWidth: width }}
      >
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
