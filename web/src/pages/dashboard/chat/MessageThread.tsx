import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Message } from '@/types/chat'
import { Avatar } from '@/pages/dashboard/chat/Avatar'
import { FileIcon, MoreIcon, ReplyIcon } from '@/pages/dashboard/chat/Icons'
import { canDeleteMessage, canEditMessage, deleteMessage, editMessage, signChatAttachment } from '@/lib/chat'

// The AI bot suggests pages using markdown-link syntax, e.g.
// "...[إنشاء حساب طالب](/register)". Pull those out so they render as
// tappable chips instead of raw bracket syntax, and show the remaining
// text normally.
const PAGE_LINK_RE = /\[([^\]]+)\]\((\/[^\s)]*)\)/g

function extractPageLinks(text: string): { cleanText: string; links: { label: string; href: string }[] } {
  const links: { label: string; href: string }[] = []
  const cleanText = text.replace(PAGE_LINK_RE, (_match, label: string, href: string) => {
    links.push({ label, href })
    return ''
  })
  return { cleanText: cleanText.trim(), links }
}

function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    if (!path) {
      setUrl(null)
      return
    }
    signChatAttachment(path).then((u) => {
      if (active) setUrl(u)
    })
    return () => {
      active = false
    }
  }, [path])
  return url
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}

function Attachment({ m }: { m: Message }) {
  const url = useSignedUrl(m.attachment_url)
  if (!m.attachment_kind || !url) return null
  if (m.attachment_kind === 'image') {
    return <img src={url} alt={m.attachment_name ?? 'صورة'} className="mt-1.5 max-w-[220px] rounded-lg" />
  }
  if (m.attachment_kind === 'audio') {
    return <audio controls src={url} className="mt-1.5 max-w-[220px]" />
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-1.5 flex items-center gap-2 rounded-lg border border-border-2 bg-white px-3 py-2 text-[13px] text-navy no-underline"
    >
      <FileIcon />
      <span className="truncate">{m.attachment_name ?? 'ملف'}</span>
    </a>
  )
}

interface MessageBubbleProps {
  m: Message
  isMine: boolean
  showSender: boolean
  myUserId: string
  onReply: (m: Message) => void
  onChanged: () => void
}

function MessageBubble({ m, isMine, showSender, myUserId, onReply, onChanged }: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(m.text ?? '')

  if (m.deleted) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} px-2 py-0.5`}>
        <div className="max-w-[65%] rounded-2xl bg-[#eef1f5] px-4 py-2 text-[13px] italic text-muted">
          تم حذف هذه الرسالة
        </div>
      </div>
    )
  }

  const canEdit = isMine && canEditMessage(m, myUserId)
  const canDelete = isMine && canDeleteMessage(m, myUserId)

  const saveEdit = async () => {
    if (!draft.trim() || draft === m.text) {
      setEditing(false)
      return
    }
    await editMessage(m.id, draft)
    setEditing(false)
    onChanged()
  }

  return (
    <div className={`group flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-2 px-2 py-0.5`}>
      {!isMine && showSender && (
        <Avatar name={m.sender?.name ?? '?'} avatarUrl={m.sender?.avatar_url ?? null} size={28} userId={m.sender?.id} />
      )}
      {!isMine && !showSender && <div className="w-7 shrink-0" />}

      <div className="relative max-w-[65%]">
        {(canEdit || canDelete) && (
          <div className="absolute -top-2 left-0 hidden -translate-x-full gap-1 group-hover:flex">
            <button onClick={() => onReply(m)} className="rounded-full border border-border-2 bg-white p-1.5 text-muted hover:text-navy">
              <ReplyIcon />
            </button>
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="rounded-full border border-border-2 bg-white p-1.5 text-muted hover:text-navy">
                <MoreIcon />
              </button>
              {menuOpen && (
                <div className="absolute top-full z-10 mt-1 w-32 rounded-md border border-border bg-white py-1 shadow-lg">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setEditing(true)
                        setMenuOpen(false)
                      }}
                      className="block w-full px-3 py-1.5 text-right text-[13px] hover:bg-bg-soft"
                    >
                      تعديل
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={async () => {
                        setMenuOpen(false)
                        await deleteMessage(m.id)
                        onChanged()
                      }}
                      className="block w-full px-3 py-1.5 text-right text-[13px] text-error hover:bg-error-bg"
                    >
                      حذف
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {!isMine && (
          <button onClick={() => onReply(m)} className="absolute -top-2 -right-2 hidden rounded-full border border-border-2 bg-white p-1.5 text-muted hover:text-navy group-hover:flex">
            <ReplyIcon />
          </button>
        )}

        {!isMine && showSender && <div className="mb-0.5 px-1 text-[12px] font-semibold text-muted">{m.sender?.name}</div>}

        <div
          className={`rounded-2xl px-4 py-2.5 text-[14px] ${
            isMine ? 'bg-navy text-white' : 'bg-[#eef1f5] text-navy'
          }`}
        >
          {m.replyTo && (
            <div
              className={`mb-1.5 rounded-lg border-r-2 px-2 py-1 text-[12px] ${
                isMine ? 'border-white/50 bg-white/10 text-white/80' : 'border-navy/30 bg-white/60 text-muted'
              }`}
            >
              <div className="font-semibold">{m.replyTo.sender?.name ?? ''}</div>
              <div className="truncate">{m.replyTo.deleted ? 'رسالة محذوفة' : (m.replyTo.text ?? 'مرفق')}</div>
            </div>
          )}

          {editing ? (
            <div className="flex flex-col gap-1.5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-w-[180px] rounded-md border border-white/30 bg-white/10 p-2 text-[13.5px] text-inherit"
                rows={2}
              />
              <div className="flex justify-end gap-2 text-[12px]">
                <button onClick={() => setEditing(false)} className="opacity-80">
                  إلغاء
                </button>
                <button onClick={() => void saveEdit()} className="font-semibold">
                  حفظ
                </button>
              </div>
            </div>
          ) : (
            <>
              {m.text &&
                (() => {
                  const { cleanText, links } = extractPageLinks(m.text)
                  return (
                    <>
                      {cleanText && <div className="whitespace-pre-wrap break-words">{cleanText}</div>}
                      {links.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {links.map((link, i) => (
                            <Link
                              key={i}
                              to={link.href}
                              className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium no-underline ${
                                isMine
                                  ? 'border-white/40 bg-white/10 text-white hover:bg-white/20'
                                  : 'border-navy/25 bg-white text-navy hover:bg-bg-soft'
                              }`}
                            >
                              {link.label} ←
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              <Attachment m={m} />
            </>
          )}
        </div>
        <div className={`mt-0.5 flex gap-1 px-1 text-[11px] text-faint ${isMine ? 'justify-end' : 'justify-start'}`}>
          {m.edited && <span>معدّلة ·</span>}
          <span>{formatTime(m.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

interface MessageThreadProps {
  messages: Message[]
  myUserId: string
  isGroup: boolean
  onReply: (m: Message) => void
  onChanged: () => void
}

export function MessageThread({ messages, myUserId, isGroup, onReply, onChanged }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  return (
    <div className="flex-1 overflow-y-auto py-3">
      {messages.map((m, i) => {
        const prev = messages[i - 1]
        const showSender = isGroup && (!prev || prev.sender_id !== m.sender_id)
        return (
          <MessageBubble
            key={m.id}
            m={m}
            isMine={m.sender_id === myUserId}
            showSender={showSender}
            myUserId={myUserId}
            onReply={onReply}
            onChanged={onChanged}
          />
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
