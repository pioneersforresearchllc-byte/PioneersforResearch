import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSiteContent } from '@/lib/content'
import { useLanguage } from '@/lib/i18n'

// A slim announcement strip the owner controls from the admin (Home content →
// Announcement). It sits at the very top, scrolls away with the page, and is
// dismissed once per visitor per content version — never nagging.
function hashString(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return String(h)
}

export function AnnouncementPopup() {
  const { lang, dir } = useLanguage()
  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const [dismissed, setDismissed] = useState(false)

  const enabled = !!content?.['announce.enabled']?.en?.trim()
  const title = (lang === 'ar' ? content?.['announce.title']?.ar : content?.['announce.title']?.en) ?? ''
  const body = (lang === 'ar' ? content?.['announce.body']?.ar : content?.['announce.body']?.en) ?? ''
  const key = `pfr-announce-seen-${hashString(`${title}|${body}`)}`

  useEffect(() => {
    try {
      if (localStorage.getItem(key) === '1') setDismissed(true)
    } catch {
      // storage blocked — just show it
    }
  }, [key])

  if (!enabled || (!title.trim() && !body.trim()) || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(key, '1')
    } catch {
      // ignore
    }
  }

  return (
    <div dir={dir} className="relative bg-navy text-white">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-light via-gold to-gold-light" />
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-11 py-2 text-center">
        {title.trim() && <span className="shrink-0 text-[12.5px] font-bold text-gold-light md:text-[13px]">{title}</span>}
        {body.trim() && <span className="truncate text-[12px] text-white/85 md:text-[12.5px]">— {body}</span>}
      </div>
      <button
        onClick={dismiss}
        aria-label="Close"
        className="absolute end-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[13px] text-white/70 hover:bg-white/10 hover:text-white"
      >
        ✕
      </button>
    </div>
  )
}
