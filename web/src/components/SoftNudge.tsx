import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/lib/i18n'

/**
 * A low-key, NON-blocking prompt that slides up in a bottom corner instead of a
 * full-screen modal — so it never blocks the page or scares a visitor away. It
 * appears after `delayMs` (let them look around first); its dismiss is a light
 * "×" placed away from the primary action to avoid accidental taps, and
 * dismissing hides it then brings it back after `reappearMs`. The parent decides
 * whether to render it at all, so completing the action (which flips the
 * parent's state) removes it for good.
 */
export function SoftNudge({
  title,
  children,
  delayMs = 10_000,
  reappearMs = 10 * 60_000,
}: {
  title: string
  children: ReactNode
  delayMs?: number
  reappearMs?: number
}) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const [visible, setVisible] = useState(false)
  const [shown, setShown] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    timer.current = window.setTimeout(() => setVisible(true), delayMs)
    return () => window.clearTimeout(timer.current)
  }, [delayMs])

  useEffect(() => {
    if (!visible) {
      setShown(false)
      return
    }
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [visible])

  const dismiss = () => {
    setVisible(false)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setVisible(true), reappearMs)
  }

  if (!visible) return null

  return createPortal(
    <div
      dir={ar ? 'rtl' : 'ltr'}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-4 sm:justify-start sm:ltr:pl-5 sm:rtl:pr-5"
    >
      <div
        className={`pointer-events-auto relative w-full max-w-sm rounded-2xl border border-border bg-white p-4 pt-8 shadow-2xl transition-all duration-300 ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
        }`}
      >
        {/* Light dismiss, kept at the top corner — away from the agree button. */}
        <button
          onClick={dismiss}
          aria-label={ar ? 'إغلاق' : 'Dismiss'}
          className="absolute top-1.5 text-[20px] leading-none text-faint/70 transition-colors hover:text-muted ltr:right-3 rtl:left-3"
        >
          ×
        </button>
        <div className="mb-2 text-[14.5px] font-bold text-navy">{title}</div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
