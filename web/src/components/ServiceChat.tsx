import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import {
  listServiceMessages,
  sendServiceMessage,
  subscribeServiceMessages,
  uploadServiceAttachment,
  type ServiceMessage,
} from '@/lib/serviceWorkspace'
import { triggerPush } from '@/lib/push'
import { ServiceAttachmentView } from '@/components/ServiceAttachmentView'

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
  const [file, setFile] = useState<File | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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
    mutationFn: async () => {
      const attachment = file ? await uploadServiceAttachment(requestId, file, 'chat') : null
      await sendServiceMessage({ request_id: requestId, sender_id: myId!, text, attachment })
    },
    onSuccess: () => {
      triggerPush('service_chat', requestId)
      setText('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      qc.invalidateQueries({ queryKey: ['svc-chat', requestId] })
    },
  })

  const submit = () => {
    if ((text.trim() || file) && myId && !send.isPending) send.mutate()
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
                className={`flex max-w-[82%] flex-col gap-1.5 rounded-2xl px-3.5 py-2 text-[13px] leading-6 ${
                  mine ? 'rounded-br-sm bg-navy text-white' : 'rounded-bl-sm bg-bg-soft text-navy'
                }`}
              >
                {!mine && m.sender?.name && <div className="text-[11px] font-bold text-accent">{m.sender.name}</div>}
                {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                {m.attachment_url && (
                  <div className={mine ? 'rounded-lg bg-white/10 p-1' : ''}>
                    <ServiceAttachmentView path={m.attachment_url} name={m.attachment_name} kind={m.attachment_kind} compact />
                  </div>
                )}
              </div>
              <span className="mt-0.5 px-1 text-[10.5px] text-faint">{fmtWhen(m.created_at, locale)}</span>
            </div>
          )
        })}
      </div>

      {file && (
        <div className="mx-2.5 flex items-center gap-2 rounded-lg border border-border-2 bg-bg-soft px-3 py-1.5 text-[12px] text-navy">
          <span aria-hidden>📎</span>
          <span className="flex-1 truncate">{file.name}</span>
          <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }} className="text-faint hover:text-error" aria-label={t('workspace.cancel')}>
            ✕
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-border-2 p-2.5">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-[16px] text-muted hover:border-navy hover:text-navy"
          aria-label={t('workspace.attach')}
          title={t('workspace.attach')}
        >
          📎
        </button>
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
          disabled={(!text.trim() && !file) || send.isPending}
          className="shrink-0 rounded-lg bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {send.isPending ? '…' : t('workspace.chatSend')}
        </button>
      </div>
    </div>
  )
}
