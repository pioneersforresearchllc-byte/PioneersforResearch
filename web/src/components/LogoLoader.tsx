// A branded loading indicator: the Pioneers logo sits as a faint "ghost" and
// its full-colour copy fills up from the bottom in a smooth, liquid-like loop
// — a calmer, on-brand replacement for a spinner.

// Inject the keyframes once (module scope), so every loader shares them.
const STYLE_ID = 'phr-logo-loader-style'
function ensureStyle() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
    @keyframes phr-fill {
      0%   { clip-path: inset(100% 0 0 0); }
      100% { clip-path: inset(0 0 0 0); }
    }
    @keyframes phr-breathe {
      0%, 100% { opacity: 0.14; }
      50%      { opacity: 0.22; }
    }
    .phr-logo-fill { animation: phr-fill 1.5s cubic-bezier(0.45, 0, 0.25, 1) infinite alternate; will-change: clip-path; }
    .phr-logo-ghost { animation: phr-breathe 3s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .phr-logo-fill { animation-duration: 0.01ms; animation-iteration-count: 1; clip-path: inset(0 0 0 0); }
      .phr-logo-ghost { animation: none; opacity: 0.2; }
    }
  `
  document.head.appendChild(el)
}

export function LogoLoader({ size = 64, label }: { size?: number; label?: string }) {
  ensureStyle()
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center" role="status" aria-label={label ?? 'loading'}>
      <div className="relative" style={{ width: size, height: size }}>
        <img src="/logo.png" alt="" className="phr-logo-ghost absolute inset-0 h-full w-full object-contain grayscale" />
        <img src="/logo.png" alt="" className="phr-logo-fill absolute inset-0 h-full w-full object-contain" />
      </div>
      {label && <div className="text-[13px] text-muted">{label}</div>}
    </div>
  )
}

/** Full-viewport branded loader for app-level waits (auth bootstrapping). */
export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <LogoLoader size={84} />
    </div>
  )
}
