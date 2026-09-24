import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { fetchSiteContent } from '@/lib/content'
import { listMyInvoices, submitReceipt, type StudentInvoice } from '@/lib/billing'
import { Price } from '@/components/Riyal'
import { LoadingState } from '@/components/LoadingState'

const STATUS_KEY = {
  unpaid: 'billing.status.unpaid',
  submitted: 'billing.status.submitted',
  paid: 'billing.status.paid',
  cancelled: 'billing.status.cancelled',
} as const

function StatusPill({ status }: { status: StudentInvoice['status'] }) {
  const { t } = useLanguage()
  const map: Record<StudentInvoice['status'], string> = {
    unpaid: 'bg-[#fef3c7] text-[#92600a]',
    submitted: 'bg-[#dbeafe] text-[#1e46a4]',
    paid: 'bg-success-bg text-success',
    cancelled: 'bg-bg-soft text-muted',
  }
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${map[status]}`}>{t(STATUS_KEY[status])}</span>
}

function InvoiceCard({ inv, bankDetails, onChanged }: { inv: StudentInvoice; bankDetails: string; onChanged: () => void }) {
  const { t, lang } = useLanguage()
  const locale = lang === 'ar' ? 'ar-SA' : 'en-US'
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  const submit = useMutation({
    mutationFn: () => submitReceipt(inv.id, file!),
    onSuccess: () => {
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onChanged()
    },
  })

  const payable = inv.status === 'unpaid' || inv.status === 'submitted'

  return (
    <div className="rounded-xl border border-border-2 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="font-heading text-[15.5px] font-bold text-navy">{inv.title}</div>
        <StatusPill status={inv.status} />
      </div>
      {inv.description && <p className="mb-2 text-[13px] leading-relaxed text-muted">{inv.description}</p>}
      <div className="mb-3 text-[17px] font-bold text-navy">
        <Price cents={inv.amount_cents} locale={locale} />
      </div>

      {inv.status === 'paid' && (
        <div className="rounded-lg bg-success-bg px-3.5 py-2.5 text-[13px] font-semibold text-success">
          {t('billing.paidNote')}
        </div>
      )}

      {inv.status === 'cancelled' && <div className="text-[13px] text-muted">{t('billing.cancelledNote')}</div>}

      {payable && (
        <div className="rounded-lg border border-border-2 bg-bg-soft p-3.5">
          {inv.status === 'submitted' ? (
            <div className="mb-3 rounded-md bg-[#dbeafe] px-3 py-2 text-[12.5px] font-semibold text-[#1e46a4]">
              {t('billing.submittedNote')}
            </div>
          ) : (
            <>
              <div className="mb-1 text-[13px] font-bold text-navy">{t('billing.howToPay')}</div>
              <div className="mb-3 whitespace-pre-wrap text-[12.5px] leading-relaxed text-navy" dir="auto">
                {bankDetails || t('billing.noBankYet')}
              </div>
            </>
          )}

          <div className="text-[12.5px] font-semibold text-navy">{t('billing.uploadReceipt')}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-[12px] text-muted file:me-2 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white"
            />
            <button
              disabled={!file || submit.isPending}
              onClick={() => submit.mutate()}
              className="rounded-md bg-success px-4 py-1.75 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {inv.status === 'submitted' ? t('billing.resend') : t('billing.iPaid')}
            </button>
          </div>
          {submit.isError && <div className="mt-1.5 text-[12px] text-error">{t('billing.uploadError')}</div>}
        </div>
      )}
    </div>
  )
}

export function StudentBillingPage() {
  const { t, lang } = useLanguage()
  const qc = useQueryClient()
  const { data: invoices, isLoading } = useQuery({ queryKey: ['my-invoices'], queryFn: listMyInvoices, refetchInterval: 60_000 })
  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const bankDetails = content?.['bank.details']?.[lang] ?? content?.['bank.details']?.en ?? ''
  const refresh = () => void qc.invalidateQueries({ queryKey: ['my-invoices'] })

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('billing.title')}</div>
      <div className="mb-5 text-[13.5px] text-muted">{t('billing.subtitle')}</div>

      {isLoading && <LoadingState />}
      {!isLoading && (invoices ?? []).length === 0 && (
        <div className="rounded-xl border border-dashed border-border-2 bg-bg-soft px-4 py-10 text-center text-[13.5px] text-muted">
          {t('billing.empty')}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {(invoices ?? []).map((inv) => (
          <InvoiceCard key={inv.id} inv={inv} bankDetails={bankDetails} onChanged={refresh} />
        ))}
      </div>
    </div>
  )
}
