import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { fetchSiteContent } from '@/lib/content'
import {
  DEFAULT_SERVICE_DETAILS,
  EMPTY_SERVICE_DETAILS,
  resolveSavedServiceDetails,
  saveServiceDetails,
  type ServiceDetails,
} from '@/lib/serviceDetails'

type Field = Exclude<keyof ServiceDetails, 'price_from'>

/**
 * Owner editor for one service's "Details" window (public Services section).
 * Collapsed by default; saves this service's entry into the shared
 * site_content JSON (re-reading the latest map first so other services'
 * entries are never overwritten).
 */
export function ServiceDetailsEditor({ service }: { service: { id: string; slug: string } }) {
  const { lang } = useLanguage()
  const tx = (a: string, e: string) => (lang === 'ar' ? a : e)
  const queryClient = useQueryClient()
  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ServiceDetails | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const saved = resolveSavedServiceDetails(content)[service.id]
  const initial = saved ?? DEFAULT_SERVICE_DETAILS[service.slug] ?? EMPTY_SERVICE_DETAILS
  const d = draft ?? initial
  const set = (k: Field, v: string) => {
    setDraft({ ...d, [k]: v })
    setMsg('')
  }

  const save = async (value: ServiceDetails | null) => {
    setBusy(true)
    setMsg('')
    try {
      const latest = resolveSavedServiceDetails(await fetchSiteContent())
      if (value) latest[service.id] = value
      else delete latest[service.id]
      await saveServiceDetails(latest)
      await queryClient.invalidateQueries({ queryKey: ['site-content'] })
      setDraft(null)
      setMsg(tx('تم الحفظ ✓', 'Saved ✓'))
    } catch {
      setMsg(tx('تعذّر الحفظ', 'Could not save'))
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full rounded-md border border-border bg-white px-3 py-2 text-[13px]'
  const pair = (base: string, labelAr: string, labelEn: string, rows?: number, hint?: string) => {
    const a = `${base}_ar` as Field
    const e = `${base}_en` as Field
    return (
      <div>
        <div className="mb-1 text-[12.5px] font-semibold text-navy">
          {tx(labelAr, labelEn)}
          {hint && <span className="ms-1.5 font-normal text-muted">({hint})</span>}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rows ? (
            <>
              <textarea value={d[a]} onChange={(ev) => set(a, ev.target.value)} rows={rows} placeholder="العربية" className={`${field} resize-y`} />
              <textarea dir="ltr" value={d[e]} onChange={(ev) => set(e, ev.target.value)} rows={rows} placeholder="English" className={`${field} resize-y`} />
            </>
          ) : (
            <>
              <input value={d[a]} onChange={(ev) => set(a, ev.target.value)} placeholder="العربية" className={field} />
              <input dir="ltr" value={d[e]} onChange={(ev) => set(e, ev.target.value)} placeholder="English" className={field} />
            </>
          )}
        </div>
      </div>
    )
  }
  const perLine = tx('كل بند في سطر', 'one item per line')

  return (
    <div className="mb-3 rounded-lg border border-gold/40 bg-gold/[0.04]">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-start">
        <span className="text-[13px] font-bold text-navy">
          📄 {tx('تفاصيل الخدمة (النافذة في صفحة الخدمات)', 'Service details (window on the Services page)')}
          {!saved && DEFAULT_SERVICE_DETAILS[service.slug] && <span className="ms-2 text-[11.5px] font-normal text-muted">{tx('— محتوى افتراضي', '— default content')}</span>}
          {!saved && !DEFAULT_SERVICE_DETAILS[service.slug] && <span className="ms-2 text-[11.5px] font-normal text-muted">{tx('— غير مضافة (لا يظهر زر التفاصيل)', '— not set (no Details button)')}</span>}
        </span>
        <span className="text-muted">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3.5 border-t border-gold/30 p-3.5">
          <div className="text-[12px] leading-6 text-muted">
            {tx('إذا تركت «النبذة» فارغة يُعرض وصف الخدمة أعلاه. أول 4 بنود من «ما تشمله الخدمة» تظهر في البطاقة.', 'If “Overview” is empty, the service description above is shown. The first 4 “What’s included” items show on the card.')}
          </div>
          <div>
            <div className="mb-1 text-[12.5px] font-semibold text-navy">
              {tx('السعر يبدأ من (ر.س)', 'Starting price (SAR)')}{' '}
              <span className="font-normal text-muted">({tx('اختياري — يظهر «يبدأ من» بدل «السعر عند الطلب»', 'optional — shows “Starting from” instead of “on request”')})</span>
            </div>
            <input
              type="number"
              min={0}
              dir="ltr"
              value={d.price_from ?? ''}
              onChange={(ev) => {
                const v = ev.target.value === '' ? null : Math.max(0, Math.round(Number(ev.target.value))) || null
                setDraft({ ...d, price_from: v })
                setMsg('')
              }}
              placeholder={tx('مثال: 500', 'e.g. 500')}
              className={`${field} w-48`}
            />
          </div>
          {pair('overview', 'النبذة (فقرة مختصرة)', 'Overview (short paragraph)', 3)}
          {pair('audience', 'لمن هذه الخدمة (سطر واحد)', 'Who it’s for (one line)')}
          {pair('duration', 'المدة', 'Duration')}
          {pair('format', 'طريقة التقديم', 'Delivery')}
          {pair('features', 'ما تشمله الخدمة', 'What’s included', 5, perLine)}
          {pair('deliverables', 'المخرجات والتسليمات', 'Deliverables', 4, perLine)}
          {pair('our_commitments', 'التزاماتنا', 'Our commitments', 4, perLine)}
          {pair('client_commitments', 'التزامات العميل', 'Client commitments', 4, perLine)}
          {pair('terms', 'الشروط والأحكام', 'Terms & conditions', 4, perLine)}
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {msg && <span className="text-[12px] text-navy">{msg}</span>}
            {draft && <span className="text-[12px] text-gold">{tx('تعديلات غير محفوظة', 'Unsaved changes')}</span>}
            {saved && (
              <button
                onClick={() => {
                  if (confirm(tx('حذف التفاصيل المحفوظة لهذه الخدمة؟', 'Remove the saved details for this service?'))) void save(null)
                }}
                disabled={busy}
                className="rounded-md border border-border px-3 py-1.5 text-[12px] text-muted hover:border-navy disabled:opacity-50"
              >
                {tx('حذف / استعادة الافتراضي', 'Remove / restore default')}
              </button>
            )}
            <button
              onClick={() => void save(d)}
              disabled={busy || (!draft && !!saved)}
              className="rounded-md bg-navy px-4 py-1.75 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
            >
              {busy ? '...' : tx('حفظ التفاصيل', 'Save details')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
