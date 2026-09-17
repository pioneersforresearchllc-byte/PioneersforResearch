// A branded loading indicator: the Pioneers logo is a "glass" that fills with
// liquid colour from the bottom, with a live wavy surface — like something
// being poured into it. Uses the logo as a CSS mask so the liquid takes the
// exact logo silhouette.

const STYLE_ID = 'phr-logo-loader-style'
function ensureStyle() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
    .phr-jar {
      position: absolute; inset: 0; overflow: hidden;
      -webkit-mask: url(/logo.png) center/contain no-repeat;
      mask: url(/logo.png) center/contain no-repeat;
    }
    .phr-water {
      position: absolute; left: 0; right: 0; bottom: 0; height: 8%;
      background: linear-gradient(180deg, #e6c476 0%, #c9a24b 48%, #17406f 100%);
      animation: phr-fill 2.9s cubic-bezier(.45,0,.25,1) infinite alternate;
    }
    .phr-water::before, .phr-water::after {
      content: ""; position: absolute; left: 50%; top: 0;
      width: 200%; height: 200%; transform: translate(-50%, -75%);
    }
    .phr-water::before { background: #c9a24b; border-radius: 41%; animation: phr-swirl 6s linear infinite; }
    .phr-water::after  { background: rgba(230,196,118,.55); border-radius: 46%; animation: phr-swirl 10s linear infinite reverse; }
    @keyframes phr-fill { 0% { height: 8%; } 100% { height: 100%; } }
    @keyframes phr-swirl { to { transform: translate(-50%, -75%) rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .phr-water { animation: none; height: 100%; }
      .phr-water::before, .phr-water::after { animation: none; }
    }
  `
  document.head.appendChild(el)
}

export function LogoLoader({ size = 64, label }: { size?: number; label?: string }) {
  ensureStyle()
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center" role="status" aria-label={label ?? 'loading'}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* faint logo so the empty (unfilled) part is still visible */}
        <img src="/logo.png" alt="" className="absolute inset-0 h-full w-full object-contain opacity-[0.12] grayscale" />
        <div className="phr-jar">
          <div className="phr-water" />
        </div>
      </div>
      {label && <div className="text-[13px] text-muted">{label}</div>}
    </div>
  )
}

/** Full-viewport branded loader for app-level waits (auth bootstrapping). */
export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <LogoLoader size={92} />
    </div>
  )
}
