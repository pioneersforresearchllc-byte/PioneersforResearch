import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import {
  cancelInvoice,
  createInvoice,
  listAllInvoices,
  listStudents,
  markInvoicePaid,
  receiptUrl,
  sendInvoiceEmail,
  type StudentInvoice,
} from '@/lib/billing'
import { Price } from '@/components/Riyal'
import { LoadingState } from '@/components/LoadingState'

const field = 'w-full rounded-md border border-border px-3 py-2 text-[13.5px]'

const STATUS_KEY = {
  unpaid: 'billing.status.unpaid',
  submitted: 'billing.status.submitted',
  paid: 'billing.status.paid',
  cancelled: 'billing.status.cancelled',
} as const

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useLanguage()
  const { data: students } = useQuery({ queryKey: ['students-list'], queryFn: listStudents })
  const [username, setUsername] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [emailed, setEmailed] = useState<null | boolean>(null)

  const create = useMutation({
    mutationFn: async () => {
      const id = await createInvoice(username, title, description, Math.round((Number(amount) || 0) * 100))
      // Best-effort email; the invoice is created regardless of delivery.
      try {
        await sendInvoiceEmail(id)
        return true
      } catch {
        return false
      }
    },
    onSuccess: (sent) => {
      setEmailed(sent)
      setUsername('')
      setTitle('')
      setDescription('')
      setAmount('')
      onCreated()
    },
  })

  const valid = username.trim() && title.trim() && Number(amount) > 0

  return (
    <div className="rounded-xl border border-border-2 bg-bg-soft p-4">
      <div className="mb-3 text-[14px] font-bold text-navy">{t('ownerBilling.create')}</div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <label className="text-[12px] text-muted sm:col-span-2">
          {t('ownerBilling.student')}
          <select value={username} onChange={(e) => setUsername(e.target.value)} className={`${field} mt-1`}>
            <option value="">{t('ownerBilling.pickStudent')}</option>
            {(students ?? []).map((s) => (
              <option key={s.id} value={s.username}>
                {s.name} (@{s.username})
              </option>
            ))}
          </select>
        </label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('ownerBilling.titlePh')} className={`${field} sm:col-span-2`} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={t('ownerBilling.descPh')} className={`${field} resize-y sm:col-span-2`} />
        <label className="text-[12px] text-muted">
          {t('ownerBilling.amount')}
          <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${field} mt-1`} dir="ltr" />
        </label>
      </div>
      {create.isError && <div className="mt-2 text-[12px] text-error">{t('ownerBilling.createError')}</div>}
      {emailed === true && <div className="mt-2 text-[12px] text-success">{t('ownerBilling.issuedEmailed')}</div>}
      {emailed === false && <div className="mt-2 text-[12px] text-[#92600a]">{t('ownerBilling.issuedNoEmail')}</div>}
      <div className="mt-3 flex justify-end">
        <button
          disabled={!valid || create.isPending}
          onClick={() => create.mutate()}
          className="rounded-md bg-navy px-5 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {t('ownerBilling.send')}
        </button>
      </div>
    </div>
  )
}

function InvoiceRow({ inv, onChanged }: { inv: StudentInvoice; onChanged: () => void }) {
  const { t, lang } = useLanguage()
  const locale = lang === 'ar' ? 'ar-SA' : 'en-US'
  const pay = useMutation({ mutationFn: () => markInvoicePaid(inv.id), onSuccess: onChanged })
  const cancel = useMutation({ mutationFn: () => cancelInvoice(inv.id), onSuccess: onChanged })

  const viewReceipt = async () => {
    if (!inv.receipt_path) return
    const url = await receiptUrl(inv.receipt_path)
    if (url) window.open(url, '_blank', 'noopener')
  }

  return (
    <div className="rounded-lg border border-border-2 bg-white p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-navy">{inv.title}</div>
          <div className="text-[12px] text-muted">
            {t(STATUS_KEY[inv.status])} · <Price cents={inv.amount_cents} locale={locale} />
          </div>
          {inv.description && <div className="mt-0.5 text-[12px] text-muted">{inv.description}</div>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {inv.receipt_path && (
            <button onClick={() => void viewReceipt()} className="rounded-md border border-border px-2.5 py-1 text-[11.5px] text-navy hover:bg-bg-soft">
              {t('ownerBilling.viewReceipt')}
            </button>
          )}
          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
            <>
              <button
                onClick={() => pay.mutate()}
                disabled={pay.isPending}
                className="rounded-md bg-success px-3 py-1 text-[11.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {t('ownerBilling.confirmPaid')}
              </button>
              <button
                onClick={() => confirm(t('ownerBilling.confirmCancel')) && cancel.mutate()}
                className="rounded-md border border-error px-2.5 py-1 text-[11.5px] text-error hover:bg-error-bg"
              >
                {t('ownerBilling.cancel')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function OwnerBillingPage() {
  const { t } = useLanguage()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['all-invoices'], queryFn: listAllInvoices })
  const refresh = () => void qc.invalidateQueries({ queryKey: ['all-invoices'] })

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('ownerBilling.title')}</div>
      <div className="mb-5 text-[13.5px] text-muted">{t('ownerBilling.subtitle')}</div>

      <CreateForm onCreated={refresh} />

      <div className="mt-5 flex flex-col gap-2.5">
        {isLoading && <LoadingState />}
        {!isLoading && (data ?? []).length === 0 && <div className="text-[13px] text-muted">{t('ownerBilling.none')}</div>}
        {(data ?? []).map((inv) => (
          <InvoiceRow key={inv.id} inv={inv} onChanged={refresh} />
        ))}
      </div>
    </div>
  )
}
