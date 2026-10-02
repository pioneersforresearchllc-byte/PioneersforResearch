import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { listContactMessages, markContactMessageRead } from '@/lib/owner'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'

/** Pull a phone number out of a message (quote requests include one) for a WhatsApp reply. */
function findPhone(text: string): string | null {
  const m = text.match(/(?:\+?966|0)5\d{8}|\+?\d{10,14}/)
  if (!m) return null
  let d = m[0].replace(/\D/g, '').replace(/^00/, '')
  if (/^05\d{8}$/.test(d)) d = '966' + d.slice(1)
  return d
}

export function OwnerContactPage() {
  const { t, lang } = useLanguage()
  const ar = lang === 'ar'
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['contact-messages'], queryFn: listContactMessages })
  const [filter, setFilter] = useState<'unread' | 'quotes' | 'all'>('unread')
  const [q, setQ] = useState('')

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['contact-messages'] })
    void queryClient.invalidateQueries({ queryKey: ['owner-attention'] })
  }
  const markRead = async (id: string) => {
    await markContactMessageRead(id)
    refresh()
  }
  const markAll = async () => {
    await Promise.all((data ?? []).filter((m) => !m.read).map((m) => markContactMessageRead(m.id)))
    refresh()
  }

  const isQuote = (msg: string) => msg.startsWith('طلب عرض سعر') || msg.startsWith('Quote request')
  const all = data ?? []
  const unreadCount = all.filter((m) => !m.read).length
  const shown = all
    .filter((m) => (filter === 'unread' ? !m.read : filter === 'quotes' ? isQuote(m.message) : true))
    .filter((m) => !q.trim() || `${m.name} ${m.email} ${m.message}`.toLowerCase().includes(q.trim().toLowerCase()))

  const tabBtn = (key: typeof filter, label: string, n?: number) => (
    <button
      type="button"
      onClick={() => setFilter(key)}
      className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${filter === key ? 'bg-navy text-white' : 'bg-white text-navy ring-1 ring-border'}`}
    >
      {label}
      {n ? ` (${n})` : ''}
    </button>
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="font-heading text-xl font-bold text-navy">{t('oContact.title')}</div>
        {unreadCount > 0 && (
          <button type="button" onClick={() => void markAll()} className="rounded-lg border border-navy px-3.5 py-1.5 text-[12.5px] text-navy hover:bg-white">
            {ar ? 'تعليم الكل كمقروء' : 'Mark all as read'}
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabBtn('unread', ar ? 'غير مقروءة' : 'Unread', unreadCount)}
        {tabBtn('quotes', ar ? 'طلبات عروض الأسعار' : 'Quote requests')}
        {tabBtn('all', ar ? 'الكل' : 'All', all.length)}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ar ? 'بحث بالاسم أو البريد أو النص…' : 'Search name, email or text…'}
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-white px-3.5 py-2 text-[13px]"
        />
      </div>

      {isLoading && <LoadingState />}
      {data && shown.length === 0 && <EmptyState title={filter === 'unread' ? (ar ? 'لا توجد رسائل غير مقروءة 🎉' : 'No unread messages 🎉') : t('oContact.none')} />}

      <div className="flex flex-col gap-2.5">
        {shown.map((m) => {
          const phone = findPhone(m.message)
          const quote = isQuote(m.message)
          return (
            <div key={m.id} className={`rounded-xl border p-4 ${m.read ? 'border-border bg-white' : 'border-navy/40 bg-white shadow-[0_6px_18px_-12px_rgba(11,31,58,0.5)]'}`}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {!m.read && <span className="h-2 w-2 rounded-full bg-error" aria-hidden="true" />}
                  <span className="text-[14px] font-semibold text-navy">{m.name}</span>
                  {quote && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-accent">{ar ? 'عرض سعر' : 'Quote'}</span>}
                </div>
                <span className="text-[12px] text-faint">
                  {m.email} · {new Date(m.created_at).toLocaleString(ar ? 'ar' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <p className="mb-3 whitespace-pre-line text-[13.5px] leading-7 text-muted-2">{m.message}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:${m.email}?subject=${encodeURIComponent(ar ? 'رد: رسالتك إلى الرواد للبحوث الصحية' : 'Re: your message to Pioneers Health Research')}`}
                  className="rounded-lg bg-navy px-3.5 py-1.5 text-[12.5px] font-semibold text-white no-underline"
                >
                  {ar ? 'رد بالبريد' : 'Reply by email'}
                </a>
                {phone && (
                  <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="rounded-lg bg-[#1fa855] px-3.5 py-1.5 text-[12.5px] font-semibold text-white no-underline">
                    {ar ? 'رد واتساب' : 'Reply on WhatsApp'}
                  </a>
                )}
                {!m.read && (
                  <button onClick={() => void markRead(m.id)} className="rounded-lg border border-navy px-3.5 py-1.5 text-[12.5px] text-navy hover:bg-bg-soft">
                    {t('oContact.markRead')}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
