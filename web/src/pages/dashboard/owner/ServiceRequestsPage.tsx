import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { Price } from '@/components/Riyal'
import { listActiveTeachers } from '@/lib/courses'
import {
  assignRequestTeacher,
  canDeleteRequest,
  createRequestInvoice,
  deleteServiceRequest,
  listRequestInvoices,
  listServiceRequests,
  moneySummary,
  notifyRequestDone,
  saveOwnerNote,
  saveRequestDeal,
  setDeliverablesUnlocked,
  signRequestFile,
  updateRequestStatus,
  type RequestInvoice,
  type RequestStatus,
  type ServiceRequestRow,
} from '@/lib/services'
import { STAGE_ICONS, STAGE_ORDER, STAGE_STYLES, stageLabel, stageTab } from '@/lib/requestStages'
import { DeliverablesBox } from '@/components/DeliverablesBox'
import { ServiceWorkspace } from '@/components/ServiceWorkspace'
import { ACTIVE_STAGES, listExpertProfiles, listPayouts, markPayoutPaid, setPayout, type ExpertProfile, type RequestPayout } from '@/lib/experts'
import { AI_BOT_USERNAME } from '@/lib/chat'
import { listAgreementSigners } from '@/lib/consultantAgreement'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'

const INVOICE_STATUS: Record<RequestInvoice['status'], [string, string, string]> = {
  unpaid: ['غير مدفوعة', 'Unpaid', 'bg-gold/15 text-accent'],
  submitted: ['إيصال بانتظار تأكيدك', 'Receipt to confirm', 'bg-accent/10 text-accent'],
  paid: ['مدفوعة', 'Paid', 'bg-success/10 text-success'],
  cancelled: ['ملغاة', 'Cancelled', 'bg-bg-soft text-muted'],
}

/** Saudi mobile → wa.me number (05xxxxxxxx → 9665xxxxxxxx). */
function waNumber(phone: string | null | undefined): string | null {
  const d = (phone ?? '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('966')) return d
  if (d.startsWith('05')) return `966${d.slice(1)}`
  if (d.startsWith('5') && d.length === 9) return `966${d}`
  return d
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === '' || value === undefined) return null
  return (
    <div>
      <span className="text-muted">{label}: </span>
      <span className="text-navy">{value}</span>
    </div>
  )
}

/** Agreed price, deposit, invoices and the unlock switch for one request. */
function MoneyPanel({
  r,
  invoices,
  onChanged,
}: {
  r: ServiceRequestRow
  invoices: RequestInvoice[]
  onChanged: () => void
}) {
  const { lang } = useLanguage()
  const tx = (a: string, e: string) => (lang === 'ar' ? a : e)
  const [price, setPrice] = useState(r.agreed_price_cents != null ? String(r.agreed_price_cents / 100) : '')
  const [pct, setPct] = useState(String(r.deposit_percent ?? 50))
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const m = moneySummary(r, invoices)
  const migrated = r.deposit_percent !== undefined

  if (!migrated)
    return (
      <div className="mb-3 rounded-lg bg-gold/10 p-3 text-[12.5px] text-navy">
        {tx('لتفعيل المقدم والدفعة النهائية شغّل ملف SQL رقم 0075 في Supabase.', 'Run SQL migration 0075 in Supabase to enable deposits and final payments.')}
      </div>
    )

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    setErr('')
    try {
      await fn()
      onChanged()
    } catch (e) {
      setErr(e instanceof Error ? e.message : tx('حدث خطأ', 'Something went wrong'))
    } finally {
      setBusy('')
    }
  }

  const priceCents = Math.round(Number(price) * 100)
  const pctNum = Math.min(100, Math.max(0, Math.round(Number(pct) || 0)))
  const depositCents = m.agreed != null ? Math.round((m.agreed * (r.deposit_percent ?? 50)) / 100) : 0
  const paidPct = m.agreed ? Math.min(100, Math.round((m.paid / m.agreed) * 100)) : 0

  return (
    <div className="mb-3 rounded-lg bg-bg-soft p-3">
      <div className="mb-2 text-[13px] font-bold text-navy">💰 {tx('الاتفاق المالي', 'Deal & payments')}</div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11.5px] font-semibold text-muted">
          {tx('السعر المتفق عليه (ر.س)', 'Agreed price (SAR)')}
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 block w-36 rounded-md border border-border bg-white px-2.5 py-1.5 text-[13px] text-navy"
          />
        </label>
        <label className="text-[11.5px] font-semibold text-muted">
          {tx('نسبة المقدم %', 'Deposit %')}
          <input
            type="number"
            min={0}
            max={100}
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className="mt-1 block w-20 rounded-md border border-border bg-white px-2.5 py-1.5 text-[13px] text-navy"
          />
        </label>
        <button
          type="button"
          disabled={busy !== '' || !(priceCents > 0)}
          onClick={() =>
            void run('deal', async () => {
              await saveRequestDeal(r.id, priceCents, pctNum)
              if (r.status === 'pending') await updateRequestStatus(r.id, 'negotiating')
            })
          }
          className="rounded-md border border-navy px-3.5 py-1.75 text-[12.5px] font-semibold text-navy hover:bg-white disabled:opacity-50"
        >
          {busy === 'deal' ? '...' : tx('حفظ الاتفاق', 'Save deal')}
        </button>
      </div>

      {m.agreed != null && (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${paidPct}%` }} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-navy">
            <span>
              {tx('المدفوع', 'Paid')}: <b><Price cents={m.paid} /></b>
            </span>
            <span>
              {tx('من', 'of')} <b><Price cents={m.agreed} /></b>
            </span>
            <span className={m.remaining ? 'text-accent' : 'text-success'}>
              {tx('المتبقي', 'Remaining')}: <b><Price cents={m.remaining ?? 0} /></b>
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {!m.hasDeposit && depositCents > 0 && (
              <button
                type="button"
                disabled={busy !== ''}
                onClick={() => void run('dep', () => createRequestInvoice(r.id, 'deposit', depositCents))}
                className="rounded-md bg-navy px-3.5 py-1.75 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
              >
                {busy === 'dep' ? '...' : <>💳 {tx('أصدر فاتورة المقدم', 'Issue deposit invoice')} (<Price cents={depositCents} />)</>}
              </button>
            )}
            {m.hasDeposit && (m.toInvoice ?? 0) > 0 && (
              <button
                type="button"
                disabled={busy !== ''}
                onClick={() => void run('fin', () => createRequestInvoice(r.id, 'final', m.toInvoice ?? 0))}
                className="rounded-md bg-navy px-3.5 py-1.75 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
              >
                {busy === 'fin' ? '...' : <>💰 {tx('أصدر الفاتورة النهائية', 'Issue final invoice')} (<Price cents={m.toInvoice ?? 0} />)</>}
              </button>
            )}
          </div>
        </>
      )}

      {invoices.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {invoices.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-[12.5px]">
              <span className="text-navy">
                {i.kind === 'deposit' ? tx('المقدم', 'Deposit') : i.kind === 'final' ? tx('الدفعة النهائية', 'Final') : i.title} ·{' '}
                <b><Price cents={i.amount_cents} /></b>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${INVOICE_STATUS[i.status][2]}`}>
                {INVOICE_STATUS[i.status][lang === 'ar' ? 0 : 1]}
              </span>
            </li>
          ))}
          {invoices.some((i) => i.status === 'submitted') && (
            <Link to="/owner/billing" className="text-[12.5px] font-semibold text-accent">
              {tx('← راجع الإيصال وأكّد الدفع من صفحة الفواتير', '→ Review the receipt and confirm it on the Billing page')}
            </Link>
          )}
        </ul>
      )}

      <label className="mt-3 flex items-center gap-2 text-[12.5px] text-navy">
        <input
          type="checkbox"
          checked={!!r.deliverables_unlocked}
          disabled={busy !== ''}
          onChange={(e) => void run('unlock', () => setDeliverablesUnlocked(r.id, e.target.checked))}
        />
        {tx('فتح الملفات النهائية للطالب يدويًا (مثلًا دفع نقدًا)', 'Unlock final files manually (e.g. paid in cash)')}
      </label>
      {err && <div className="mt-2 text-[12.5px] text-error">{err}</div>}
    </div>
  )
}

function NoteBox({ r, onSaved }: { r: ServiceRequestRow; onSaved: () => void }) {
  const { lang } = useLanguage()
  const tx = (a: string, e: string) => (lang === 'ar' ? a : e)
  const [note, setNote] = useState(r.owner_note ?? '')
  const [saved, setSaved] = useState(false)
  if (r.deposit_percent === undefined) return null
  const dirty = note !== (r.owner_note ?? '')
  return (
    <div className="mb-3">
      <label className="mb-1 block text-[11.5px] font-semibold text-muted">🗒 {tx('ملاحظات داخلية (لك فقط)', 'Internal notes (only you)')}</label>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value)
          setSaved(false)
        }}
        rows={2}
        className="w-full rounded-md border border-border px-3 py-2 text-[13px]"
      />
      {(dirty || saved) && (
        <button
          type="button"
          onClick={() =>
            void saveOwnerNote(r.id, note).then(() => {
              setSaved(true)
              onSaved()
            })
          }
          className="mt-1 rounded-md bg-navy px-3 py-1.5 text-[12px] font-semibold text-white"
        >
          {saved && !dirty ? tx('تم الحفظ ✓', 'Saved ✓') : tx('حفظ الملاحظة', 'Save note')}
        </button>
      )}
    </div>
  )
}

/** What the assigned expert earns from this request, and paying it out. */
function PayoutPanel({
  r,
  payout,
  expert,
  onChanged,
}: {
  r: ServiceRequestRow
  payout: RequestPayout | null
  expert: ExpertProfile | null
  onChanged: () => void
}) {
  const { lang } = useLanguage()
  const tx = (a: string, e: string) => (lang === 'ar' ? a : e)
  const price = r.agreed_price_cents ?? r.final_price_cents ?? r.packagePriceCents ?? null
  const share = expert?.share_percent ?? 50
  const suggested = price != null ? Math.round((price * share) / 100) : null
  const [amount, setAmount] = useState(payout ? String(payout.amount_cents / 100) : suggested != null ? String(suggested / 100) : '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const stale = payout && payout.teacher_id !== r.assigned_teacher_id

  const save = async () => {
    const cents = Math.round(Number(amount) * 100)
    if (!Number.isFinite(cents) || cents < 0) return setMsg(tx('أدخل مبلغًا صحيحًا.', 'Enter a valid amount.'))
    setBusy(true)
    setMsg('')
    try {
      await setPayout(r.id, r.assigned_teacher_id!, cents)
      onChanged()
    } catch {
      setMsg(tx('تعذّر الحفظ — تأكد من تشغيل ملف قاعدة البيانات 0077.', 'Could not save — run migration 0077.'))
    } finally {
      setBusy(false)
    }
  }

  const pay = async () => {
    if (!payout) return
    if (!confirm(tx(`تأكيد صرف ${payout.amount_cents / 100} ريال للمدرّب؟ سيُسجَّل تلقائيًا كمصروف «مستحقات المدرّبين».`, `Confirm paying ${payout.amount_cents / 100} SAR? It will be recorded as a trainer & trainer fees expense.`)))
      return
    setBusy(true)
    setMsg('')
    try {
      await markPayoutPaid(r.id)
      onChanged()
    } catch {
      setMsg(tx('تعذّر تسجيل الصرف.', 'Could not record the payout.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-3 rounded-lg border border-gold/40 bg-gold/[0.06] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12.5px] font-bold text-navy">💼 {tx('مستحقات المدرّب', 'Trainer payout')}</span>
        {payout?.paid_at ? (
          <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-[11.5px] font-semibold text-success">
            ✓ {tx('تم الصرف', 'Paid')} · {new Date(payout.paid_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
          </span>
        ) : payout ? (
          <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[11.5px] font-semibold text-accent">{tx('لم تُصرف بعد', 'Not paid yet')}</span>
        ) : null}
      </div>
      {payout?.paid_at ? (
        <div className="text-[13px] text-navy">
          <Price cents={payout.amount_cents} locale={lang === 'ar' ? 'ar-SA' : 'en-US'} />
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11.5px] font-semibold text-muted">
            {tx('المبلغ (ريال)', 'Amount (SAR)')}
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-32 rounded-md border border-border bg-white px-2.5 py-1.5 text-[13px] text-navy"
            />
          </label>
          <button onClick={() => void save()} disabled={busy} className="rounded-md bg-navy px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60">
            {payout ? tx('تحديث', 'Update') : tx('حفظ', 'Save')}
          </button>
          {payout && !stale && (
            <button
              onClick={() => void pay()}
              disabled={busy || r.status !== 'done'}
              title={r.status !== 'done' ? tx('يُصرف بعد اكتمال الطلب ودفع العميل', 'Pay once the request is done and paid') : ''}
              className="rounded-md bg-success px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {tx('تم صرف المستحقات', 'Mark paid')}
            </button>
          )}
          {suggested != null && (
            <span className="text-[11.5px] text-muted">
              {tx(`المقترح: ${share}% من السعر = ${suggested / 100} ريال`, `Suggested: ${share}% of price = ${suggested / 100} SAR`)}
            </span>
          )}
        </div>
      )}
      {stale && <div className="mt-1.5 text-[12px] text-error">{tx('تغيّر المدرّب المسند — احفظ المبلغ من جديد ليُنسب للمدرّب الحالي.', 'The trainer changed — save again to attribute it to the current trainer.')}</div>}
      {msg && <div className="mt-1.5 text-[12px] text-error">{msg}</div>}
    </div>
  )
}

export function OwnerServiceRequestsPage() {
  const { t, lang } = useLanguage()
  const tx = (a: string, e: string) => (lang === 'ar' ? a : e)
  const queryClient = useQueryClient()
  const { data: requests, isLoading } = useQuery({ queryKey: ['service-requests'], queryFn: listServiceRequests })
  const ids = useMemo(() => (requests ?? []).map((r) => r.id), [requests])
  const { data: invoices } = useQuery({
    queryKey: ['request-invoices', ids],
    enabled: ids.length > 0,
    queryFn: () => listRequestInvoices(ids),
  })
  const { data: teachers } = useQuery({ queryKey: ['active-teachers'], queryFn: listActiveTeachers })
  const { data: experts } = useQuery({ queryKey: ['expert-profiles'], queryFn: listExpertProfiles })
  // null = migration 0079 pending (agreement not enforced yet).
  const { data: signers } = useQuery({ queryKey: ['consultant-agreement-signers'], queryFn: listAgreementSigners })
  const unsigned = (id: string) => !!signers && !signers.has(id)
  const { data: payouts } = useQuery({
    queryKey: ['request-payouts', ids],
    enabled: ids.length > 0,
    queryFn: () => listPayouts(ids),
  })
  // Experts who deliver this service first, then the least busy.
  const rankExperts = (serviceId: string) => {
    const activeCount = (id: string) => (requests ?? []).filter((x) => x.assigned_teacher_id === id && ACTIVE_STAGES.includes(x.status)).length
    return (teachers ?? [])
      .filter((tt) => tt.username !== AI_BOT_USERNAME)
      .map((tt) => ({ tt, match: !!experts?.[tt.id]?.service_ids.includes(serviceId), active: activeCount(tt.id) }))
      .sort((a, b) => Number(b.match) - Number(a.match) || a.active - b.active || a.tt.name.localeCompare(b.tt.name))
  }
  const [tab, setTab] = useState<RequestStatus | 'all'>('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['service-requests'] })
    void queryClient.invalidateQueries({ queryKey: ['request-invoices'] })
  }

  const counts = useMemo(() => {
    const c: Partial<Record<RequestStatus, number>> = {}
    for (const r of requests ?? []) c[stageTab(r.status)] = (c[stageTab(r.status)] ?? 0) + 1
    return c
  }, [requests])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (requests ?? []).filter((r) => {
      if (tab !== 'all' && stageTab(r.status) !== tab) return false
      if (!needle) return true
      return [r.full_name, r.phone, r.email, r.subject, r.serviceTitle].some((v) => (v ?? '').toLowerCase().includes(needle))
    })
  }, [requests, tab, q])

  const remove = async (id: string) => {
    if (!confirm(t('myRequests.confirmDelete'))) return
    setDeletingId(id)
    setError('')
    try {
      await deleteServiceRequest(id)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('myRequests.deleteError'))
    } finally {
      setDeletingId(null)
    }
  }

  const setStatus = async (id: string, status: RequestStatus) => {
    await updateRequestStatus(id, status)
    // Fire-and-forget: the status is saved; a mail hiccup mustn't fail the action.
    if (status === 'done') void notifyRequestDone(id)
    refresh()
  }

  const openFile = async (path: string) => {
    const url = await signRequestFile(path)
    if (url) window.open(url, '_blank')
  }

  const tabBtn = (key: RequestStatus | 'all', label: string, n: number) => (
    <button
      key={key}
      type="button"
      onClick={() => setTab(key)}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold ${
        tab === key ? 'bg-navy text-white' : 'border border-border bg-white text-navy hover:border-navy'
      }`}
    >
      {label}
      {n > 0 && <span className={`ms-1.5 ${tab === key ? 'text-gold' : 'text-muted'}`}>{n}</span>}
    </button>
  )

  return (
    <div>
      <div className="mb-4 font-heading text-xl font-bold text-navy">{t('adminRequests.title')}</div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {tabBtn('all', tx('الكل', 'All'), (requests ?? []).length)}
        {STAGE_ORDER.map((s) => tabBtn(s, `${STAGE_ICONS[s]} ${stageLabel(s, lang)}`, counts[s] ?? 0))}
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tx('بحث بالاسم أو الجوال أو الإيميل أو الموضوع', 'Search name, phone, email or subject')}
        className="mb-4 w-full max-w-md rounded-lg border border-border px-3.5 py-2.5 text-[13.5px]"
      />

      {isLoading && <LoadingState />}
      {requests && requests.length === 0 && <EmptyState title={t('adminRequests.empty')} />}
      {requests && requests.length > 0 && shown.length === 0 && (
        <div className="py-8 text-center text-[13.5px] text-muted">{tx('لا توجد طلبات هنا.', 'No requests here.')}</div>
      )}
      {error && <div className="mb-3 text-[13.5px] text-error">{error}</div>}

      <div className="flex flex-col gap-3">
        {shown.map((r) => {
          const inv = invoices?.[r.id] ?? []
          const m = moneySummary(r, inv)
          const open = openId === r.id
          const wa = waNumber(r.phone)
          return (
            <div key={r.id} className={`rounded-xl border bg-white ${open ? 'border-navy' : 'border-border'}`}>
              {/* Collapsed header: who, what, stage, money at a glance. */}
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-start"
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-navy">
                    {r.full_name || '—'} <span className="font-normal text-muted">· {r.subject}</span>
                  </div>
                  <div className="text-[12.5px] text-muted">
                    {r.serviceTitle}
                    {r.packageTitle ? ` · ${r.packageTitle}` : ''} · {new Date(r.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB')}
                    {r.assigneeName ? ` · 👤 ${r.assigneeName}` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.agreed != null && (
                    <span className="text-[12px] text-muted">
                      <Price cents={m.paid} /> / <Price cents={m.agreed} />
                    </span>
                  )}
                  {inv.some((i) => i.status === 'submitted') && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">🧾 {tx('إيصال جديد', 'New receipt')}</span>
                  )}
                  <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${STAGE_STYLES[r.status]}`}>
                    {STAGE_ICONS[r.status]} {stageLabel(r.status, lang)}
                  </span>
                  <span className="text-muted">{open ? '▴' : '▾'}</span>
                </div>
              </button>

              {open && (
                <div className="border-t border-border-2 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {wa && (
                      <a
                        href={`https://wa.me/${wa}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md bg-[#1fa855] px-3 py-1.5 text-[12.5px] font-semibold text-white no-underline"
                      >
                        {tx('واتساب', 'WhatsApp')}
                      </a>
                    )}
                    {r.email && (
                      <a href={`mailto:${r.email}`} className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy no-underline hover:border-navy">
                        ✉ {r.email}
                      </a>
                    )}
                    {r.phone && <span dir="ltr" className="text-[12.5px] text-muted">{r.phone}</span>}
                  </div>

                  <div className="mb-3 grid grid-cols-1 gap-1.5 text-[13px] sm:grid-cols-2">
                    <Field label={t('adminRequests.deliveryBy')} value={r.delivery_date} />
                    <Field label={t('service.purpose')} value={r.purpose} />
                    <Field label={t('service.audience')} value={r.target_audience} />
                    <Field label={t('service.language')} value={r.language} />
                    <Field label={t('service.slides')} value={r.quantity} />
                    <Field label={t('service.colors')} value={r.brand_colors} />
                    {r.details?.software && <Field label={t('service.software')} value={r.details.software} />}
                  </div>

                  {r.custom_answers && r.custom_answers.length > 0 && (
                    <div className="mb-3 flex flex-col gap-1.5 rounded-md bg-bg-soft p-3 text-[13px]">
                      {r.custom_answers.map((a, i) => (
                        <div key={i}>
                          <span className="font-semibold text-muted">{a.label}: </span>
                          {a.type === 'file' ? (
                            <button onClick={() => void openFile(a.value)} className="text-navy underline underline-offset-2">
                              {a.fileName || t('adminRequests.openFile')}
                            </button>
                          ) : (
                            <span className="whitespace-pre-wrap text-navy">{a.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {r.content_text && (
                    <div className="mb-3 whitespace-pre-wrap rounded-md bg-bg-soft p-3 text-[13px] leading-7 text-muted-2">{r.content_text}</div>
                  )}

                  <div className="mb-3 flex flex-wrap gap-2">
                    {r.content_file_url && (
                      <button onClick={() => void openFile(r.content_file_url!)} className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy hover:border-navy">
                        {t('adminRequests.openFile')}
                      </button>
                    )}
                    {r.reference_file_url && (
                      <button onClick={() => void openFile(r.reference_file_url!)} className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy hover:border-navy">
                        {t('service.referenceFile')}
                      </button>
                    )}
                    {r.reference_url && (
                      <a href={r.reference_url} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy no-underline hover:border-navy">
                        {t('service.referenceUrl')}
                      </a>
                    )}
                  </div>

                  <MoneyPanel key={`${r.id}-${r.agreed_price_cents}-${r.deposit_percent}`} r={r} invoices={inv} onChanged={refresh} />

                  <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg bg-bg-soft p-3">
                    <label className="text-[11.5px] font-semibold text-muted">
                      {t('adminRequests.assignee')}
                      <select
                        value={r.assigned_teacher_id ?? ''}
                        onChange={(e) =>
                          void assignRequestTeacher(r.id, e.target.value || null)
                            .then(refresh)
                            .catch((err: unknown) =>
                              setError(
                                String((err as { message?: string })?.message ?? '').includes('consultant_agreement_missing')
                                  ? tx('لا يمكن الإسناد: هذا المدرّب لم يوافق على اتفاقية المدرّب بعد. سيظهر له طلب الموافقة عند دخوله لوحته.', 'Cannot assign: this trainer has not accepted the Trainer Agreement yet. They will be asked to accept it on their next sign-in.')
                                  : tx('تعذّر إسناد الطلب — حاول مرة أخرى.', 'Could not assign — try again.'),
                              ),
                            )
                        }
                        className="mt-1 block w-64 rounded-md border border-border bg-white px-2.5 py-1.5 text-[13px] text-navy"
                      >
                        <option value="">{t('adminRequests.unassigned')}</option>
                        {rankExperts(r.service_id).map(({ tt, match, active }) => (
                          <option key={tt.id} value={tt.id} disabled={unsigned(tt.id) && tt.id !== r.assigned_teacher_id}>
                            {match ? '⭐ ' : ''}
                            {tt.name} · {tx(`${active} نشط`, `${active} active`)}
                            {unsigned(tt.id) ? tx(' · ⚠️ لم يوقّع الاتفاقية', ' · ⚠️ agreement not signed') : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11.5px] font-semibold text-muted">
                      {tx('نقل إلى مرحلة', 'Move to stage')}
                      <select
                        value={stageTab(r.status)}
                        onChange={(e) => void setStatus(r.id, e.target.value as RequestStatus)}
                        className="mt-1 block w-52 rounded-md border border-border bg-white px-2.5 py-1.5 text-[13px] text-navy"
                      >
                        {STAGE_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {STAGE_ICONS[s]} {stageLabel(s, lang)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {r.assigned_teacher_id && (
                    <PayoutPanel
                      key={`${r.id}-${r.assigned_teacher_id}-${payouts?.[r.id]?.amount_cents ?? 'none'}`}
                      r={r}
                      payout={payouts?.[r.id] ?? null}
                      expert={experts?.[r.assigned_teacher_id] ?? null}
                      onChanged={() => void queryClient.invalidateQueries({ queryKey: ['request-payouts'] })}
                    />
                  )}

                  {r.deposit_percent !== undefined && <DeliverablesBox requestId={r.id} manage locked={!m.settled} />}

                  {/* The same workspace the student and expert see: you can follow
                      the conversation, sessions and tasks, and step in. */}
                  <div className="mt-4 border-t border-border-2 pt-4">
                    <div className="mb-1 text-[13.5px] font-bold text-navy">💬 {tx('المحادثة ومساحة العمل', 'Conversation & workspace')}</div>
                    <div className="mb-3 text-[12px] text-muted">
                      {r.assigned_teacher_id
                        ? tx('ما تكتبه هنا يصل للعميل وللمدرّب المسند.', 'What you write here reaches the client and the assigned trainer.')
                        : tx('لا يوجد مدرّب مسند بعد — المحادثة الآن بينك وبين العميل.', 'No trainer yet — this conversation is between you and the client.')}
                    </div>
                    <ServiceWorkspace requestId={r.id} manage isStudent={false} />
                  </div>

                  <NoteBox key={`${r.id}-${r.owner_note ?? ''}`} r={r} onSaved={refresh} />

                  <div className="flex items-center justify-end border-t border-border-2 pt-3">
                    {canDeleteRequest(r.status) ? (
                      <button
                        onClick={() => void remove(r.id)}
                        disabled={deletingId === r.id}
                        className="rounded-md border border-error px-3.5 py-1.5 text-[12.5px] text-error hover:bg-error-bg disabled:opacity-50"
                      >
                        {deletingId === r.id ? '...' : t('myRequests.delete')}
                      </button>
                    ) : (
                      <span className="text-[11.5px] text-faint">{t('myRequests.cannotDeletePaid')}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
