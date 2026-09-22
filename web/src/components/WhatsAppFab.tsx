import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/lib/i18n'

/**
 * Floating WhatsApp contact button for the public site. It stays hidden at the
 * very top of the page and springs in once the visitor scrolls down (with a
 * short bob each time they scroll further), an attention-pulse ring, and a
 * label pill that reveals itself briefly on arrival and on hover. Renders
 * nothing until the owner has set a number (passed as bare wa.me digits).
 */
export function WhatsAppFab({ number }: { number: string }) {
  const { t, dir } = useLanguage()
  const [visible, setVisible] = useState(false)
  const [bob, setBob] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const lastY = useRef(0)
  const bobTimer = useRef<number | undefined>(undefined)
  const introShown = useRef(false)
  const introTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!number) return
    const onScroll = () => {
      const y = window.scrollY
      const goingDown = y > lastY.current + 4
      lastY.current = y
      const show = y > 180
      setVisible(show)
      if (show && goingDown) {
        setBob(true)
        window.clearTimeout(bobTimer.current)
        bobTimer.current = window.setTimeout(() => setBob(false), 640)
      }
      // First time it becomes visible, flash the label pill open, then close.
      if (show && !introShown.current) {
        introShown.current = true
        setExpanded(true)
        introTimer.current = window.setTimeout(() => setExpanded(false), 3400)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(bobTimer.current)
      window.clearTimeout(introTimer.current)
    }
  }, [number])

  if (!number) return null

  const href = `https://wa.me/${number}?text=${encodeURIComponent(t('whatsapp.prefill'))}`
  const onLeft = dir === 'rtl'

  return (
    <div
      className="fixed bottom-5 z-40 md:bottom-6"
      style={{ [onLeft ? 'left' : 'right']: '1rem' } as React.CSSProperties}
      aria-hidden={!visible}
    >
      <style>{`
        @keyframes waRing { 0% { transform: scale(1); opacity: .5 } 70% { transform: scale(2); opacity: 0 } 100% { opacity: 0 } }
        @keyframes waBob { 0%,100% { transform: translateY(0) } 32% { transform: translateY(-7px) } 64% { transform: translateY(-2px) } }
      `}</style>

      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={t('whatsapp.aria')}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className="group flex items-center gap-2.5 no-underline"
        style={{
          flexDirection: onLeft ? 'row-reverse' : 'row',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.4)',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          transition: 'transform .45s cubic-bezier(.34,1.56,.64,1), opacity .3s ease',
        }}
      >
        {/* Label pill — reveals on arrival + hover */}
        <span
          className="whitespace-nowrap rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-navy shadow-[0_6px_20px_-6px_rgba(11,31,58,0.35)]"
          style={{
            maxWidth: expanded ? '220px' : '0px',
            opacity: expanded ? 1 : 0,
            paddingInline: expanded ? undefined : 0,
            overflow: 'hidden',
            transition: 'max-width .35s ease, opacity .25s ease, padding .35s ease',
          }}
        >
          {t('whatsapp.label')}
        </span>

        {/* Green circle with the WhatsApp glyph + pulsing ring */}
        <span
          className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_10px_24px_-6px_rgba(37,211,102,0.7)] transition-transform group-hover:scale-105 group-active:scale-95"
          style={{
            background: 'linear-gradient(145deg, #2bd66f 0%, #1aa851 55%, #0f8a43 100%)',
            animation: bob ? 'waBob .64s ease' : undefined,
          }}
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ background: '#25D366', animation: 'waRing 2.4s ease-out infinite' }}
            aria-hidden
          />
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true" className="relative">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 0 0 5.71 1.447h.006c6.585 0 11.946-5.335 11.949-11.896 0-3.176-1.24-6.165-3.49-8.411" />
          </svg>
        </span>
      </a>
    </div>
  )
}
