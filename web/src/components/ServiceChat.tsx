import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listServiceMessages, sendServiceMessage, subscribeServiceMessages, type ServiceMessage } from '@/lib/serviceWorkspace'
import { triggerPush } from '@/lib/push'

function fmtWhen(iso: string, locale: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
}

/** The private thread between the assigned teacher and the student, scoped to
 * one service request. Reused on both sides (student & teacher/owner). */
export function ServiceChat({ requestId }: { requestId: string }) {
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const locale = lang === 'ar' ? 'ar' : 'en-US'
  const qc = useQueryClient()
  const myId = profile?.id
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: messages, isLoading } = useQuery({
    queryKey: ['svc-chat', requestId],
    queryFn: () => listServiceMessages(requestId),
  })

  useEffect(() => {
    const unsub = subscribeServiceMessages(requestId, () => qc.invalidateQueries({ queryKey: ['svc-chat', requestId] }))
    return unsub
  }, [requestId, qc])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const send = useMutation({
    mutationFn: () => sendServiceMessage({ request_id: requestId, sender_id: myId!, text }),
    onSuccess: () => {
      triggerPush('service_chat', requestId)
      setText('')
      qc.invalidateQueries({ queryKey: ['svc-chat', requestId] })
    },
  })

  const submit = () => {
    if (text.trim() && myId) send.mutate()
  }

  const list = messages ?? []

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex items-center gap-2 border-b border-border-2 px-4 py-2.5">
        <span className="text-[14px] font-bold text-navy">💬 {t('workspace.chat')}</span>
        <span className="text-[11.5px] text-faint">{t('workspace.chatHint')}</span>
      </div>

      <div ref={scrollRef} className="flex max-h-80 min-h-[9rem] flex-col gap-2 overflow-y-auto px-3.5 py-3">
        {isLoading && <div className="text-[13px] text-muted">…</div>}
        {!isLoading && list.length === 0 && (
          <div className="my-auto text-center text-[12.5px] text-faint">{t('workspace.chatEmpty')}</div>
        )}
        {list.map((m: ServiceMessage) => {
          const mine = m.sender_id === myId
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[13px] leading-6 ${
                  mine ? 'rounded-br-sm bg-navy text-white' : 'rounded-bl-sm bg-bg-soft text-navy'
                }`}
              >
                {!mine && m.sender?.name && (
                  <div className="mb-0.5 text-[11px] font-bold text-accent">{m.sender.name}</div>
                )}
                {m.text}
              </div>
              <span className="mt-0.5 px-1 text-[10.5px] text-faint">{fmtWhen(m.created_at, locale)}</span>
            </div>
          )
        })}
      </div>

      <div className="flex items-end gap-2 border-t border-border-2 p-2.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          rows={1}
          placeholder={t('workspace.chatPlaceholder')}
          className="max-h-28 flex-1 resize-none rounded-lg border border-border bg-white px-3 py-2 text-[13px] outline-none focus:border-navy"
        />
        <button
          onClick={submit}
          disabled={!text.trim() || send.isPending}
          className="shrink-0 rounded-lg bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {t('workspace.chatSend')}
        </button>
      </div>
    </div>
  )
}
