import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { useSearchParams } from 'react-router-dom'
import { fetchSiteContent } from '@/lib/content'
import {
  createConsultation,
  getMyInstitution,
  listMyConsultations,
  listMyInvoices,
  startConsultationCheckout,
  type ConsultationStatus,
} from '@/lib/institutions'

const STATUS_STYLES: Record<ConsultationStatus, string> = {
  pending: 'bg-bg-soft text-muted',
  awaiting_payment: 'bg-gold/15 text-gold',
  in_progress: 'bg-accent/10 text-accent',
  done: 'bg-success/10 text-success',
  cancelled: 'bg-bg-soft text-muted',
}

export function InstitutionConsultationsPage() {
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { data: institution } = useQuery({ queryKey: ['my-institution'], queryFn: getMyInstitution })
  const { data: consultations } = useQuery({ queryKey: ['my-consultations'], queryFn: listMyConsultations })
  const { data: invoices } = useQuery({ queryKey: ['my-invoices'], queryFn: listMyInvoices })
  const { data: siteContent } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payError, setPayError] = useState('')

  const bankDetails = (lang === 'ar' ? siteContent?.['bank.details']?.ar : siteContent?.['bank.details']?.en) ?? ''
  const paymentSuccess = searchParams.get('payment') === 'success'

  const pay = async (id: string) => {
    setPayingId(id)
    setPayError('')
    try {
      const url = await startConsultationCheckout(id)
      window.location.href = url
    } catch (e) {
      setPayError(e instanceof Error ? e.message : t('instPay.error'))
      setPayingId(null)
    }
  }

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('')
  const [budget, setBudget] = useState('')
  const [timeline, setTimeline] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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

  const submit = async () => {
    if (!title.trim() || !institution || !profile) {
      setError(t('instConsult.required'))
      return
    }
    setBusy(true)
    setError('')
    try {
      await createConsultation({
        institution_id: institution.id,
        created_by: profile.id,
        title: title.trim(),
        description: description.trim() || null,
        consultation_type: type.trim() || null,
        budget_estimate: budget.trim() || null,
        timeline: timeline.trim() || null,
      })
      setTitle('')
      setDescription('')
      setType('')
      setBudget('')
      setTimeline('')
      void queryClient.invalidateQueries({ queryKey: ['my-consultations'] })
    } catch {
      setError(t('instConsult.error'))
    } finally {
      setBusy(false)
    }
  }

  const inputClass = 'w-full rounded-md border border-border px-3.5 py-2.5 text-[14px]'
  return (
    <div className="max-w-160">
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('instConsult.title')}</div>

      {paymentSuccess && (
        <div className="mb-5 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-[13.5px] text-success">
          {t('instPay.paidSuccess')}
        </div>
      )}
      {payError && <div className="mb-4 text-[13.5px] text-error">{payError}</div>}

      <div className="mb-8 rounded-xl border border-border bg-bg-soft p-4">
        <div className="mb-3 text-[14px] font-semibold text-navy">{t('instConsult.newTitle')}</div>
        <div className="flex flex-col gap-2.5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('instConsult.titlePh')} className={inputClass} />
          <input value={type} onChange={(e) => setType(e.target.value)} placeholder={t('instConsult.typePh')} className={inputClass} />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('instConsult.descPh')}
            rows={4}
            className={`${inputClass} resize-y font-[inherit]`}
          />
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder={t('instConsult.budgetPh')} className={inputClass} />
            <input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder={t('instConsult.timelinePh')} className={inputClass} />
          </div>
        </div>
        {error && <div className="mt-2 text-[13px] text-error">{error}</div>}
        <button
          onClick={() => void submit()}
          disabled={busy}
          className="mt-3 rounded-md bg-navy px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {busy ? t('instConsult.submitting') : t('instConsult.submit')}
        </button>
      </div>

      <div className="mb-3 text-[15px] font-semibold text-navy">{t('instConsult.myTitle')}</div>
      {consultations && consultations.length === 0 && <div className="text-muted">{t('instConsult.empty')}</div>}
      <div className="flex flex-col gap-3">
        {(consultations ?? []).map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-white p-4">
            <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
              <div className="text-[15px] font-semibold text-navy">{c.title}</div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${STATUS_STYLES[c.status]}`}>
                {statusLabel(c.status)}
              </span>
            </div>
            {c.consultation_type && <div className="mb-1 text-[12.5px] text-muted">{c.consultation_type}</div>}
            {c.description && <p className="whitespace-pre-wrap text-[13px] leading-6 text-muted-2">{c.description}</p>}
            {c.status === 'awaiting_payment' && c.final_price_cents != null && (
              <div className="mt-3 rounded-lg bg-gold/10 p-3.5">
                <div className="mb-2.5 text-[14px] text-navy">
                  {t('instConsult.amountDue')}:{' '}
                  <span className="font-bold">
                    {(c.final_price_cents / 100).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}{' '}
                    {t('course.currency')}
                  </span>
                </div>
                <button
                  onClick={() => void pay(c.id)}
                  disabled={payingId === c.id}
                  className="rounded-md bg-navy px-5 py-2.25 text-[13.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
                >
                  {payingId === c.id ? t('instPay.redirecting') : t('instPay.payCard')}
                </button>
                {bankDetails.trim() && (
                  <div className="mt-3 border-t border-gold/30 pt-3">
                    <div className="mb-1 text-[12.5px] font-semibold text-navy">{t('instPay.bankTransfer')}</div>
                    <div className="whitespace-pre-wrap text-[12.5px] leading-6 text-muted-2">{bankDetails}</div>
                    <div className="mt-1.5 text-[12px] text-muted">{t('instPay.bankHint')}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mb-3 mt-8 text-[15px] font-semibold text-navy">{t('instPay.invoicesTitle')}</div>
      {invoices && invoices.length === 0 && <div className="text-muted">{t('instPay.invoicesEmpty')}</div>}
      <div className="flex flex-col gap-2">
        {(invoices ?? []).map((inv) => (
          <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-3.5">
            <div className="text-[13.5px] text-navy">
              <span className="font-bold">
                {(inv.amount_cents / 100).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')} {t('course.currency')}
              </span>
              <span className="ms-2 text-[12px] text-muted">
                {inv.method === 'stripe' ? t('instPay.methodStripe') : t('instPay.methodBank')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-faint">
                {new Date(inv.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                  inv.status === 'paid' ? 'bg-success/10 text-success' : 'bg-gold/15 text-gold'
                }`}
              >
                {inv.status === 'paid' ? t('instPay.statusPaid') : t('instPay.statusUnpaid')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
