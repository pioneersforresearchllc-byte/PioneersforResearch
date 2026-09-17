import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import {
  isPaidPhase,
  listAssignedRequests,
  signRequestFile,
  updateRequestStatus,
  type RequestStatus,
  type ServiceRequestRow,
} from '@/lib/services'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { ServiceWorkspace } from '@/components/ServiceWorkspace'

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: 'bg-bg-soft text-muted',
  awaiting_payment: 'bg-gold/15 text-gold',
  paid: 'bg-success/10 text-success',
  in_progress: 'bg-accent/10 text-accent',
  done: 'bg-success/10 text-success',
  cancelled: 'bg-bg-soft text-muted',
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === '' || value === undefined) return null
  return (
    <div>
      <span className="text-muted">{label}: </span>
      <span className="text-navy">{value}</span>
    </div>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '؟'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function TeacherAssignedRequestsPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const { data: requests, isLoading } = useQuery({
    queryKey: ['assigned-requests', profile?.id],
    enabled: !!profile,
    queryFn: () => listAssignedRequests(profile!.id),
  })

  const setStatus = async (id: string, status: RequestStatus) => {
    await updateRequestStatus(id, status)
    void queryClient.invalidateQueries({ queryKey: ['assigned-requests', profile?.id] })
  }

  const openFile = async (path: string) => {
    const url = await signRequestFile(path)
    if (url) window.open(url, '_blank')
  }

  const statusLabel = (s: RequestStatus) =>
    s === 'pending'
      ? t('adminRequests.status.pending')
      : s === 'awaiting_payment'
        ? t('adminRequests.status.awaiting_payment')
        : s === 'paid'
          ? t('adminRequests.status.paid')
          : s === 'in_progress'
            ? t('adminRequests.status.in_progress')
            : s === 'done'
              ? t('adminRequests.status.done')
              : t('adminRequests.status.cancelled')

  const list = requests ?? []
  const filtered = query.trim()
    ? list.filter((r) => r.full_name?.toLowerCase().includes(query.trim().toLowerCase()))
    : list
  const selected = list.find((r) => r.id === selectedId) ?? null

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('assignedRequests.title')}</div>
      <div className="mb-5 text-[13.5px] text-muted">{t('assignedRequests.subtitle')}</div>

      {isLoading && <LoadingState />}
      {requests && list.length === 0 && <EmptyState title={t('assignedRequests.empty')} />}

      {list.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[310px_1fr]">
          {/* Master: subscribed students */}
          <div className={selected ? 'hidden lg:block' : ''}>
            <div className="mb-2.5 text-[12.5px] font-bold uppercase tracking-wide text-faint">
              {t('assignedRequests.students')} · {list.length}
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('assignedRequests.searchPh')}
              className="mb-3 w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] outline-none focus:border-navy"
            />
            <div className="flex flex-col gap-2">
              {filtered.map((r) => {
                const active = r.id === selectedId
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-start transition-all ${
                      active ? 'border-navy bg-navy/[0.04] shadow-sm' : 'border-border bg-white hover:border-navy/40 hover:bg-bg-soft'
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-[#14335c] text-[13px] font-bold text-white">
                      {initials(r.full_name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-navy">{r.full_name}</span>
                      <span className="block truncate text-[12px] text-muted">{r.serviceTitle}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${STATUS_STYLES[r.status]}`}>
                      {statusLabel(r.status)}
                    </span>
                  </button>
                )
              })}
              {filtered.length === 0 && <div className="py-6 text-center text-[13px] text-faint">{t('assignedRequests.noMatch')}</div>}
            </div>
          </div>

          {/* Detail: the selected student's separate area */}
          <div className={selected ? '' : 'hidden lg:block'}>
            {selected ? (
              <StudentDetail
                r={selected}
                t={t}
                statusLabel={statusLabel}
                onBack={() => setSelectedId(null)}
                onStatus={setStatus}
                onOpenFile={openFile}
              />
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-white p-8 text-center text-[13.5px] text-faint">
                {t('assignedRequests.selectPrompt')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type TFn = ReturnType<typeof useLanguage>['t']

function StudentDetail({
  r,
  t,
  statusLabel,
  onBack,
  onStatus,
  onOpenFile,
}: {
  r: ServiceRequestRow
  t: TFn
  statusLabel: (s: RequestStatus) => string
  onBack: () => void
  onStatus: (id: string, s: RequestStatus) => void
  onOpenFile: (path: string) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <button onClick={onBack} className="mb-3 text-[12.5px] font-semibold text-accent hover:underline lg:hidden">
        {t('assignedRequests.backToList')}
      </button>

      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[16px] font-bold text-navy">{r.full_name}</div>
          <div className="text-[13px] text-muted">
            {r.serviceTitle}
            {r.packageTitle ? ` · ${r.packageTitle}` : ''}
          </div>
          <div className="mt-0.5 text-[12.5px] text-faint">{r.subject}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${STATUS_STYLES[r.status]}`}>
          {statusLabel(r.status)}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-1.5 text-[13px] sm:grid-cols-2">
        <Field label={t('adminRequests.deliveryBy')} value={r.delivery_date} />
        <Field label={t('service.language')} value={r.language} />
        <Field label={t('service.slides')} value={r.quantity} />
        <Field label={t('service.purpose')} value={r.purpose} />
        <Field label={t('service.audience')} value={r.target_audience} />
        <Field label={t('service.colors')} value={r.brand_colors} />
        {r.details?.software && <Field label={t('service.software')} value={r.details.software} />}
      </div>

      {r.custom_answers && r.custom_answers.length > 0 && (
        <div className="mb-3 flex flex-col gap-1.5 rounded-md bg-bg-soft p-3 text-[13px]">
          {r.custom_answers.map((a, i) => (
            <div key={i}>
              <span className="font-semibold text-muted">{a.label}: </span>
              {a.type === 'file' ? (
                <button onClick={() => onOpenFile(a.value)} className="text-navy underline underline-offset-2">
                  {a.fileName || t('adminRequests.openFile')}
                </button>
              ) : (
                <span className="whitespace-pre-wrap text-navy">{a.value}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {r.content_text && (
        <div className="mb-3 whitespace-pre-wrap rounded-md bg-bg-soft p-3 text-[13px] leading-7 text-muted-2">{r.content_text}</div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {r.content_file_url && (
          <button onClick={() => onOpenFile(r.content_file_url!)} className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy hover:border-navy">
            {t('adminRequests.openFile')}
          </button>
        )}
        {r.reference_file_url && (
          <button onClick={() => onOpenFile(r.reference_file_url!)} className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy hover:border-navy">
            {t('service.referenceFile')}
          </button>
        )}
        {r.reference_url && (
          <a href={r.reference_url} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy no-underline hover:border-navy">
            {t('service.referenceUrl')}
          </a>
        )}
      </div>

      {r.status === 'paid' && (
        <button onClick={() => onStatus(r.id, 'in_progress')} className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover">
          {t('assignedRequests.start')}
        </button>
      )}
      {r.status === 'in_progress' && (
        <button onClick={() => onStatus(r.id, 'done')} className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover">
          {t('assignedRequests.markDone')}
        </button>
      )}
      {(r.status === 'pending' || r.status === 'awaiting_payment') && (
        <div className="text-[12.5px] text-muted">{t('assignedRequests.waitingPayment')}</div>
      )}

      {isPaidPhase(r.status) && (
        <div className="mt-4 border-t border-border-2 pt-4">
          <ServiceWorkspace requestId={r.id} manage isStudent={false} />
        </div>
      )}
    </div>
  )
}
