import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type AppNotification,
} from '@/lib/notifications'

function relTime(iso: string, lang: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (lang === 'ar') {
    if (m < 1) return 'الآن'
    if (m < 60) return `قبل ${m} د`
    if (h < 24) return `قبل ${h} س`
    return `قبل ${d} يوم`
  }
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

export function NotificationBell() {
  const { profile } = useAuth()
  const { t, lang, dir } = useLanguage()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const { data: items } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: () => listNotifications(20),
    enabled: !!profile?.id,
    refetchInterval: 60000,
  })

  useEffect(() => {
    if (!profile?.id) return
    return subscribeToNotifications(profile.id, () => qc.invalidateQueries({ queryKey: ['notifications', profile.id] }))
  }, [profile?.id, qc])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const list = items ?? []
  const unread = list.filter((n) => !n.read).length

  const openItem = async (n: AppNotification) => {
    setOpen(false)
    if (!n.read) {
      await markNotificationRead(n.id)
      qc.invalidateQueries({ queryKey: ['notifications', profile?.id] })
    }
    if (n.url) navigate(n.url)
  }

  const markAll = async () => {
    await markAllNotificationsRead()
    qc.invalidateQueries({ queryKey: ['notifications', profile?.id] })
  }

  if (!profile) return null

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('notifBell.title')}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-navy hover:border-navy"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -end-1 -top-1 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          dir={dir}
          className="absolute end-0 z-30 mt-2 w-[300px] max-w-[86vw] overflow-hidden rounded-xl border border-border bg-white shadow-[0_16px_40px_-12px_rgba(11,31,58,0.35)]"
        >
          <div className="flex items-center justify-between border-b border-border-2 px-3.5 py-2.5">
            <span className="text-[13.5px] font-bold text-navy">{t('notifBell.title')}</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-[11.5px] font-semibold text-accent hover:underline">
                {t('notifBell.markAll')}
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {list.length === 0 && <div className="px-4 py-8 text-center text-[12.5px] text-faint">{t('notifBell.empty')}</div>}
            {list.map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={`flex w-full flex-col gap-0.5 border-b border-border-2 px-3.5 py-2.5 text-start transition-colors hover:bg-bg-soft ${n.read ? '' : 'bg-accent/[0.04]'}`}
              >
                <div className="flex items-center gap-2">
                  {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  <span className="flex-1 text-[12.5px] font-bold text-navy">{n.title}</span>
                  <span className="shrink-0 text-[10.5px] text-faint">{relTime(n.created_at, lang)}</span>
                </div>
                {n.body && <span className="ps-3.5 text-[12px] leading-5 text-muted">{n.body}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
