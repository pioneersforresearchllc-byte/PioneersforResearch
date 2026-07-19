import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import {
  listAllConsultations,
  setConsultationPrice,
  updateConsultationStatus,
  type Consultation,
  type ConsultationStatus,
} from '@/lib/institutions'

const STATUS_STYLES: Record<ConsultationStatus, string> = {
  pending: 'bg-gold/15 text-gold',
  awaiting_payment: 'bg-gold/15 text-gold',
  in_progress: 'bg-accent/10 text-accent',
  done: 'bg-success/10 text-success',
  cancelled: 'bg-bg-soft text-muted',
}

const WORKFLOW: ConsultationStatus[] = ['in_progress', 'done', 'cancelled']

function PriceControl({ c, onSaved }: { c: Consultation; onSaved: () => void }) {
  const { t } = useLanguage()
  const [price, setPrice] = useState(c.final_price_cents != null ? String(c.final_price_cents / 100) : '')
  const [busy, setBusy] = useState(false)
  const send = async () => {
    const v = Number(price)
    if (!price.trim() || Number.isNaN(v) || v <= 0) return
    setBusy(true)
    try {
      await setConsultationPrice(c.id, Math.round(v * 100))
      onSaved()
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg bg-bg-soft p-3">
      <div>
        <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('oConsult.finalPrice')}</label>
        <input
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-32 rounded-md border border-border px-2.5 py-1.5 text-[13px]"
        />
      </div>
      <button
        onClick={() => void send()}
        disabled={busy}
        className="rounded-md bg-navy px-4 py-1.75 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
      >
        {t('oConsult.requestPayment')}
      </button>
    </div>
  )
}

export function OwnerInstitutionConsultationsPage() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['inst-consultations'], queryFn: listAllConsultations })
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['inst-consultations'] })

  const setStatus = async (id: string, status: ConsultationStatus) => {
    await updateConsultationStatus(id, status)
    refresh()
  }

  const statusLabel = (s: ConsultationStatus) =>
    s === 'pending'
      ? t('consultStatus.pending')
      : s === 'awaiting_payment'
        ? t('consultStatus.awaiting_payment')
        : s === 'in_progress'
          ? t('consultStatus.in_progress')
          : s === 'done'
            ? t('consultStatus.done')
            : t('consultStatus.cancelled')

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('oConsult.title')}</div>
      {isLoading && <div className="text-muted">...</div>}
      {data && data.length === 0 && <div className="text-muted">{t('oConsult.empty')}</div>}

      <div className="flex flex-col gap-4">
        {(data ?? []).map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-white p-5">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[15.5px] font-semibold text-navy">{c.title}</div>
                <div className="text-[12.5px] text-muted">{c.institutionName}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${STATUS_STYLES[c.status]}`}>
                {statusLabel(c.status)}
              </span>
            </div>

            {c.consultation_type && <div className="mb-1 text-[12.5px] text-muted">{c.consultation_type}</div>}
            {c.description && (
              <p className="mb-3 whitespace-pre-wrap rounded-md bg-bg-soft p-3 text-[13px] leading-6 text-muted-2">
                {c.description}
              </p>
            )}
            <div className="mb-3 flex flex-wrap gap-4 text-[12.5px] text-muted">
              {c.budget_estimate && <span>{t('instConsult.budgetPh')}: {c.budget_estimate}</span>}
              {c.timeline && <span>{t('instConsult.timelinePh')}: {c.timeline}</span>}
            </div>

            {c.status !== 'done' && c.status !== 'cancelled' && <PriceControl c={c} onSaved={refresh} />}

            <div className="flex flex-wrap gap-1.5">
              {WORKFLOW.map((s) => (
                <button
                  key={s}
                  onClick={() => void setStatus(c.id, s)}
                  disabled={c.status === s}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${
                    c.status === s ? 'bg-navy text-white' : 'border border-border text-navy hover:border-navy'
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
