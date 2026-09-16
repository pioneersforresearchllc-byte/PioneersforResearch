import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n'

const KEY = 'pfr-cookie-consent'

/** Bottom cookie/privacy notice. We only use essential storage (sign-in +
 * preferences), so this is a one-time acknowledgement, remembered per browser. */
export function CookieConsent() {
  const { t, dir } = useLanguage()
  const [show, setShow] = useState(false)

  useEffect(() => {
    let seen = false
    try {
      seen = localStorage.getItem(KEY) === '1'
    } catch {
      seen = true // storage blocked — don't nag
    }
    if (!seen) setShow(true)
  }, [])

  const accept = () => {
    setShow(false)
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // ignore
    }
  }

  if (!show) return null

  return (
    <div
      dir={dir}
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-white/95 px-4 py-3.5 shadow-[0_-6px_24px_-12px_rgba(11,31,58,0.25)] backdrop-blur md:px-8"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-[13px] leading-6 text-muted-2">
          {t('cookie.text')}{' '}
          <Link to="/privacy" className="font-semibold text-navy underline underline-offset-2">
            {t('cookie.learnMore')}
          </Link>
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-md bg-navy px-5 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover"
        >
          {t('cookie.accept')}
        </button>
      </div>
    </div>
  )
}
