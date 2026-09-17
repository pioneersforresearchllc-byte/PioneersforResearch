import { useLanguage } from '@/lib/i18n'
import type { PaymentStatus } from '@/lib/invoices'
import { Price } from '@/components/Riyal'

type TFunc = ReturnType<typeof useLanguage>['t']

/** A cents amount rendered with the new Saudi Riyal symbol. */
export function formatAmount(cents: number, _t?: TFunc) {
  return <Price cents={cents} />
}

const STYLES: Record<PaymentStatus, string> = {
  completed: 'bg-success-bg text-success',
  pending: 'bg-gold/15 text-accent',
  failed: 'bg-error-bg text-error',
}

export function InvoiceStatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useLanguage()
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${STYLES[status]}`}>
      {t(`invoices.status.${status}` as 'invoices.status.completed')}
    </span>
  )
}
