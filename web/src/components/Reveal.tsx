import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Reveals its children with a gentle fade-up the first time they scroll into
 * view. Motion is defined in index.css (.reveal / .is-visible) and disabled
 * under prefers-reduced-motion. `delay` staggers siblings (ms).
 */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const show = () => el.classList.add('is-visible')
    if (typeof IntersectionObserver === 'undefined') {
      show()
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show()
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    // Safety net: never let content stay invisible if the observer never fires
    // (e.g. a tab that isn't compositing). Reveal anyway after a short delay.
    const fallback = window.setTimeout(show, 1500)
    return () => {
      io.disconnect()
      window.clearTimeout(fallback)
    }
  }, [])

  return (
    <div ref={ref} className={`reveal ${className ?? ''}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  )
}
