import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import {
  deleteServiceMessage,
  editServiceMessage,
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
        {list.map((m: ServiceMessage) => (
          <Bubble
            key={m.id}
            m={m}
            mine={m.sender_id === myId}
            locale={locale}
            t={t}
            onChanged={() => qc.invalidateQueries({ queryKey: ['svc-chat', requestId] })}
          />
        ))}
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

function Bubble({
  m,
  mine,
  locale,
  t,
  onChanged,
}: {
  m: ServiceMessage
  mine: boolean
  locale: string
  t: ReturnType<typeof useLanguage>['t']
  onChanged: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(m.text ?? '')
  const [confirmDel, setConfirmDel] = useState(false)

  const save = useMutation({
    mutationFn: () => editServiceMessage(m.id, draft),
    onSuccess: () => {
      setEditing(false)
      onChanged()
    },
  })
  const del = useMutation({
    mutationFn: () => deleteServiceMessage(m.id),
    onSuccess: () => {
      setConfirmDel(false)
      setMenuOpen(false)
      onChanged()
    },
  })

  return (
    <div className={`group flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-1.5">
        {mine && !editing && (
          <div className="relative self-center opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={() => setMenuOpen((v) => !v)} className="rounded-full border border-border-2 bg-white px-1.5 text-[13px] leading-none text-muted hover:text-navy" aria-label="⋯">
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute end-0 z-10 mt-1 flex min-w-[110px] flex-col overflow-hidden rounded-lg border border-border bg-white text-[12px] shadow-[0_10px_28px_-10px_rgba(11,31,58,0.4)]">
                {!confirmDel ? (
                  <>
                    {m.text && (
                      <button onClick={() => { setEditing(true); setDraft(m.text ?? ''); setMenuOpen(false) }} className="px-3 py-1.5 text-start text-navy hover:bg-bg-soft">
                        {t('workspace.edit')}
                      </button>
                    )}
                    <button onClick={() => setConfirmDel(true)} className="px-3 py-1.5 text-start text-error hover:bg-error/5">
                      {t('workspace.delete')}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => del.mutate()} disabled={del.isPending} className="px-3 py-1.5 text-start font-semibold text-error hover:bg-error/5">
                      {t('workspace.confirmDelete')}
                    </button>
                    <button onClick={() => setConfirmDel(false)} className="px-3 py-1.5 text-start text-muted hover:bg-bg-soft">
                      {t('workspace.cancel')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        <div className={`flex max-w-[82%] flex-col gap-1.5 rounded-2xl px-3.5 py-2 text-[13px] leading-6 ${mine ? 'rounded-br-sm bg-navy text-white' : 'rounded-bl-sm bg-bg-soft text-navy'}`}>
          {!mine && m.sender?.name && <div className="text-[11px] font-bold text-accent">{m.sender.name}</div>}
          {editing ? (
            <div className="flex flex-col gap-1.5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                autoFocus
                className="w-56 max-w-full resize-none rounded-md border border-white/30 bg-white/10 px-2 py-1 text-[13px] text-white outline-none"
              />
              <div className="flex justify-end gap-2.5 text-[11.5px]">
                <button onClick={() => setEditing(false)} className="opacity-80 hover:opacity-100">{t('workspace.cancel')}</button>
                <button onClick={() => draft.trim() && save.mutate()} disabled={save.isPending} className="font-semibold">{t('workspace.save')}</button>
              </div>
            </div>
          ) : (
            <>
              {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
              {m.attachment_url && (
                <div className={mine ? 'rounded-lg bg-white/10 p-1' : ''}>
                  <ServiceAttachmentView path={m.attachment_url} name={m.attachment_name} kind={m.attachment_kind} compact />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <span className="mt-0.5 px-1 text-[10.5px] text-faint">{fmtWhen(m.created_at, locale)}</span>
    </div>
  )
}
