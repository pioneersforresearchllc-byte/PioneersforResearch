import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n'

interface AuthCardProps {
  width?: number
  dark?: boolean
  children: ReactNode
}

const Check = () => (
  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  </span>
)

/**
 * Shared shell for every auth screen. Desktop: split layout — a branded panel
 * (value proposition + trust points) beside the form. Phones: the form alone
 * under a compact brand header. `dark` keeps the admin portal visually apart.
 */
export function AuthCard({ width = 420, dark = false, children }: AuthCardProps) {
  const { lang, dir, toggleLang, t } = useLanguage()
  const ar = lang === 'ar'
  const points = ar
    ? ['دورات تدريبية عملية بشهادات قابلة للتحقق', 'إشراف ومتابعة شخصية مع مختصين في البحث الصحي', 'تتبّع طلباتك وجلساتك ورسائلك من لوحة واحدة', 'سرية تامة لبياناتك وملفاتك البحثية']
    : ['Practical courses with verifiable certificates', 'Personal mentoring by health-research specialists', 'Track requests, sessions and messages in one place', 'Full confidentiality for your data and files']

  return (
    <div dir={dir} lang={lang} className={`flex min-h-screen ${dark ? 'bg-[#0a1c34]' : 'bg-white'}`}>
      {/* Brand panel (desktop) */}
      {!dark && (
        <aside className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0d2748] via-navy to-[#14335c] p-12 text-white lg:flex">
          <div className="pointer-events-none absolute -top-24 h-96 w-96 rounded-full bg-gold/20 blur-[110px] ltr:right-[-6rem] rtl:left-[-6rem]" />
          <div className="pointer-events-none absolute bottom-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[#1f4a7a]/60 blur-[120px] ltr:left-[-8rem] rtl:right-[-8rem]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)', backgroundSize: '22px 22px' }}
          />
          <Link to="/" className="relative flex items-center gap-3 no-underline">
            <img src="/logo.png" alt="" className="h-12 w-12" />
            <span className="flex flex-col leading-tight">
              <span className="font-heading text-[19px] font-bold text-white">Pioneers Health Research</span>
              <span className="text-[12.5px] text-white/65">الرواد الاستشارية للبحوث الصحية</span>
            </span>
          </Link>
          <div className="relative">
            <h2 className="font-heading mb-3 text-[34px] font-bold leading-[1.35]">
              {ar ? 'رحلتك البحثية تبدأ من هنا' : 'Your research journey starts here'}
            </h2>
            <p className="mb-8 max-w-md text-[15.5px] leading-8 text-white/75">
              {ar ? 'من صياغة الفكرة إلى التحليل والنشر — نرافقك خطوة بخطوة.' : 'From shaping the idea to analysis and publication — we walk with you step by step.'}
            </p>
            <ul className="flex flex-col gap-4">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[15px] text-white/90">
                  <Check />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative text-[12.5px] text-white/50">© {new Date().getFullYear()} Pioneers Health Research</div>
        </aside>
      )}

      {/* Form side */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16">
        {dark ? (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0d2748] via-[#0a1c34] to-[#050e1a]" />
            <div className="animate-float pointer-events-none absolute -top-24 h-80 w-80 rounded-full bg-gold/15 blur-[90px] ltr:right-[-5rem] rtl:left-[-5rem]" />
            <div className="animate-float pointer-events-none absolute bottom-[-8rem] h-96 w-96 rounded-full bg-[#1a3f6e]/50 blur-[110px] ltr:left-[-6rem] rtl:right-[-6rem]" />
          </>
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#eef2f8] via-bg-soft/60 to-white lg:from-white lg:via-white" />
        )}

        <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between md:inset-x-6 md:top-6">
          <Link
            to="/"
            className={`rounded-lg px-3 py-2 text-[13px] font-semibold no-underline transition-colors ${
              dark ? 'text-white/80 hover:bg-white/10' : 'text-navy hover:bg-bg-soft'
            }`}
          >
            {ar ? '→ الرئيسية' : '← Home'}
          </Link>
          <button
            onClick={toggleLang}
            className={`rounded-lg border px-3.5 py-2 text-[13px] transition-colors ${
              dark ? 'border-white/30 text-white hover:bg-white/10' : 'border-border bg-white text-navy hover:border-navy'
            }`}
          >
            {t('lang.toggle')}
          </button>
        </div>

        <div
          className={`page-in relative z-10 w-full overflow-hidden rounded-2xl bg-white p-6 md:p-9 ${
            dark ? 'shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/10' : 'elev-3 ring-1 ring-border/60 lg:shadow-none lg:ring-0'
          }`}
          style={{ maxWidth: width }}
        >
          <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-light via-gold to-gold-hover ${dark ? '' : 'lg:hidden'}`} />
          {children}
        </div>
      </main>
    </div>
  )
}

export function FieldError({ children }: { children: ReactNode }) {
  if (!children) return null
  return <div className="rounded-lg bg-error-bg px-3 py-2 text-[13.5px] text-error">{children}</div>
}

export const inputClass =
  'w-full box-border rounded-xl border border-border bg-white px-4 py-3.25 text-[14.5px] outline-none transition-colors placeholder:text-faint focus:border-navy focus:ring-2 focus:ring-navy/15'

/** Password field with a show/hide toggle. */
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { lang } = useLanguage()
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`${inputClass} ltr:pr-12 rtl:pl-12 ${props.className ?? ''}`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? (lang === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password') : lang === 'ar' ? 'إظهار كلمة المرور' : 'Show password'}
        className="absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-bg-soft hover:text-navy ltr:right-1.5 rtl:left-1.5"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {show ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.5M6.2 6.2C4 7.6 2.6 9.7 2 12c1 2.5 5 7 10 7 1.8 0 3.4-.5 4.8-1.3" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </>
          ) : (
            <>
              <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  )
}
