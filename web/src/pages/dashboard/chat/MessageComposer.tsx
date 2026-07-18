import { useRef, useState } from 'react'
import type { Message } from '@/types/chat'
import { PaperclipIcon, SendIcon, XIcon } from '@/pages/dashboard/chat/Icons'
import { sendMessage, uploadChatAttachment } from '@/lib/chat'
import { useLanguage } from '@/lib/i18n'

interface MessageComposerProps {
  conversationId: string
  myUserId: string
  replyTo: Message | null
  onCancelReply: () => void
  onSent: () => void
}

export function MessageComposer({ conversationId, myUserId, replyTo, onCancelReply, onSent }: MessageComposerProps) {
  const { t } = useLanguage()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = async () => {
    if (busy) return
    if (!text.trim() && !file) return
    setBusy(true)
    try {
      const attachment = file ? await uploadChatAttachment(conversationId, file) : null
      await sendMessage({
        conversationId,
        senderId: myUserId,
        text,
        attachment,
        replyToMessageId: replyTo?.id ?? null,
      })
      setText('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onCancelReply()
      onSent()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t border-border bg-white p-3">
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-bg-soft px-3 py-2 text-[12.5px]">
          <div className="min-w-0">
            <div className="font-semibold text-navy">{t('chat.replyingTo', { name: replyTo.sender?.name ?? '' })}</div>
            <div className="truncate text-muted">{replyTo.deleted ? t('chat.deletedMessage') : (replyTo.text ?? t('chat.attachment'))}</div>
          </div>
          <button onClick={onCancelReply} className="shrink-0 p-1 text-muted hover:text-navy">
            <XIcon />
          </button>
        </div>
      )}
      {file && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-bg-soft px-3 py-2 text-[12.5px]">
          <span className="truncate text-navy">{file.name}</span>
          <button onClick={() => setFile(null)} className="shrink-0 p-1 text-muted hover:text-navy">
            <XIcon />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*,.pdf,.doc,.docx,.zip,.xlsx,.pptx"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-full border border-border p-2.5 text-muted hover:text-navy"
          title={t('chat.attachFile')}
        >
          <PaperclipIcon />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
          placeholder={t('chat.typeMessage')}
          rows={1}
          className="max-h-28 flex-1 resize-none rounded-2xl border border-border px-4 py-2.5 text-[14px]"
        />
        <button
          onClick={() => void handleSend()}
          disabled={busy || (!text.trim() && !file)}
          className="shrink-0 rounded-full bg-navy p-3 text-white hover:bg-navy-hover disabled:opacity-40"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  )
}
