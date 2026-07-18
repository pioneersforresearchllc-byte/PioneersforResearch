import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { listActiveTeachers } from '@/lib/courses'
import {
  assignRequestTeacher,
  isPaidPhase,
  listServiceRequests,
  notifyRequestDone,
  setRequestPrice,
  signRequestFile,
  updateRequestStatus,
  type RequestStatus,
  type ServiceRequestRow,
} from '@/lib/services'

// Before the customer pays, the owner prices/cancels; after payment they only
// move the work forward. 'paid' itself is set by the Stripe webhook, never a
// manual button, so it's not offered here as a settable status.
const PRE_PAYMENT_ACTIONS: RequestStatus[] = ['pending', 'awaiting_payment', 'cancelled']
const PAID_WORKFLOW_ACTIONS: RequestStatus[] = ['in_progress', 'done']

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: 'bg-gold/15 text-gold',
  awaiting_payment: 'bg-gold/15 text-gold',
  paid: 'bg-success/10 text-success',
  in_progress: 'bg-accent/10 text-accent',
  done: 'bg-success/10 text-success',
  cancelled: 'bg-bg-soft text-muted',
}

/**
 * Sets the final price and moves the request to awaiting_payment, which is
 * what surfaces the "pay now" button on the customer's side.
 */
function PriceControl({ request, onSaved }: { request: ServiceRequestRow; onSaved: () => void }) {
  const { t } = useLanguage()
  const [priceRiyal, setPriceRiyal] = useState(
    request.final_price_cents != null ? String(request.final_price_cents / 100) : '',
  )
  const [busy, setBusy] = useState(false)

  const send = async () => {
    const riyal = Number(priceRiyal)
    if (!priceRiyal.trim() || Number.isNaN(riyal) || riyal <= 0) return
    setBusy(true)
    try {
      await setRequestPrice(request.id, Math.round(riyal * 100))
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg bg-bg-soft p-3">
      <div>
        <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('adminRequests.finalPrice')}</label>
        <input
          type="number"
          min={1}
          value={priceRiyal}
          onChange={(e) => setPriceRiyal(e.target.value)}
          className="w-32 rounded-md border border-border px-2.5 py-1.5 text-[13px]"
        />
      </div>
      <button
        onClick={() => void send()}
        disabled={busy}
        className="rounded-md bg-navy px-4 py-1.75 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
      >
        {t('adminRequests.requestPayment')}
      </button>
    </div>
  )
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
  const { data: teachers } = useQuery({ queryKey: ['active-teachers'], queryFn: listActiveTeachers })

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['service-requests'] })

  const assign = async (id: string, teacherId: string) => {
    await assignRequestTeacher(id, teacherId || null)
    refresh()
  }

  const setStatus = async (id: string, status: RequestStatus) => {
    await updateRequestStatus(id, status)
    // Marking a request done emails the customer that their work is ready.
    // Fire-and-forget: the status is already saved, so a mail hiccup mustn't
    // fail the owner's action.
    if (status === 'done') void notifyRequestDone(id)
    refresh()
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

            <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg bg-bg-soft p-3">
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('adminRequests.assignee')}</label>
                <select
                  value={r.assigned_teacher_id ?? ''}
                  onChange={(e) => void assign(r.id, e.target.value)}
                  className="w-48 rounded-md border border-border px-2.5 py-1.5 text-[13px]"
                >
                  <option value="">{t('adminRequests.unassigned')}</option>
                  {(teachers ?? []).map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing only matters before payment. */}
            {!isPaidPhase(r.status) && <PriceControl request={r} onSaved={refresh} />}

            <div className="flex flex-wrap items-center gap-1.5">
              {isPaidPhase(r.status) ? (
                <>
                  {/* Paid is locked on once the money's in — the owner just
                      advances the work from here. */}
                  <span className="rounded-md bg-success/10 px-3 py-1.5 text-[12px] font-semibold text-success">
                    ✓ {statusLabel('paid')}
                  </span>
                  {PAID_WORKFLOW_ACTIONS.map((s) => (
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
                </>
              ) : (
                PRE_PAYMENT_ACTIONS.map((s) => (
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
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
