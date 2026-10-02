import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLanguage } from '@/lib/i18n'

/**
 * 3D "coverflow" carousel: the active card faces the viewer, its neighbours
 * turn away in depth on either side. Arrows, dots, swipe/drag and the
 * keyboard all move it; it autoplays until the visitor hovers or interacts,
 * and stays still for people who prefer reduced motion. RTL-aware: "next"
 * moves toward the reading direction.
 */
export function Carousel3D<T>({
  items,
  renderItem,
  getKey,
  autoplayMs = 4500,
}: {
  items: T[]
  renderItem: (item: T, active: boolean) => ReactNode
  getKey: (item: T) => string
  autoplayMs?: number
}) {
  const { dir, t } = useLanguage()
  const rtl = dir === 'rtl'
  const n = items.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const drag = useRef<{ x: number; moved: boolean } | null>(null)
  // Phones: tighter spread so side cards only peek from the edges behind the front one.
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const go = useCallback((step: number) => setIndex((i) => (i + step + n) % n), [n])

  useEffect(() => {
    if (paused || reduceMotion || n < 2) return
    const id = window.setInterval(() => go(1), autoplayMs)
    return () => window.clearInterval(id)
  }, [paused, reduceMotion, n, go, autoplayMs])

  // Shortest signed distance from the active card, so the ring wraps around.
  const offsetOf = (i: number) => {
    let d = i - index
    if (d > n / 2) d -= n
    if (d < -n / 2) d += n
    return d
  }

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, moved: false }
    setPaused(true)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const start = drag.current
    drag.current = null
    if (!start) return
    const dx = e.clientX - start.x
    if (Math.abs(dx) > 45) {
      // Swiping toward the reading direction's end reveals the next card.
      const forward = rtl ? dx > 0 : dx < 0
      go(forward ? 1 : -1)
    }
  }

  const arrowBtn =
    'flex h-12 w-12 items-center justify-center rounded-full border border-border bg-white text-xl text-navy shadow-[0_8px_20px_-8px_rgba(11,31,58,0.35)] transition-all hover:-translate-y-0.5 hover:border-navy hover:bg-navy hover:text-white'

  return (
    <div
      // clip (not hidden) so side cards can't widen the page, without creating a scroll box
      className="relative overflow-x-clip py-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(rtl ? 1 : -1)
        if (e.key === 'ArrowRight') go(rtl ? -1 : 1)
      }}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
    >
      <div
        className="relative mx-auto h-[540px] select-none [perspective:1600px] md:h-[560px]"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
        style={{ touchAction: 'pan-y' }}
      >
        {items.map((item, i) => {
          const d = offsetOf(i)
          const abs = Math.abs(d)
          const hidden = abs > (narrow ? 1 : 2)
          const spread = narrow ? 34 : 62
          const turn = narrow ? 28 : 38
          // In RTL "next" sits to the left, so mirror the horizontal layout.
          const side = rtl ? -d : d
          const style: React.CSSProperties = {
            transform: `translateX(calc(-50% + ${side * spread}%)) translateZ(${-abs * 170}px) rotateY(${-side * turn}deg) scale(${1 - abs * (narrow ? 0.14 : 0.1)})`,
            opacity: hidden ? 0 : 1 - abs * (narrow ? 0.45 : 0.28),
            zIndex: 10 - abs,
            // Always a full filter value (never none) so it animates back when a card comes forward.`n            filter: `brightness(${1 - abs * 0.12}) blur(${abs > 1 ? 1.5 : 0}px)`,
            pointerEvents: hidden ? 'none' : 'auto',
          }
          return (
            <div
              key={getKey(item)}
              className="absolute left-1/2 top-2 w-[78%] max-w-[380px] transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] motion-reduce:transition-none"
              style={style}
              aria-hidden={d !== 0}
              onClickCapture={(e) => {
                // Clicking a side card brings it forward instead of following its link.
                if (d !== 0) {
                  e.preventDefault()
                  e.stopPropagation()
                  setIndex(i)
                }
              }}
            >
              {renderItem(item, d === 0)}
            </div>
          )
        })}
      </div>

      {n > 1 && (
        <div className="mt-2 flex items-center justify-center gap-5">
          <button type="button" aria-label={t('carousel.prev')} onClick={() => go(-1)} className={arrowBtn}>
            {rtl ? '→' : '←'}
          </button>
          <div className="flex items-center gap-2">
            {items.map((item, i) => (
              <button
                key={getKey(item)}
                type="button"
                aria-label={`${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-gold' : 'w-2.5 bg-navy/20 hover:bg-navy/40'}`}
              />
            ))}
          </div>
          <button type="button" aria-label={t('carousel.next')} onClick={() => go(1)} className={arrowBtn}>
            {rtl ? '←' : '→'}
          </button>
        </div>
      )}
    </div>
  )
}
