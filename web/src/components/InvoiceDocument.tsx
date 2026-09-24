import { useLanguage } from '@/lib/i18n'
import { IDENTITY, invoiceNumber, vatBreakdown } from '@/lib/identity'
import { Price } from '@/components/Riyal'

/**
 * Official, print-ready invoice block — company identity + legal numbers,
 * invoice number/date, billed-to, a line item, and a VAT-inclusive total.
 * Reused on the student's "Payments Due" page and mirrored in the email.
 */
export function InvoiceDocument({
  id,
  title,
  description,
  amountCents,
  createdAt,
  studentName,
}: {
  id: string
  title: string
  description: string | null
  amountCents: number
  createdAt: string
  studentName: string
}) {
  const { t, lang } = useLanguage()
  const locale = lang === 'ar' ? 'ar-SA' : 'en-US'
  const dateLocale = lang === 'ar' ? 'ar-u-ca-gregory' : 'en-GB'
  const { base, vat, total } = vatBreakdown(amountCents)
  const dateText = new Intl.DateTimeFormat(dateLocale, { dateStyle: 'long', timeZone: 'Asia/Riyadh' }).format(new Date(createdAt))

  return (
    <div className="overflow-hidden rounded-xl border border-border-2 bg-white">
      {/* Header band */}
      <div className="flex items-start justify-between gap-3 border-b border-border-2 bg-gradient-to-l from-[#0b1f3a] to-[#12325c] px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-11 w-11 shrink-0 rounded-lg bg-white/95 p-1" />
          <div className="leading-tight">
            <div className="font-heading text-[14.5px] font-bold">{lang === 'en' ? IDENTITY.nameEn : IDENTITY.nameAr}</div>
            <div className="mt-0.5 text-[10.5px] text-white/70">
              {t('finance.unified')}: {IDENTITY.unified} · {t('finance.taxNo')}: {IDENTITY.tax}
            </div>
            <div className="text-[10.5px] text-white/70">
              {t('finance.misa')}: {IDENTITY.misa} · {t('finance.address')}: {IDENTITY.address}
            </div>
          </div>
        </div>
        <div className="text-end">
          <div className="text-[13px] font-bold tracking-wide">{t('invoice.doc.taxInvoice')}</div>
          <div className="mt-1 text-[11px] text-white/75" dir="ltr">
            {invoiceNumber(id)}
          </div>
          <div className="text-[11px] text-white/75">{dateText}</div>
        </div>
      </div>

      {/* Billed to */}
      <div className="px-5 pt-3.5 text-[12.5px]">
        <span className="text-muted">{t('invoice.doc.billedTo')}: </span>
        <span className="font-semibold text-navy">{studentName || '—'}</span>
      </div>

      {/* Line item */}
      <div className="px-5 py-3">
        <div className="overflow-hidden rounded-lg border border-border-2">
          <div className="flex items-center justify-between bg-bg-soft px-3.5 py-2 text-[11.5px] font-semibold text-muted">
            <span>{t('invoice.doc.item')}</span>
            <span>{t('invoice.doc.amount')}</span>
          </div>
          <div className="flex items-start justify-between gap-3 px-3.5 py-3">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-navy">{title}</div>
              {description && <div className="mt-0.5 text-[12px] text-muted">{description}</div>}
            </div>
            <div className="shrink-0 text-[13.5px] font-semibold text-navy">
              <Price cents={base} locale={locale} />
            </div>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="px-5 pb-4">
        <div className="ms-auto w-full max-w-[260px] text-[12.5px]">
          <div className="flex items-center justify-between py-1 text-muted">
            <span>{t('invoice.doc.subtotal')}</span>
            <Price cents={base} locale={locale} />
          </div>
          <div className="flex items-center justify-between py-1 text-muted">
            <span>{t('invoice.doc.vat')}</span>
            <Price cents={vat} locale={locale} />
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-border-2 pt-2 text-[14px] font-bold text-navy">
            <span>{t('invoice.doc.total')}</span>
            <Price cents={total} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  )
}
