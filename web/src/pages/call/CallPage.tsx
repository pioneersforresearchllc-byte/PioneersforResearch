import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DailyIframe, { type DailyCall } from '@daily-co/daily-js'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { getCallToken } from '@/lib/serviceWorkspace'
import { Spinner } from '@/components/LoadingState'

export function CallPage() {
  const { sessionId } = useParams()
  const { profile, session } = useAuth()
  const { t, dir } = useLanguage()
  const navigate = useNavigate()

  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<DailyCall | null>(null)
  const [status, setStatus] = useState<'loading' | 'joined' | 'error'>('loading')
  const [error, setError] = useState('')
  const [awayCover, setAwayCover] = useState(false)

  const watermark = `${profile?.name ?? ''} · ${session?.user.email ?? ''}`.trim()

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    let frame: DailyCall | null = null
    let joined = false

    ;(async () => {
      try {
        const { roomUrl, token } = await getCallToken(sessionId)
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
        // Reveal Daily's own UI immediately (it shows its device / join screen
        // and its own connecting spinner) — our overlay must not cover it.
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
  }, [sessionId, navigate])

  // Deterrent: cover the call with a black screen while this tab is hidden /
  // unfocused (e.g. when a screen-recorder or another window is brought up).
  useEffect(() => {
    const onVis = () => setAwayCover(document.hidden)
    const onBlur = () => setAwayCover(true)
    const onFocus = () => setAwayCover(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const wmSvg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='170'><text x='10' y='90' fill='rgba(255,255,255,0.09)' font-size='14' font-family='sans-serif' transform='rotate(-22 170 85)'>${watermark.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`,
  )

  return (
    <div dir={dir} className="fixed inset-0 flex flex-col bg-[#0a1626]">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-white">
        <button onClick={() => navigate(-1)} className="rounded-lg border border-white/25 px-3 py-1.5 text-[13px] hover:bg-white/10">
          {t('call.leave')}
        </button>
        <span className="truncate text-[13.5px] font-semibold text-white/90">{t('call.title')}</span>
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

        {status === 'loading' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#0a1626] text-white">
            <Spinner className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <div className="text-[13.5px] text-white/80">{t('call.connecting')}</div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#0a1626] px-6 text-center text-white">
            <div className="text-[15px] font-semibold">{error === 'video not configured' ? t('call.notConfigured') : error === 'not allowed' ? t('call.notAllowed') : t('call.failed')}</div>
            {error && error !== 'video not configured' && error !== 'not allowed' && (
              <div className="max-w-md break-words text-[12px] text-white/45" dir="ltr">{error}</div>
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
