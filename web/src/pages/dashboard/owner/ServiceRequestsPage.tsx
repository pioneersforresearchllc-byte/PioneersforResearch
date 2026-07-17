import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import {
  listServiceRequests,
  signRequestFile,
  updateRequestStatus,
  type ServiceRequestRow,
} from '@/lib/services'

const STATUSES: ServiceRequestRow['status'][] = ['pending', 'in_progress', 'done', 'cancelled']

const STATUS_STYLES: Record<ServiceRequestRow['status'], string> = {
  pending: 'bg-gold/15 text-gold',
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

export function OwnerServiceRequestsPage() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data: requests, isLoading } = useQuery({ queryKey: ['service-requests'], queryFn: listServiceRequests })

  const setStatus = async (id: string, status: ServiceRequestRow['status']) => {
    await updateRequestStatus(id, status)
    void queryClient.invalidateQueries({ queryKey: ['service-requests'] })
  }

  const openFile = async (path: string) => {
    const url = await signRequestFile(path)
    if (url) window.open(url, '_blank')
  }

  const statusLabel = (s: ServiceRequestRow['status']) =>
    s === 'pending'
      ? t('adminRequests.status.pending')
      : s === 'in_progress'
        ? t('adminRequests.status.in_progress')
        : s === 'done'
          ? t('adminRequests.status.done')
          : t('adminRequests.status.cancelled')

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('adminRequests.title')}</div>

      {isLoading && <div className="text-muted">...</div>}
      {requests && requests.length === 0 && <div className="text-muted">{t('adminRequests.empty')}</div>}

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
              <Field label={t('service.fullName')} value={r.full_name} />
              <Field label={t('service.email')} value={r.email} />
              <Field label={t('service.phone')} value={r.phone} />
              <Field label={t('adminRequests.deliveryBy')} value={r.delivery_date} />
              <Field label={t('service.purpose')} value={r.purpose} />
              <Field label={t('service.audience')} value={r.target_audience} />
              <Field label={t('service.language')} value={r.language} />
              <Field label={t('service.slides')} value={r.quantity} />
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

            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => void setStatus(r.id, s)}
                  disabled={r.status === s}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${
                    r.status === s ? 'bg-navy text-white' : 'border border-border text-navy hover:border-navy'
                  }`}
                >
                  {statusLabel(s)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
