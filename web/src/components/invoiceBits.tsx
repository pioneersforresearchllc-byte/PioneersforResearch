import { useLanguage } from '@/lib/i18n'
import type { PaymentStatus } from '@/lib/invoices'

type TFunc = ReturnType<typeof useLanguage>['t']

/** Format a cents amount with the site's currency label (e.g. "150 USD"). */
export function formatAmount(cents: number, t: TFunc): string {
  return `${(cents / 100).toLocaleString('en-US')} ${t('course.currency')}`
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
