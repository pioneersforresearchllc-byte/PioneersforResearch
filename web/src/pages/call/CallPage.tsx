import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DailyIframe, { type DailyCall } from '@daily-co/daily-js'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { getCallToken } from '@/lib/serviceWorkspace'
import { getGroupCallToken, getWorkshop, type GroupSession } from '@/lib/groupSessions'
import { Spinner } from '@/components/LoadingState'

/**
 * In-app live video. Two modes:
 *  - service (default): 1:1 service session, auto-joins on open.
 *  - group: a public workshop. Shows a branded "lobby" card first (so the
 *    Pioneers name lands before the call), then joins a knocking-enabled room
 *    where non-hosts wait until the host admits them.
 */
export function CallPage({ kind = 'service' }: { kind?: 'service' | 'group' }) {
  const { sessionId } = useParams()
  const { profile, session } = useAuth()
  const { t, dir } = useLanguage()
  const navigate = useNavigate()

  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<DailyCall | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'joined' | 'error'>(kind === 'group' ? 'idle' : 'loading')
  const [error, setError] = useState('')
  const [awayCover, setAwayCover] = useState(false)
  const [started, setStarted] = useState(kind !== 'group')
  const [workshop, setWorkshop] = useState<GroupSession | null>(null)

  const watermark = `${profile?.name ?? ''} · ${session?.user.email ?? ''}`.trim()

  // Group lobby: load the workshop so the branded card can show its title.
  useEffect(() => {
    if (kind !== 'group' || !sessionId) return
    getWorkshop(sessionId)
      .then(setWorkshop)
      .catch(() => {})
  }, [kind, sessionId])

  useEffect(() => {
    if (!sessionId || !started) return
    let cancelled = false
    let frame: DailyCall | null = null
    let joined = false

    ;(async () => {
      try {
        const res = kind === 'group' ? await getGroupCallToken(sessionId) : await getCallToken(sessionId)
        const { roomUrl, token } = res
        if (cancelled || !containerRef.current) return
        frame = DailyIframe.createFrame(containerRef.current, {
          showLeaveButton: true,
          showFullscreenButton: true,
          iframeStyle: { width: '100%', height: '100%', border: '0' },
        })
        frameRef.current = frame
        frame.on('joined-meeting', () => {
          joined = true
        })
        // Only auto-return when the user actually leaves a joined call — never
        // on a failed join (otherwise the error flashes and the page "closes").
        frame.on('left-meeting', () => {
          if (joined) navigate(-1)
        })
        frame.on('error', (e) => {
          console.error('[call] daily error', e)
          const ee = e as { errorMsg?: string; error?: { msg?: string } }
          setError(ee?.errorMsg || ee?.error?.msg || JSON.stringify(e))
          setStatus('error')
        })
        // Reveal Daily's own UI immediately (device screen, knocking / waiting
        // screen, connecting spinner) — our overlay must not cover it.
        setStatus('joined')
        await frame.join({ url: roomUrl, token })
      } catch (e) {
        if (cancelled) return
        console.error('[call] join failed', e)
        const ee = e as { errorMsg?: string; message?: string }
        setError(e instanceof Error ? e.message : ee?.errorMsg || ee?.message || JSON.stringify(e))
        setStatus('error')
      }
    })()

    return () => {
      cancelled = true
      try {
        frame?.destroy()
      } catch {
        // ignore
      }
      frameRef.current = null
    }
  }, [sessionId, navigate, started, kind])

  // Deterrent: cover the call with a black screen only while this tab is truly
  // hidden (switched away / minimized). We deliberately do NOT use window blur
  // — clicking inside the video iframe or DevTools blurs the window and would
  // wrongly hide the call.
  useEffect(() => {
    const onVis = () => setAwayCover(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const wmSvg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='170'><text x='10' y='90' fill='rgba(255,255,255,0.09)' font-size='14' font-family='sans-serif' transform='rotate(-22 170 85)'>${watermark.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`,
  )

  const headerTitle = kind === 'group' ? workshop?.title || t('call.workshop') : t('call.title')

  return (
    <div dir={dir} className="fixed inset-0 flex flex-col bg-[#0a1626]">
      {/* Branded header — keeps the Pioneers name in front of attendees. */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 text-white">
        <button onClick={() => navigate(-1)} className="rounded-lg border border-white/25 px-3 py-1.5 text-[13px] hover:bg-white/10">
          {t('call.leave')}
        </button>
        <div className="flex min-w-0 items-center gap-2.5">
          <img src="/logo.png" alt="" className="h-7 w-7 shrink-0" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[13.5px] font-bold text-white">Pioneers Health Research</span>
            <span className="truncate text-[11px] text-white/60">{headerTitle}</span>
          </div>
        </div>
        <span className="w-16" />
      </div>

      <div className="relative flex-1">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Identity watermark tiled over the whole call */}
        {status === 'joined' && watermark && (
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{ backgroundImage: `url("data:image/svg+xml,${wmSvg}")`, backgroundRepeat: 'repeat' }}
            aria-hidden
          />
        )}

        {/* Group lobby — branded card shown before joining. */}
        {kind === 'group' && status === 'idle' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-b from-[#0a1626] to-[#0f2547] px-6">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-7 text-center text-white shadow-2xl backdrop-blur">
              <img src="/logo.png" alt="" className="mx-auto mb-3 h-16 w-16" />
              <div className="font-heading text-[17px] font-bold">Pioneers Health Research</div>
              <div className="mt-0.5 text-[12.5px] text-white/60">بايونيرز للأبحاث الصحية</div>
              <div className="my-4 h-px bg-white/10" />
              <div className="text-[11px] uppercase tracking-wide text-white/45">{t('call.workshop')}</div>
              <div className="mt-1 text-[15px] font-semibold">{workshop?.title || '…'}</div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/60">{t('call.lobbyNote')}</p>
              <button
                onClick={() => {
                  setStatus('loading')
                  setStarted(true)
                }}
                className="btn-sheen mt-5 w-full rounded-xl bg-[#1aa851] py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#158f45] active:scale-[0.98]"
              >
                {t('call.enterWorkshop')}
              </button>
              <div className="mt-2.5 text-[11px] text-white/40">{t('call.identityNote')}</div>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#0a1626] text-white">
            <Spinner className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <div className="text-[13.5px] text-white/80">{t('call.connecting')}</div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#0a1626] px-6 text-center text-white">
            <div className="text-[15px] font-semibold">
              {error === 'video not configured'
                ? t('call.notConfigured')
                : error === 'not allowed'
                  ? t('call.notAllowed')
                  : t('call.failed')}
            </div>
            {error && error !== 'video not configured' && error !== 'not allowed' && (
              <div className="max-w-md break-words text-[12px] text-white/45" dir="ltr">
                {error}
              </div>
            )}
            <button onClick={() => navigate(-1)} className="rounded-lg bg-white/15 px-5 py-2.5 text-[13.5px] font-semibold hover:bg-white/25">
              {t('call.back')}
            </button>
          </div>
        )}

        {/* Away cover — hides the video when the user switches away */}
        {awayCover && status === 'joined' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black text-center text-[14px] text-white/80">
            {t('call.paused')}
          </div>
        )}
      </div>
    </div>
  )
}
