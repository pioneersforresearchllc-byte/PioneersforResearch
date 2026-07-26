import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listStudentInvoices } from '@/lib/invoices'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { InvoiceStatusBadge, formatAmount } from '@/components/invoiceBits'

export function StudentInvoicesPage() {
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const { data, isLoading } = useQuery({
    queryKey: ['student-invoices', profile?.id],
    queryFn: () => listStudentInvoices(profile!.id),
    enabled: !!profile?.id,
  })

  const locale = lang === 'ar' ? 'ar' : 'en-US'

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 font-heading text-xl font-bold text-navy">{t('invoices.studentTitle')}</div>
      <p className="mb-5 text-[13px] text-muted">{t('invoices.studentSubtitle')}</p>

      {isLoading && <LoadingState />}
      {data && data.length === 0 && <EmptyState title={t('invoices.noneStudent')} />}

      <div className="flex flex-col gap-2.5">
        {(data ?? []).map((inv) => (
          <div key={inv.id} className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold text-navy">{inv.item}</div>
                <div className="mt-0.5 text-[12px] text-faint">
                  {inv.kind === 'course' ? t('invoices.kind.course') : t('invoices.kind.service')} ·{' '}
                  {new Date(inv.created_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
              <div className="text-end">
                <div className="text-[15px] font-bold text-navy">{formatAmount(inv.amount_cents, t)}</div>
                <div className="mt-1">
                  <InvoiceStatusBadge status={inv.status} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
