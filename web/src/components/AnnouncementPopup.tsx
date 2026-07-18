import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSiteContent } from '@/lib/content'
import { useLanguage } from '@/lib/i18n'

// A small, dismissible announcement bubble the owner controls from the admin
// (Home content → Announcement). It appears once per visitor per content
// version — editing the announcement makes it show again — so it's never
// nagging.
function hashString(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return String(h)
}

export function AnnouncementPopup() {
  const { lang, dir } = useLanguage()
  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const [visible, setVisible] = useState(false)

  const enabled = !!content?.['announce.enabled']?.en?.trim()
  const title = (lang === 'ar' ? content?.['announce.title']?.ar : content?.['announce.title']?.en) ?? ''
  const body = (lang === 'ar' ? content?.['announce.body']?.ar : content?.['announce.body']?.en) ?? ''
  const key = `pfr-announce-seen-${hashString(`${title}|${body}`)}`

  useEffect(() => {
    if (!enabled || (!title.trim() && !body.trim())) return
    let seen = false
    try {
      seen = localStorage.getItem(key) === '1'
    } catch {
      seen = false
    }
    if (seen) return
    const timer = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(timer)
  }, [enabled, title, body, key])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(key, '1')
    } catch {
      // storage blocked — it'll just show again next visit
    }
  }

  if (!visible) return null

  return (
    <div dir={dir} className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0">
      <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-navy p-5 text-white shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-light via-gold to-gold-light" />
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute end-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
        >
          ✕
        </button>
        {title.trim() && <div className="font-heading mb-1.5 pe-8 text-[17px] font-bold text-gold-light">{title}</div>}
        {body.trim() && <div className="whitespace-pre-wrap text-[14px] leading-7 text-white/90">{body}</div>}
      </div>
    </div>
  )
}
