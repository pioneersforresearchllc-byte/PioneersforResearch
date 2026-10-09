import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n'

/** Gold-check list item used on package / service cards and in the details window. */
export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[13.5px] leading-6 text-muted-2">
      <svg className="mt-1 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a24b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12l5 5L20 7" />
      </svg>
      <span>{children}</span>
    </li>
  )
}

/** Splits a multi-line field into non-empty trimmed lines. */
export function lines(text: string): string[] {
  return (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

export interface DetailBlock {
  icon: string
  title: string
  /** One item per line; the block is hidden when empty. */
  text: string
  tone?: 'plain' | 'navy' | 'gold'
  /** Full width (e.g. terms) instead of half. */
  wide?: boolean
}

function Block({ b }: { b: DetailBlock }) {
  const items = lines(b.text)
  if (items.length === 0) return null
  const box = b.tone === 'navy' ? 'bg-navy/[0.04] border-navy/10' : b.tone === 'gold' ? 'bg-gold/[0.07] border-gold/30' : 'bg-white border-border'
  return (
    <section className={`rounded-2xl border p-5 ${box} ${b.wide ? 'md:col-span-2' : ''}`}>
      <h4 className="mb-3 flex items-center gap-2 text-[15.5px] font-bold text-navy">
        <span aria-hidden className="text-[18px]">{b.icon}</span>
        {b.title}
      </h4>
      <ul className="flex flex-col gap-2">
        {items.map((f) => (
          <CheckItem key={f}>{f}</CheckItem>
        ))}
      </ul>
    </section>
  )
}

/**
 * Formal details window shared by institution packages and individual services:
 * navy header with number, title, subtitle and fact tiles; overview; titled
 * check-lists (scope, deliverables, commitments, terms); sticky footer CTA.
 * Portalled to <body> — the page-transition wrapper's transform would otherwise
 * trap this fixed overlay beneath the sticky site header.
 */
export function DetailsDialog({
  index,
  title,
  subtitle,
  badge,
  facts,
  overviewLabel,
  description,
  blocks,
  footerText,
  cta,
  onClose,
}: {
  index: number
  title: string
  subtitle?: string
  badge?: string
  facts: { k: string; v: string }[]
  overviewLabel: string
  description?: string
  blocks: DetailBlock[]
  footerText: string
  cta: { label: string; to: string }
  onClose: () => void
}) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const tx = (a: string, e: string) => (ar ? a : e)

  // Esc closes; lock page scroll behind the window.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const shownFacts = facts.filter((f) => f.v)

  return createPortal(
    <div dir={ar ? 'rtl' : 'ltr'} className="fixed inset-0 z-50 flex items-end justify-center bg-[#0a1c34]/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="relative shrink-0 bg-gradient-to-br from-navy to-[#14335c] px-6 pb-6 pt-6 text-white md:px-8">
          <button
            type="button"
            onClick={onClose}
            aria-label={tx('إغلاق', 'Close')}
            className="absolute top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[16px] text-white hover:bg-white/20 ltr:right-4 rtl:left-4"
          >
            ✕
          </button>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-heading text-[13px] font-bold tracking-[2px] text-gold" dir="ltr">
              {String(index + 1).padStart(2, '0')}
            </span>
            {badge && <span className="rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-navy">{badge}</span>}
          </div>
          <h3 className="font-heading pe-10 text-[22px] font-bold leading-snug md:text-[28px]">{title}</h3>
          {subtitle && <p className="mt-1 text-[14px] text-white/70">{subtitle}</p>}
          {shownFacts.length > 0 && (
            <dl className={`mt-5 grid grid-cols-2 gap-2.5 ${shownFacts.length >= 4 ? 'md:grid-cols-4' : shownFacts.length === 3 ? 'md:grid-cols-3' : ''}`}>
              {shownFacts.map((f) => (
                <div key={f.k} className="rounded-xl bg-white/[0.07] px-3.5 py-2.5">
                  <dt className="text-[11.5px] text-white/55">{f.k}</dt>
                  <dd className="mt-0.5 text-[13.5px] font-semibold leading-5">{f.v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
          {description && (
            <div className="mb-5">
              <h4 className="mb-2 text-[13px] font-semibold tracking-[1.5px] text-accent">{overviewLabel}</h4>
              <p className="whitespace-pre-line text-[15px] leading-8 text-muted-2">{description}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {blocks.map((b) => (
              <Block key={b.title} b={b} />
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-6 text-muted">
            {tx('تخضع جميع الخدمات لـ', 'All services are subject to our ')}
            <Link to="/terms" target="_blank" className="font-semibold text-navy">
              {tx('الشروط والأحكام', 'Terms & Conditions')}
            </Link>
            {tx(' و', ' and ')}
            <Link to="/refund" target="_blank" className="font-semibold text-navy">
              {tx('سياسة الاسترجاع والإلغاء', 'Refund & Cancellation Policy')}
            </Link>
            {tx('، وتُحدَّد التفاصيل النهائية في عرض السعر.', '; final details are set in the quote.')}
          </p>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-bg-soft px-6 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <span className="text-[13px] text-muted">{footerText}</span>
          <Link to={cta.to} className="rounded-full bg-gold px-7 py-2.5 text-center text-[14.5px] font-bold text-navy no-underline hover:bg-gold/85">
            {cta.label}
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  )
}
