import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n'

// `beforeinstallprompt` isn't in the standard DOM lib types.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'ios' | 'android' | 'windows' | 'other'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  // iPadOS 13+ reports as MacIntel with a touch screen.
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  if (/windows/i.test(ua)) return 'windows'
  return 'other'
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const displayStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true
  return displayStandalone || iosStandalone
}

/** "Install app" button for the home page. On Chrome/Edge (Android + Windows)
 * it fires the browser's native install prompt; everywhere else (notably iOS
 * Safari, which has no prompt API) it opens step-by-step instructions. Renders
 * nothing once the app is already installed / running standalone. */
export function InstallAppButton({ className }: { className?: string }) {
  const { t } = useLanguage()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [platform] = useState<Platform>(detectPlatform)

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true)
      return
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setShowHelp(false)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferred(null)
    } else {
      setShowHelp(true)
    }
  }

  return (
    <>
      <button
        onClick={() => void onClick()}
        className={
          className ??
          'rounded-md bg-gold px-7.5 py-3.5 text-[15px] font-medium text-white no-underline hover:bg-gold-hover'
        }
      >
        ⬇ {t('install.button')}
      </button>
      {showHelp && <InstallHelpModal platform={platform} onClose={() => setShowHelp(false)} />}
    </>
  )
}

function InstallHelpModal({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  const { t } = useLanguage()

  const order: Platform[] = platform === 'other' ? ['android', 'ios', 'windows'] : [platform]
  for (const p of ['ios', 'android', 'windows'] as Platform[]) if (!order.includes(p)) order.push(p)

  const sections: Record<Exclude<Platform, 'other'>, { title: string; steps: string[] }> = {
    ios: {
      title: t('install.ios.title'),
      steps: [t('install.ios.s1'), t('install.ios.s2'), t('install.ios.s3')],
    },
    android: {
      title: t('install.android.title'),
      steps: [t('install.android.s1'), t('install.android.s2'), t('install.android.s3')],
    },
    windows: {
      title: t('install.windows.title'),
      steps: [t('install.windows.s1'), t('install.windows.s2')],
    },
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 font-heading text-lg font-bold text-navy">{t('install.title')}</div>
        <p className="mb-5 text-[13px] leading-6 text-muted">{t('install.intro')}</p>

        <div className="flex flex-col gap-4">
          {order.map((p, idx) => {
            const s = sections[p as Exclude<Platform, 'other'>]
            const highlight = idx === 0 && platform !== 'other'
            return (
              <div
                key={p}
                className={`rounded-xl border p-4 ${highlight ? 'border-navy bg-bg-soft' : 'border-border bg-white'}`}
              >
                <div className="mb-2.5 text-[13.5px] font-semibold text-navy">{s.title}</div>
                <ol className="flex flex-col gap-2">
                  {s.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] leading-6 text-muted-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-navy py-2.5 text-[13px] font-semibold text-white hover:bg-navy-hover"
        >
          {t('install.close')}
        </button>
      </div>
    </div>
  )
}
