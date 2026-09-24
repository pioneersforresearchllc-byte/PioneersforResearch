import { useMemo, useState } from 'react'
import { useLanguage } from '@/lib/i18n'

// Temporary Saudi National Day 96 celebration. Auto-expires at the end of
// Sunday night, Saudi time (UTC+3) — after this instant the component renders
// nothing, so it removes itself with no code change or redeploy needed.
const DEADLINE = new Date('2026-09-28T00:00:00+03:00').getTime()

// Saudi green + accents for the falling confetti.
const COLORS = ['#006C35', '#0a8f47', '#ffffff', '#d4af37', '#3fbf6f']

export function NationalDayCelebration() {
  const { t } = useLanguage()
  const [now] = useState(() => Date.now())
  const [closed, setClosed] = useState(() => {
    try {
      return localStorage.getItem('nd96-closed') === '1'
    } catch {
      return false
    }
  })

  // Precompute confetti pieces once so they animate smoothly (stable randoms).
  const pieces = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: -Math.random() * 12,
        duration: 6 + Math.random() * 7,
        size: 6 + Math.random() * 7,
        color: COLORS[i % COLORS.length],
        round: Math.random() > 0.5,
        drift: (Math.random() * 2 - 1) * 40,
      })),
    [],
  )

  if (now >= DEADLINE) return null

  const dismiss = () => {
    try {
      localStorage.setItem('nd96-closed', '1')
    } catch {
      // ignore
    }
    setClosed(true)
  }

  return (
    <>
      <style>{`
        @keyframes ndFall {
          0%   { transform: translateY(-12vh) translateX(0) rotate(0deg); opacity: 0 }
          8%   { opacity: 1 }
          100% { transform: translateY(112vh) translateX(var(--nd-drift)) rotate(720deg); opacity: 1 }
        }
        @keyframes ndBurst {
          0%   { transform: scale(0); opacity: 0 }
          15%  { opacity: 1 }
          60%  { transform: scale(1.6); opacity: .5 }
          100% { transform: scale(2.1); opacity: 0 }
        }
        @keyframes ndShimmer { 0%,100% { background-position: 0% 50% } 50% { background-position: 100% 50% } }
        @media (prefers-reduced-motion: reduce) {
          .nd-confetti, .nd-burst { display: none }
        }
      `}</style>

      {/* Falling confetti — decorative, never blocks clicks. */}
      <div className="nd-confetti pointer-events-none fixed inset-0 z-[45] overflow-hidden" aria-hidden>
        {pieces.map((p) => (
          <span
            key={p.id}
            style={{
              position: 'absolute',
              top: 0,
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.42,
              background: p.color,
              borderRadius: p.round ? '50%' : '1px',
              // @ts-expect-error CSS custom property
              '--nd-drift': `${p.drift}px`,
              animation: `ndFall ${p.duration}s linear ${p.delay}s infinite`,
              boxShadow: p.color === '#ffffff' ? '0 0 1px rgba(0,0,0,.15)' : undefined,
            }}
          />
        ))}
        {/* A few firework bursts for a "live" feel. */}
        {[
          { top: '18%', left: '16%', color: '#0a8f47', delay: '0s' },
          { top: '24%', left: '82%', color: '#d4af37', delay: '1.4s' },
          { top: '12%', left: '54%', color: '#ffffff', delay: '2.6s' },
        ].map((b, i) => (
          <span
            key={`b${i}`}
            className="nd-burst"
            style={{
              position: 'absolute',
              top: b.top,
              left: b.left,
              width: 90,
              height: 90,
              marginLeft: -45,
              marginTop: -45,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${b.color} 0%, transparent 62%)`,
              animation: `ndBurst 3.6s ease-out ${b.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Greeting ribbon — dismissible. */}
      {!closed && (
        <div className="pointer-events-none fixed inset-x-0 top-2.5 z-[46] flex justify-center px-3">
          <div
            className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/25 px-4 py-2 text-white shadow-[0_10px_30px_-10px_rgba(0,108,53,0.8)]"
            style={{
              background: 'linear-gradient(100deg, #006C35, #0a8f47, #006C35)',
              backgroundSize: '200% 100%',
              animation: 'ndShimmer 4s ease-in-out infinite',
            }}
          >
            <span className="text-[16px]">🇸🇦</span>
            <span className="text-[13px] font-bold sm:text-[13.5px]">{t('nationalDay.badge')}</span>
            <span className="hidden text-[12.5px] text-white/85 sm:inline">— {t('nationalDay.greeting')}</span>
            <span className="text-[14px]">🎉</span>
            <button
              onClick={dismiss}
              aria-label="✕"
              className="ms-1 flex h-5 w-5 items-center justify-center rounded-full text-[12px] text-white/70 hover:bg-white/15 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}
