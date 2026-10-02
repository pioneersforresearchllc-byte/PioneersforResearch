import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { enablePush, getPushState } from '@/lib/push'

const DISMISS_KEY = 'pioneers.pushPromptDismissed'

/**
 * Dashboard banner inviting the user to turn on notifications on this device.
 * Shown only when the browser supports push, permission hasn't been decided
 * yet, and the user hasn't dismissed it. (iPhone: only after "Add to Home Screen".)
 */
export function PushPrompt() {
  const { profile } = useAuth()
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    let dismissed = false
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      // storage blocked: just show it
    }
    if (dismissed || !profile) return
    void getPushState().then((s) => setShow(s === 'default'))
  }, [profile])

  if (!show || !profile) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore
    }
    setShow(false)
  }

  const enable = async () => {
    setBusy(true)
    try {
      const s = await enablePush(profile.id)
      if (s === 'subscribed') setShow(false)
      else if (s === 'denied') setDenied(true)
    } catch {
      setDenied(true)
    } finally {
      setBusy(false)
    }
  }

  const text =
    profile.role === 'owner'
      ? ar
        ? 'فعّل الإشعارات على هذا الجهاز لتصلك الطلبات والرسائل الجديدة فور وصولها.'
        : 'Turn on notifications on this device to get new requests and messages instantly.'
      : ar
        ? 'فعّل الإشعارات لتعرف فور تحديث طلبك أو وصول رسالة أو درجة جديدة.'
        : 'Turn on notifications to know as soon as your request updates or a new message or grade arrives.'

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-navy/15 bg-white px-4 py-3.5 shadow-[0_8px_24px_-16px_rgba(11,31,58,0.5)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[20px]">🔔</span>
      <div className="min-w-0 flex-1 text-[13.5px] leading-6 text-navy">
        {denied
          ? ar
            ? 'المتصفح منع الإشعارات. يمكنك السماح بها من إعدادات الموقع في المتصفح.'
            : 'Your browser blocked notifications. You can allow them in the browser’s site settings.'
          : text}
      </div>
      {!denied && (
        <button type="button" onClick={() => void enable()} disabled={busy} className="rounded-lg bg-navy px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
          {busy ? '...' : ar ? 'تفعيل الإشعارات' : 'Turn on'}
        </button>
      )}
      <button type="button" onClick={dismiss} className="rounded-lg px-3 py-2 text-[13px] text-muted hover:bg-bg-soft">
        {ar ? 'لاحقًا' : 'Later'}
      </button>
    </div>
  )
}
