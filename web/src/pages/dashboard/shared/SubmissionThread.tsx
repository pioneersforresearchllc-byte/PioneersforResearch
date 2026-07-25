import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import {
  listSubmissionMessages,
  markSubmissionThreadSeen,
  sendSubmissionMessage,
  signSubmissionFile,
} from '@/lib/assignments'
import { SignedFileLink } from '@/components/SignedFileLink'
import { LoadingState } from '@/components/LoadingState'

/**
 * Back-and-forth discussion on a single submission. Either party (student or a
 * teacher of the course) can post text and/or a file; the other side sees an
 * unseen badge until they open it. Opening marks the caller's side seen.
 */
export function SubmissionThread({ submissionId, myUserId }: { submissionId: string; myUserId: string }) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: messages, isLoading } = useQuery({
    queryKey: ['submission-messages', submissionId],
    queryFn: () => listSubmissionMessages(submissionId),
  })

  // Opening the thread clears this side's unseen counter and refreshes badges.
  useEffect(() => {
    void markSubmissionThreadSeen(submissionId).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['student-unseen-subs'] })
      void queryClient.invalidateQueries({ queryKey: ['teacher-unseen-subs'] })
    })
  }, [submissionId, queryClient])

  const send = async () => {
    if ((!body.trim() && !file) || busy) return
    setBusy(true)
    try {
      await sendSubmissionMessage({ submissionId, senderId: myUserId, body: body.trim() || null, file })
      setBody('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await queryClient.invalidateQueries({ queryKey: ['submission-messages', submissionId] })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 text-[13.5px] font-semibold text-navy">{t('subThread.title')}</div>

      {isLoading ? (
        <LoadingState />
      ) : (messages ?? []).length === 0 ? (
        <div className="mb-3 rounded-lg bg-bg-soft/60 px-3 py-4 text-center text-[12.5px] text-muted">
          {t('subThread.empty')}
        </div>
      ) : (
        <div className="mb-3 flex max-h-80 flex-col gap-2.5 overflow-y-auto">
          {(messages ?? []).map((m) => {
            const mine = m.sender_id === myUserId
            return (
              <div key={m.id} className={`flex flex-col ${mine ? 'items-start' : 'items-end'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    mine ? 'bg-navy text-white' : 'bg-bg-soft text-navy'
                  }`}
                >
                  <div className={`mb-0.5 text-[11px] font-semibold ${mine ? 'text-gold' : 'text-muted'}`}>
                    {mine ? t('subThread.you') : m.senderName}
                  </div>
                  {m.body && <div className="whitespace-pre-wrap text-[13.5px] leading-6">{m.body}</div>}
                  {m.file_url && (
                    <div className="mt-1.5">
                      <SignedFileLink
                        sign={() => signSubmissionFile(m.file_url!)}
                        label={`📎 ${m.file_name ?? t('subThread.file')}`}
                        className={`inline-block cursor-pointer bg-transparent p-0 text-[12.5px] underline disabled:opacity-60 ${
                          mine ? 'text-white' : 'text-navy'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('subThread.placeholder')}
          rows={2}
          className="w-full resize-y rounded-lg border border-border px-3 py-2 text-[13.5px] font-[inherit]"
        />
        <div className="flex items-center justify-between gap-2">
          <label className="cursor-pointer text-[12.5px] text-navy underline">
            {file ? file.name : t('subThread.attach')}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            onClick={() => void send()}
            disabled={busy || (!body.trim() && !file)}
            className="rounded-lg bg-navy px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-navy-hover disabled:opacity-50"
          >
            {busy ? '…' : t('subThread.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
