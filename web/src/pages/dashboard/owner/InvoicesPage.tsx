import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { listAllInvoices } from '@/lib/invoices'
import {
  addManualPayment,
  deleteManualPayment,
  deleteOnlinePayment,
  listManualPayments,
  type FinanceEntry,
  type ManualKind,
  type PaymentMethod,
} from '@/lib/finance'
import { listCoursesWithMeta } from '@/lib/courses'
import { listAllServicesForOwner } from '@/lib/services'
import { LoadingState } from '@/components/LoadingState'
import { formatAmount } from '@/components/invoiceBits'
import { Button } from '@/components/ui/Button'
import { RiyalIcon } from '@/components/Riyal'
import { IDENTITY } from '@/lib/identity'

const inputCls = 'w-full box-border rounded-lg border border-border px-3 py-2 text-[13.5px]'
type Period = 'all' | 'month' | 'range'

export function OwnerInvoicesPage() {
  const { t, lang } = useLanguage()
  const qc = useQueryClient()
  const locale = lang === 'ar' ? 'ar' : 'en-US'

  const invoicesQ = useQuery({ queryKey: ['owner-invoices'], queryFn: listAllInvoices })
  const manualQ = useQuery({ queryKey: ['manual-payments'], queryFn: listManualPayments })
  const coursesQ = useQuery({ queryKey: ['fin-courses'], queryFn: listCoursesWithMeta })
  const servicesQ = useQuery({ queryKey: ['fin-services'], queryFn: listAllServicesForOwner })

  const [period, setPeriod] = useState<Period>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['owner-invoices'] })
    void qc.invalidateQueries({ queryKey: ['manual-payments'] })
  }

  // Unified revenue entries: completed online payments + all manual payments.
  const entries = useMemo<FinanceEntry[]>(() => {
    const online: FinanceEntry[] = (invoicesQ.data ?? [])
      .filter((i) => i.status === 'completed')
      .map((i) => ({
        id: i.id,
        source: 'online',
        date: i.created_at,
        description: i.item,
        customer: i.studentName || t('finance.walkIn'),
        method: t('finance.method.card'),
        kind: i.kind,
        amount_cents: i.amount_cents,
      }))
    const manual: FinanceEntry[] = (manualQ.data ?? []).map((m) => ({
      id: m.id,
      source: 'manual',
      date: m.paid_at,
      description: m.description,
      customer: m.payer_name || t('finance.walkIn'),
      method: t(`finance.method.${m.method}` as 'finance.method.cash'),
      kind: m.kind === 'other' ? 'service' : m.kind,
      amount_cents: m.amount_cents,
    }))
    return [...online, ...manual].sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [invoicesQ.data, manualQ.data, t])

  const filtered = useMemo(() => {
    if (period === 'all') return entries
    if (period === 'month') {
      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return entries.filter((e) => e.date.slice(0, 7) === ym)
    }
    return entries.filter((e) => {
      const d = e.date.slice(0, 10)
      return (!from || d >= from) && (!to || d <= to)
    })
  }, [entries, period, from, to])

  const total = filtered.reduce((s, e) => s + e.amount_cents, 0)
  const loading = invoicesQ.isLoading || manualQ.isLoading

  const del = async (e: FinanceEntry) => {
    if (e.source === 'online') await deleteOnlinePayment(e.id)
    else await deleteManualPayment(e.id)
    setConfirmId(null)
    refresh()
  }

  const periodLabel =
    period === 'all'
      ? t('finance.period.all')
      : period === 'month'
        ? new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })
        : `${t('finance.rangeFrom')} ${from || '…'} ${t('finance.rangeTo')} ${to || '…'}`

  // A stable statement reference: date range (or today) encoded.
  const stmtNo =
    'PHR-FS-' +
    (period === 'range' && from ? from.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '')) +
    (period === 'range' && to ? '-' + to.replace(/-/g, '') : '')

  return (
    <div>
      <div className="no-print mb-1 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-heading text-xl font-bold text-navy">{t('finance.title')}</div>
          <p className="text-[13px] text-muted">{t('finance.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? t('adminServices.cancel') : `+ ${t('finance.recordCash')}`}
          </Button>
          <Button variant="primary" size="sm" onClick={() => window.print()}>
            🖨 {t('finance.print')}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="no-print mb-5">
          <RecordCashForm
            courses={(coursesQ.data ?? []).map((c) => ({ id: c.id, title: c.title }))}
            services={(servicesQ.data ?? []).map((s) => ({ id: s.id, title: s.title }))}
            onSaved={() => {
              setShowForm(false)
              refresh()
            }}
          />
        </div>
      )}

      {/* Period controls */}
      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        {(['all', 'month', 'range'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg border px-3.5 py-1.5 text-[12.5px] font-medium transition ${
              period === p ? 'border-navy bg-navy text-white' : 'border-border bg-white text-muted-2 hover:border-navy'
            }`}
          >
            {t(`finance.period.${p}` as 'finance.period.all')}
          </button>
        ))}
        {period === 'range' && (
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-border px-2.5 py-1.5 text-[12.5px]" />
            <span className="text-muted">—</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-border px-2.5 py-1.5 text-[12.5px]" />
          </div>
        )}
      </div>

      {loading && <LoadingState />}

      {/* ── Printable financial statement ── */}
      <div className="print-area rounded-xl border border-border bg-white p-5 md:p-7">
        {/* Statement header — establishment identity */}
        <div className="mb-5 border-b border-border pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-heading text-[17px] font-bold text-navy">{lang === 'en' ? IDENTITY.nameEn : IDENTITY.nameAr}</div>
              <div className="mt-1 text-[11.5px] leading-6 text-muted">
                {t('finance.unified')}: {IDENTITY.unified} · {t('finance.taxNo')}: {IDENTITY.tax}
                <br />
                {t('finance.misa')}: {IDENTITY.misa} · {t('finance.address')}: {IDENTITY.address}
              </div>
            </div>
            <div className="text-end">
              <div className="text-[15px] font-bold text-navy">{t('finance.statementTitle')}</div>
              <div className="text-[11.5px] text-muted">{t('finance.stmtNo')}: {stmtNo}</div>
              <div className="text-[11.5px] text-muted">{t('finance.period.label')}: {periodLabel}</div>
              <div className="text-[11px] text-faint">{t('finance.generatedOn')}: {new Date().toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-[13.5px] text-faint">{t('finance.none')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-y border-border bg-bg-soft text-muted">
                  <th className="px-3 py-2.5 text-start font-semibold">#</th>
                  <th className="px-3 py-2.5 text-start font-semibold">{t('finance.col.date')}</th>
                  <th className="px-3 py-2.5 text-start font-semibold">{t('finance.col.desc')}</th>
                  <th className="px-3 py-2.5 text-start font-semibold">{t('finance.col.customer')}</th>
                  <th className="px-3 py-2.5 text-start font-semibold">{t('finance.col.method')}</th>
                  <th className="px-3 py-2.5 text-end font-semibold">{t('finance.col.amount')}</th>
                  <th className="no-print px-3 py-2.5 text-end font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={`${e.source}-${e.id}`} className="border-b border-border-2 last:border-0">
                    <td className="px-3 py-2.5 text-faint">{i + 1}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-2">
                      {new Date(e.date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-navy">{e.description}</span>{' '}
                      <span className="text-[10.5px] text-faint">({e.kind === 'course' ? t('invoices.kind.course') : t('invoices.kind.service')})</span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-2">{e.customer}</td>
                    <td className="px-3 py-2.5 text-muted-2">{e.method}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-end font-semibold text-navy">{formatAmount(e.amount_cents, t)}</td>
                    <td className="no-print px-3 py-2.5 text-end">
                      {confirmId === e.id ? (
                        <span className="inline-flex items-center gap-1">
                          <button onClick={() => void del(e)} className="rounded px-1.5 text-[11px] font-bold text-error hover:underline">
                            {t('finance.confirmDelete')}
                          </button>
                          <button onClick={() => setConfirmId(null)} className="rounded px-1.5 text-[11px] text-muted hover:underline">
                            {t('adminServices.cancel')}
                          </button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmId(e.id)} className="rounded px-1.5 text-[13px] text-faint hover:text-error" title={t('finance.delete')}>
                          🗑
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-navy/20 bg-bg-soft">
                  <td colSpan={5} className="px-3 py-3 text-end font-bold text-navy">
                    {t('finance.total')} ({filtered.length} {t('finance.entries')})
                  </td>
                  <td className="px-3 py-3 text-end text-[15px] font-bold text-navy">{formatAmount(total, t)}</td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Signature / certification area — for the accountant to stamp. */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="border-t border-border pt-2 text-[11.5px] text-muted">{t('finance.preparedBy')}</div>
          <div className="border-t border-border pt-2 text-[11.5px] text-muted">{t('finance.certifiedBy')}</div>
        </div>

        <div className="mt-4 text-[10.5px] leading-6 text-faint">{t('finance.vatNote')}</div>
      </div>
    </div>
  )
}

function RecordCashForm({
  courses,
  services,
  onSaved,
}: {
  courses: { id: string; title: string }[]
  services: { id: string; title: string }[]
  onSaved: () => void
}) {
  const { t } = useLanguage()
  const [kind, setKind] = useState<ManualKind>('service')
  const [productId, setProductId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [payer, setPayer] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const options = kind === 'course' ? courses : kind === 'service' ? services : []

  const save = async () => {
    setError('')
    const cents = Math.round(Number(amount) * 100)
    if (!amount.trim() || Number.isNaN(cents) || cents <= 0) {
      setError(t('finance.errAmount'))
      return
    }
    // Resolve the description: chosen product title, or free text for "other".
    const chosen = options.find((o) => o.id === productId)
    const desc = kind === 'other' ? description.trim() : chosen?.title || description.trim()
    if (!desc) {
      setError(t('finance.errProduct'))
      return
    }
    setBusy(true)
    try {
      await addManualPayment({
        kind,
        course_id: kind === 'course' ? productId || null : null,
        service_id: kind === 'service' ? productId || null : null,
        description: desc,
        payer_name: payer.trim() || null,
        amount_cents: cents,
        method,
        paid_at: paidAt,
        note: note.trim() || null,
      })
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-navy/25 bg-white p-5">
      <div className="mb-3 font-heading text-[15px] font-bold text-navy">{t('finance.recordCashTitle')}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('finance.kind')}</label>
          <select value={kind} onChange={(e) => { setKind(e.target.value as ManualKind); setProductId('') }} className={inputCls}>
            <option value="service">{t('finance.kind.service')}</option>
            <option value="course">{t('finance.kind.course')}</option>
            <option value="other">{t('finance.kind.other')}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('finance.product')}</label>
          {kind === 'other' ? (
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('finance.otherDesc')} className={inputCls} />
          ) : (
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls}>
              <option value="">{t('finance.selectProduct')}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11.5px] font-semibold text-muted">{t('finance.amount')} <RiyalIcon /></label>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('finance.payer')}</label>
          <input value={payer} onChange={(e) => setPayer(e.target.value)} placeholder={t('finance.payerPh')} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('finance.method')}</label>
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputCls}>
            <option value="cash">{t('finance.method.cash')}</option>
            <option value="bank">{t('finance.method.bank')}</option>
            <option value="transfer">{t('finance.method.transfer')}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('finance.date')}</label>
          <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('finance.note')}</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
        </div>
      </div>
      {error && <div className="mt-2 text-[12px] text-error">{error}</div>}
      <div className="mt-3">
        <Button size="sm" loading={busy} onClick={save}>
          {t('finance.save')}
        </Button>
      </div>
    </div>
  )
}
