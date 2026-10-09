import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import {
  addExpense,
  deleteExpense,
  EXPENSE_CATEGORIES,
  listExpenses,
  listRevenue,
  type ExpenseCategory,
  type RevenueSource,
} from '@/lib/profit'
import { Price } from '@/components/Riyal'
import { LoadingState } from '@/components/LoadingState'

// Chart series colours: validated pair (CVD-safe, inside lightness/chroma band).
const REV = '#2f6db8'
const EXP = '#c08f2e'

type Period = 'month' | 'lastMonth' | 'year' | 'all' | 'custom'

const CAT_LABEL: Record<ExpenseCategory, { ar: string; en: string }> = {
  salaries: { ar: 'رواتب', en: 'Salaries' },
  teacher_fees: { ar: 'مستحقات المدرّبين', en: 'Teacher fees' },
  rent: { ar: 'إيجار', en: 'Rent' },
  marketing: { ar: 'تسويق وإعلانات', en: 'Marketing & ads' },
  software: { ar: 'اشتراكات وبرامج', en: 'Software & subscriptions' },
  government: { ar: 'رسوم حكومية', en: 'Government fees' },
  equipment: { ar: 'معدات وأجهزة', en: 'Equipment' },
  other: { ar: 'أخرى', en: 'Other' },
}
const SRC_LABEL: Record<RevenueSource, { ar: string; en: string }> = {
  invoice: { ar: 'فواتير الطلاب (تحويل)', en: 'Student invoices (transfer)' },
  online: { ar: 'دفع إلكتروني', en: 'Online payments' },
  manual: { ar: 'مدفوعات مسجّلة يدويًا', en: 'Manually recorded payments' },
  institution: { ar: 'فواتير المؤسسات', en: 'Institution invoices' },
}

const ym = (d: string) => d.slice(0, 7)
const todayStr = () => new Date().toISOString().slice(0, 10)

export function OwnerProfitPage() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const tx = (a: string, e: string) => (ar ? a : e)
  const locale = ar ? 'ar-SA' : 'en-US'
  const qc = useQueryClient()
  const revQ = useQuery({ queryKey: ['profit-revenue'], queryFn: listRevenue })
  const expQ = useQuery({ queryKey: ['profit-expenses'], queryFn: listExpenses })

  const [period, setPeriod] = useState<Period>('month')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Period → [start, end] as YYYY-MM-DD (inclusive). Empty = unbounded.
  const [start, end] = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    if (period === 'month') return [iso(new Date(Date.UTC(y, m, 1))), iso(new Date(Date.UTC(y, m + 1, 0)))]
    if (period === 'lastMonth') return [iso(new Date(Date.UTC(y, m - 1, 1))), iso(new Date(Date.UTC(y, m, 0)))]
    if (period === 'year') return [`${y}-01-01`, `${y}-12-31`]
    if (period === 'custom') return [from, to]
    return ['', '']
  }, [period, from, to])
  const inRange = (d: string) => (!start || d >= start) && (!end || d <= end)

  const revenue = (revQ.data ?? []).filter((r) => inRange(r.date))
  const expenses = (expQ.data ?? []).filter((e) => inRange(e.spent_on))
  const revTotal = revenue.reduce((s, r) => s + r.amount_cents, 0)
  const expTotal = expenses.reduce((s, e) => s + e.amount_cents, 0)
  const net = revTotal - expTotal
  const margin = revTotal > 0 ? Math.round((net / revTotal) * 100) : null

  // Last 12 months for the chart + table (independent of the period filter).
  const months = useMemo(() => {
    const now = new Date()
    const list: { key: string; label: string; rev: number; exp: number }[] = []
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      list.push({ key, label: d.toLocaleDateString(locale, { month: 'short', year: '2-digit' }), rev: 0, exp: 0 })
    }
    const idx = new Map(list.map((m, i) => [m.key, i]))
    for (const r of revQ.data ?? []) {
      const i = idx.get(ym(r.date))
      if (i !== undefined) list[i].rev += r.amount_cents
    }
    for (const e of expQ.data ?? []) {
      const i = idx.get(ym(e.spent_on))
      if (i !== undefined) list[i].exp += e.amount_cents
    }
    return list
  }, [revQ.data, expQ.data, locale])

  const bySource = (Object.keys(SRC_LABEL) as RevenueSource[])
    .map((s) => ({ s, v: revenue.filter((r) => r.source === s).reduce((a, r) => a + r.amount_cents, 0) }))
    .filter((x) => x.v > 0)
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ c, v: expenses.filter((e) => e.category === c).reduce((a, e) => a + e.amount_cents, 0) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)

  // ── Expense form ──
  const [fDate, setFDate] = useState(todayStr())
  const [fCat, setFCat] = useState<ExpenseCategory>('marketing')
  const [fDesc, setFDesc] = useState('')
  const [fAmount, setFAmount] = useState('')
  const [fMethod, setFMethod] = useState<'bank' | 'cash' | 'card'>('bank')
  const [fNote, setFNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')
  const saveExpense = async () => {
    setFormErr('')
    const amount = Math.round(Number(fAmount) * 100)
    if (!fDesc.trim() || !(amount > 0)) {
      setFormErr(tx('أدخل الوصف والمبلغ.', 'Enter a description and amount.'))
      return
    }
    setSaving(true)
    try {
      await addExpense({ spent_on: fDate, category: fCat, description: fDesc.trim(), amount_cents: amount, method: fMethod, note: fNote.trim() || null })
      setFDesc('')
      setFAmount('')
      setFNote('')
      void qc.invalidateQueries({ queryKey: ['profit-expenses'] })
    } catch {
      setFormErr(tx('تعذر الحفظ. هل شغّلت ملف قاعدة البيانات 0070؟', 'Could not save. Has migration 0070 been run?'))
    } finally {
      setSaving(false)
    }
  }

  const periods: { k: Period; label: string }[] = [
    { k: 'month', label: tx('هذا الشهر', 'This month') },
    { k: 'lastMonth', label: tx('الشهر الماضي', 'Last month') },
    { k: 'year', label: tx('هذه السنة', 'This year') },
    { k: 'all', label: tx('الكل', 'All time') },
    { k: 'custom', label: tx('فترة مخصصة', 'Custom') },
  ]
  const input = 'rounded-lg border border-border bg-white px-3 py-2 text-[13.5px]'

  if (revQ.isLoading || expQ.isLoading) return <LoadingState />

  return (
    <div>
      <div className="mb-1 font-heading text-xl font-bold text-navy">{tx('الأرباح والمصروفات', 'Profit & expenses')}</div>
      <p className="mb-5 text-[13px] text-muted">
        {tx('الإيرادات تُحسب تلقائيًا من كل المدفوعات المؤكدة، والمصروفات تُسجَّل يدويًا.', 'Revenue is calculated automatically from all confirmed payments; expenses are entered by hand.')}
      </p>

      {expQ.data === null && (
        <div className="mb-5 rounded-xl bg-gold/10 px-4 py-3 text-[13px] text-navy">
          {tx('لتفعيل تسجيل المصروفات شغّل ملف قاعدة البيانات 0070.', 'Run database migration 0070 to enable expenses.')}
        </div>
      )}

      {/* Period filter — one row above everything it controls */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {periods.map((p) => (
          <button
            key={p.k}
            type="button"
            onClick={() => setPeriod(p.k)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${period === p.k ? 'bg-navy text-white' : 'bg-white text-navy ring-1 ring-border'}`}
          >
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <span className="flex items-center gap-2 text-[13px] text-muted">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={input} />
            {tx('إلى', 'to')}
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={input} />
          </span>
        )}
      </div>

      {/* KPI tiles */}
      <div className="mb-7 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Tile label={tx('الإيرادات', 'Revenue')} accent={REV} value={<Price cents={revTotal} locale={locale} />} />
        <Tile label={tx('المصروفات', 'Expenses')} accent={EXP} value={<Price cents={expTotal} locale={locale} />} />
        <Tile
          label={tx('صافي الربح', 'Net profit')}
          strong
          value={
            <span className={net >= 0 ? 'text-success' : 'text-error'}>
              {net < 0 && '−'}
              <Price cents={Math.abs(net)} locale={locale} />
            </span>
          }
        />
        <Tile
          label={tx('هامش الربح', 'Profit margin')}
          value={<span className={margin !== null && margin < 0 ? 'text-error' : 'text-navy'}>{margin === null ? '—' : `${margin}%`}</span>}
        />
      </div>

      {/* Monthly chart: grouped bars, one axis */}
      <MonthlyChart months={months} ar={ar} locale={locale} />

      {/* Breakdowns */}
      <div className="mb-7 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Breakdown
          title={tx('مصادر الإيرادات', 'Revenue by source')}
          color={REV}
          total={revTotal}
          rows={bySource.map((x) => ({ label: ar ? SRC_LABEL[x.s].ar : SRC_LABEL[x.s].en, v: x.v }))}
          empty={tx('لا توجد إيرادات في هذه الفترة.', 'No revenue in this period.')}
          locale={locale}
        />
        <Breakdown
          title={tx('المصروفات حسب البند', 'Expenses by category')}
          color={EXP}
          total={expTotal}
          rows={byCat.map((x) => ({ label: ar ? CAT_LABEL[x.c].ar : CAT_LABEL[x.c].en, v: x.v }))}
          empty={tx('لا توجد مصروفات في هذه الفترة.', 'No expenses in this period.')}
          locale={locale}
        />
      </div>

      {/* Add expense */}
      <div className="mb-5 rounded-2xl border border-border bg-white p-5">
        <div className="mb-3 text-[15px] font-bold text-navy">＋ {tx('تسجيل مصروف', 'Record an expense')}</div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-[12px] text-muted">
            {tx('التاريخ', 'Date')}
            <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted">
            {tx('البند', 'Category')}
            <select value={fCat} onChange={(e) => setFCat(e.target.value as ExpenseCategory)} className={input}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {ar ? CAT_LABEL[c].ar : CAT_LABEL[c].en}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted">
            {tx('المبلغ (ريال)', 'Amount (SAR)')}
            <input type="number" min="0" step="0.01" value={fAmount} onChange={(e) => setFAmount(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted sm:col-span-2">
            {tx('الوصف', 'Description')}
            <input value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder={tx('مثال: إعلان إنستقرام — حملة موعد التسليم', 'e.g. Instagram ad — deadline campaign')} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted">
            {tx('طريقة الدفع', 'Paid by')}
            <select value={fMethod} onChange={(e) => setFMethod(e.target.value as 'bank' | 'cash' | 'card')} className={input}>
              <option value="bank">{tx('تحويل بنكي', 'Bank transfer')}</option>
              <option value="card">{tx('بطاقة', 'Card')}</option>
              <option value="cash">{tx('نقدًا', 'Cash')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted sm:col-span-2 lg:col-span-3">
            {tx('ملاحظة (اختياري)', 'Note (optional)')}
            <input value={fNote} onChange={(e) => setFNote(e.target.value)} className={input} />
          </label>
        </div>
        {formErr && <div className="mt-2 text-[13px] text-error">{formErr}</div>}
        <button
          type="button"
          onClick={() => void saveExpense()}
          disabled={saving || expQ.data === null}
          className="mt-3 rounded-lg bg-navy px-5 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50"
        >
          {saving ? '...' : tx('حفظ المصروف', 'Save expense')}
        </button>
      </div>

      {/* Expense list for the period */}
      {expenses.length > 0 && (
        <div className="mb-5 overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead className="bg-bg-soft text-muted">
              <tr>
                <th className="px-3 py-2.5 text-start font-semibold">{tx('التاريخ', 'Date')}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{tx('البند', 'Category')}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{tx('الوصف', 'Description')}</th>
                <th className="px-3 py-2.5 text-end font-semibold">{tx('المبلغ', 'Amount')}</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-3 py-2.5 text-muted">{e.spent_on}</td>
                  <td className="px-3 py-2.5">{ar ? CAT_LABEL[e.category].ar : CAT_LABEL[e.category].en}</td>
                  <td className="px-3 py-2.5 text-navy">
                    {e.description}
                    {e.note && <div className="text-[11.5px] text-faint">{e.note}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-end font-semibold text-navy">
                    <Price cents={e.amount_cents} locale={locale} />
                  </td>
                  <td className="px-3 py-2.5 text-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(tx('حذف هذا المصروف؟', 'Delete this expense?'))) void deleteExpense(e.id).then(() => qc.invalidateQueries({ queryKey: ['profit-expenses'] }))
                      }}
                      className="text-[12px] text-error"
                    >
                      {tx('حذف', 'Delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[12px] leading-6 text-faint">
        {tx(
          'ملاحظة: إذا سجّلت دفعة يدويًا في «المالية» لنفس فاتورة أكّدت دفعها، ستُحسب مرتين — سجّل كل دفعة في مكان واحد فقط.',
          'Note: a payment recorded manually under Finance for an invoice you also marked paid counts twice — record each payment in one place only.',
        )}
      </p>
    </div>
  )
}

function Tile({ label, value, accent, strong }: { label: string; value: React.ReactNode; accent?: string; strong?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 ${strong ? 'border-navy/30 shadow-[0_10px_24px_-16px_rgba(11,31,58,0.5)]' : 'border-border'}`}>
      <div className="mb-1 flex items-center gap-1.5 text-[12.5px] text-muted">
        {accent && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: accent }} aria-hidden="true" />}
        {label}
      </div>
      <div className={`font-heading font-bold text-navy ${strong ? 'text-[26px]' : 'text-[22px]'}`}>{value}</div>
    </div>
  )
}

function Breakdown({ title, color, total, rows, empty, locale }: { title: string; color: string; total: number; rows: { label: string; v: number }[]; empty: string; locale: 'ar-SA' | 'en-US' }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="mb-3 text-[14.5px] font-bold text-navy">{title}</div>
      {rows.length === 0 ? (
        <div className="text-[13px] text-muted">{empty}</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => {
            const pct = total > 0 ? Math.round((r.v / total) * 100) : 0
            return (
              <div key={r.label}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="text-navy">{r.label}</span>
                  <span className="text-muted">
                    <Price cents={r.v} locale={locale} /> · {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-soft">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Last 12 months, revenue vs expenses as grouped bars on one axis, with hover tooltip and a table view. */
function MonthlyChart({ months, ar, locale }: { months: { key: string; label: string; rev: number; exp: number }[]; ar: boolean; locale: 'ar-SA' | 'en-US' }) {
  const [hover, setHover] = useState<number | null>(null)
  const [asTable, setAsTable] = useState(false)
  const max = Math.max(1, ...months.map((m) => Math.max(m.rev, m.exp)))
  const H = 180
  const sar = (c: number) => (c / 100).toLocaleString(locale, { maximumFractionDigits: 0 })

  return (
    <div className="mb-7 rounded-2xl border border-border bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[14.5px] font-bold text-navy">{ar ? 'آخر 12 شهرًا' : 'Last 12 months'}</div>
        <div className="flex items-center gap-4 text-[12.5px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: REV }} />
            {ar ? 'الإيرادات' : 'Revenue'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: EXP }} />
            {ar ? 'المصروفات' : 'Expenses'}
          </span>
          <button type="button" onClick={() => setAsTable((v) => !v)} className="rounded-md border border-border px-2.5 py-1 text-[12px] text-navy">
            {asTable ? (ar ? 'عرض الرسم' : 'Show chart') : ar ? 'عرض كجدول' : 'Show table'}
          </button>
        </div>
      </div>

      {asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-[13px]">
            <thead className="text-muted">
              <tr>
                <th className="py-2 text-start font-semibold">{ar ? 'الشهر' : 'Month'}</th>
                <th className="py-2 text-end font-semibold">{ar ? 'الإيرادات' : 'Revenue'}</th>
                <th className="py-2 text-end font-semibold">{ar ? 'المصروفات' : 'Expenses'}</th>
                <th className="py-2 text-end font-semibold">{ar ? 'الصافي' : 'Net'}</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.key} className="border-t border-border">
                  <td className="py-2 text-navy">{m.label}</td>
                  <td className="py-2 text-end">{sar(m.rev)}</td>
                  <td className="py-2 text-end">{sar(m.exp)}</td>
                  <td className={`py-2 text-end font-semibold ${m.rev - m.exp < 0 ? 'text-error' : 'text-success'}`}>{sar(m.rev - m.exp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative" dir="ltr">
          {/* recessive gridlines */}
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: H }} aria-hidden="true">
            {[0, 0.5, 1].map((f) => (
              <div key={f} className="absolute inset-x-0 border-t border-border/70" style={{ top: H - f * H }}>
                <span className="absolute -top-2 left-0 bg-white pe-1 text-[10.5px] text-faint">{sar(max * f)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-1 ps-10" style={{ height: H }}>
            {months.map((m, i) => (
              <div
                key={m.key}
                className="relative flex h-full flex-1 items-end justify-center gap-[2px]"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div className="w-[38%] max-w-[18px] rounded-t-[4px]" style={{ height: `${(m.rev / max) * 100}%`, background: REV, opacity: hover === null || hover === i ? 1 : 0.45 }} />
                <div className="w-[38%] max-w-[18px] rounded-t-[4px]" style={{ height: `${(m.exp / max) * 100}%`, background: EXP, opacity: hover === null || hover === i ? 1 : 0.45 }} />
                {hover === i && (
                  <div className="absolute bottom-full z-10 mb-2 w-max rounded-lg bg-navy px-3 py-2 text-[12px] text-white shadow-lg" dir={ar ? 'rtl' : 'ltr'}>
                    <div className="mb-1 font-semibold">{m.label}</div>
                    <div>{ar ? 'الإيرادات' : 'Revenue'}: {sar(m.rev)}</div>
                    <div>{ar ? 'المصروفات' : 'Expenses'}: {sar(m.exp)}</div>
                    <div className="mt-0.5 font-semibold">{ar ? 'الصافي' : 'Net'}: {sar(m.rev - m.exp)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1 ps-10">
            {months.map((m) => (
              <div key={m.key} className="flex-1 text-center text-[10.5px] text-muted">
                {m.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
