import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { listAllInvoices, type Invoice } from '@/lib/invoices'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { InvoiceStatusBadge, formatAmount } from '@/components/invoiceBits'

type Filter = 'all' | 'completed' | 'pending' | 'failed'

export function OwnerInvoicesPage() {
  const { t, lang } = useLanguage()
  const { data, isLoading } = useQuery({ queryKey: ['owner-invoices'], queryFn: listAllInvoices })
  const [filter, setFilter] = useState<Filter>('all')

  const rows = useMemo<Invoice[]>(
    () => (data ?? []).filter((i) => filter === 'all' || i.status === filter),
    [data, filter],
  )
  const totalCents = useMemo(
    () => (data ?? []).filter((i) => i.status === 'completed').reduce((s, i) => s + i.amount_cents, 0),
    [data],
  )

  const locale = lang === 'ar' ? 'ar' : 'en-US'

  return (
    <div>
      <div className="mb-1 font-heading text-xl font-bold text-navy">{t('invoices.ownerTitle')}</div>
      <p className="mb-5 text-[13px] text-muted">{t('invoices.ownerSubtitle')}</p>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(['all', 'completed', 'pending', 'failed'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg border px-3.5 py-1.5 text-[12.5px] font-medium transition ${
              filter === f ? 'border-navy bg-navy text-white' : 'border-border bg-white text-muted-2 hover:border-navy'
            }`}
          >
            {t(`invoices.filter.${f}` as 'invoices.filter.all')}
          </button>
        ))}
        <div className="ms-auto rounded-lg bg-success-bg px-3.5 py-1.5 text-[12.5px] font-semibold text-success">
          {t('invoices.totalCollected')}: {formatAmount(totalCents, t)}
        </div>
      </div>

      {isLoading && <LoadingState />}
      {data && rows.length === 0 && <EmptyState title={t('invoices.none')} />}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] border-collapse bg-white text-[13px]">
            <thead>
              <tr className="border-b border-border bg-bg-soft text-muted">
                <th className="px-4 py-3 text-start font-semibold">{t('invoices.col.date')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('invoices.col.student')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('invoices.col.item')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('invoices.col.amount')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('invoices.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id} className="border-b border-border-2 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-2">
                    {new Date(inv.created_at).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-navy">{inv.studentName || '—'}</div>
                    {inv.studentUsername && <div className="text-[11.5px] text-faint">@{inv.studentUsername}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-navy">{inv.item}</div>
                    <span className="text-[11px] text-faint">
                      {inv.kind === 'course' ? t('invoices.kind.course') : t('invoices.kind.service')}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">{formatAmount(inv.amount_cents, t)}</td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
