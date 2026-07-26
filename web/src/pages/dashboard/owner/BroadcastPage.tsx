import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { listBroadcasts, sendBroadcast, type BroadcastAudience } from '@/lib/owner'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'

const AUDIENCES: BroadcastAudience[] = ['all', 'students', 'teachers']

export function OwnerBroadcastPage() {
  const { t, lang } = useLanguage()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-broadcasts'], queryFn: listBroadcasts })

  const [audience, setAudience] = useState<BroadcastAudience>('all')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const audienceLabel = (a: BroadcastAudience) =>
    a === 'all' ? t('oBroadcast.audAll') : a === 'students' ? t('oBroadcast.audStudents') : t('oBroadcast.audTeachers')

  const send = async () => {
    setError(null)
    setResult(null)
    if (!subject.trim() || !message.trim()) {
      setError(t('oBroadcast.missing'))
      return
    }
    setBusy(true)
    try {
      const { sent, recipientCount } = await sendBroadcast({ audience, subject: subject.trim(), message: message.trim() })
      setResult(
        sent
          ? t('oBroadcast.sentOk').replace('{n}', String(recipientCount))
          : t('oBroadcast.noneSent').replace('{n}', String(recipientCount)),
      )
      setSubject('')
      setMessage('')
      void queryClient.invalidateQueries({ queryKey: ['admin-broadcasts'] })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const fieldClass =
    'w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-[14px] text-navy outline-none focus:border-navy'

  return (
    <div>
      <div className="mb-1 font-heading text-xl font-bold text-navy">{t('oBroadcast.title')}</div>
      <p className="mb-5 text-[13px] leading-6 text-muted">{t('oBroadcast.subtitle')}</p>

      <div className="mb-8 rounded-xl border border-border bg-white p-5">
        {/* Audience */}
        <div className="mb-2 text-[13px] font-semibold text-navy">{t('oBroadcast.audience')}</div>
        <div className="mb-5 flex flex-wrap gap-2">
          {AUDIENCES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAudience(a)}
              className={`rounded-lg border px-4 py-2 text-[13px] font-medium transition ${
                audience === a
                  ? 'border-navy bg-navy text-white'
                  : 'border-border bg-white text-muted-2 hover:border-navy'
              }`}
            >
              {audienceLabel(a)}
            </button>
          ))}
        </div>

        {/* Subject */}
        <div className="mb-1.5 text-[13px] font-semibold text-navy">{t('oBroadcast.subject')}</div>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('oBroadcast.subjectPlaceholder')}
          className={`mb-4 ${fieldClass}`}
        />

        {/* Message */}
        <div className="mb-1.5 text-[13px] font-semibold text-navy">{t('oBroadcast.message')}</div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          placeholder={t('oBroadcast.messagePlaceholder')}
          className={`mb-4 resize-y ${fieldClass}`}
        />

        {error && <div className="mb-3 text-[13px] font-medium text-red-600">{error}</div>}
        {result && <div className="mb-3 text-[13px] font-medium text-green-700">{result}</div>}

        <button
          onClick={() => void send()}
          disabled={busy}
          className="rounded-lg bg-navy px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {busy ? t('oBroadcast.sending') : t('oBroadcast.send')}
        </button>
      </div>

      {/* History */}
      <div className="mb-4 font-heading text-[15px] font-bold text-navy">{t('oBroadcast.history')}</div>
      {isLoading && <LoadingState />}
      {data && data.length === 0 && <EmptyState title={t('oBroadcast.noHistory')} />}
      <div className="flex flex-col gap-2.5">
        {(data ?? []).map((b) => (
          <div key={b.id} className="rounded-lg border border-border bg-white p-4">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[14px] font-semibold text-navy">{b.subject}</div>
              <span className="rounded-full bg-bg-soft px-2.5 py-0.5 text-[11.5px] font-medium text-muted-2">
                {audienceLabel(b.audience)} · {t('oBroadcast.recipients').replace('{n}', String(b.recipient_count))}
              </span>
            </div>
            <p className="mb-2 whitespace-pre-wrap text-[13.5px] leading-7 text-muted-2">{b.message}</p>
            <div className="text-[11.5px] text-faint">
              {new Date(b.created_at).toLocaleString(lang === 'ar' ? 'ar' : 'en-US')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
