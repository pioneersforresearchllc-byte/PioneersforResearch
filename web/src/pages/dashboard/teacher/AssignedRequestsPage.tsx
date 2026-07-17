import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listAssignedRequests, signRequestFile, updateRequestStatus, type RequestStatus } from '@/lib/services'

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

export function TeacherAssignedRequestsPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const queryClient = useQueryClient()

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

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('assignedRequests.title')}</div>
      <div className="mb-5 text-[13.5px] text-muted">{t('assignedRequests.subtitle')}</div>

      {isLoading && <div className="text-muted">...</div>}
      {requests && requests.length === 0 && <div className="text-muted">{t('assignedRequests.empty')}</div>}

      <div className="flex flex-col gap-4">
        {(requests ?? []).map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-white p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[15.5px] font-semibold text-navy">{r.subject}</div>
                <div className="text-[12.5px] text-muted">
                  {r.serviceTitle}
                  {r.packageTitle ? ` · ${r.packageTitle}` : ''}
                </div>
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

            {r.content_text && (
              <div className="mb-3 whitespace-pre-wrap rounded-md bg-bg-soft p-3 text-[13px] leading-7 text-muted-2">
                {r.content_text}
              </div>
            )}

            <div className="mb-3 flex flex-wrap gap-2">
              {r.content_file_url && (
                <button
                  onClick={() => void openFile(r.content_file_url!)}
                  className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy hover:border-navy"
                >
                  {t('adminRequests.openFile')}
                </button>
              )}
              {r.reference_file_url && (
                <button
                  onClick={() => void openFile(r.reference_file_url!)}
                  className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy hover:border-navy"
                >
                  {t('service.referenceFile')}
                </button>
              )}
              {r.reference_url && (
                <a
                  href={r.reference_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy no-underline hover:border-navy"
                >
                  {t('service.referenceUrl')}
                </a>
              )}
            </div>

            {/* The teacher only moves work along after payment lands — pricing
                and payment state stay with the owner (enforced by RLS). */}
            {r.status === 'paid' && (
              <button
                onClick={() => void setStatus(r.id, 'in_progress')}
                className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover"
              >
                {t('assignedRequests.start')}
              </button>
            )}
            {r.status === 'in_progress' && (
              <button
                onClick={() => void setStatus(r.id, 'done')}
                className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover"
              >
                {t('assignedRequests.markDone')}
              </button>
            )}
            {(r.status === 'pending' || r.status === 'awaiting_payment') && (
              <div className="text-[12.5px] text-muted">{t('assignedRequests.waitingPayment')}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
