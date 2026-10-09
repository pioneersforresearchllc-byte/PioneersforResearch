import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { fetchSiteContent } from '@/lib/content'
import { DEFAULT_ORG_PACKAGES, newOrgPackage, resolveOrgPackages, saveOrgPackages, type OrgPackage } from '@/lib/orgPackages'

type TextField = Exclude<keyof OrgPackage, 'id' | 'price_from' | 'featured' | 'active'>

/**
 * Owner editor for the program packages on the public /institutions page.
 * Edits the whole list locally, then saves it in one go (site_content JSON).
 */
export function OrgPackagesEditor() {
  const { lang } = useLanguage()
  const tx = (a: string, e: string) => (lang === 'ar' ? a : e)
  const queryClient = useQueryClient()
  const { data: content, isLoading } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  if (isLoading) return null
  return <EditorBody key={content ? 'loaded' : 'empty'} initial={resolveOrgPackages(content)} tx={tx} onSaved={() => void queryClient.invalidateQueries({ queryKey: ['site-content'] })} />
}

function EditorBody({ initial, tx, onSaved }: { initial: OrgPackage[]; tx: (a: string, e: string) => string; onSaved: () => void }) {
  const [list, setList] = useState<OrgPackage[]>(initial)
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'' | 'saved' | 'error'>('')
  const [dirty, setDirty] = useState(false)

  const change = (next: OrgPackage[]) => {
    setList(next)
    setDirty(true)
    setStatus('')
  }
  const patch = (id: string, values: Partial<OrgPackage>) => change(list.map((p) => (p.id === id ? { ...p, ...values } : p)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    change(next)
  }
  const remove = (p: OrgPackage) => {
    if (!confirm(tx(`حذف باقة «${p.name_ar || p.name_en}»؟`, `Delete package “${p.name_en || p.name_ar}”?`))) return
    change(list.filter((x) => x.id !== p.id))
  }
  const add = () => {
    const p = newOrgPackage()
    change([...list, p])
    setOpen(p.id)
  }
  const restore = () => {
    if (!confirm(tx('استعادة الباقات الافتراضية؟ ستحلّ محل الباقات الحالية بعد الضغط على «حفظ الباقات».', 'Restore the default packages? This replaces your edits once you save.'))) return
    change(DEFAULT_ORG_PACKAGES)
  }
  const save = async () => {
    setBusy(true)
    setStatus('')
    try {
      await saveOrgPackages(list)
      setStatus('saved')
      setDirty(false)
      onSaved()
    } catch {
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full rounded-md border border-border bg-white px-3 py-2 text-[13.5px]'
  const pair = (p: OrgPackage, base: string, labelAr: string, labelEn: string, multi?: number, hint?: string) => {
    const a = `${base}_ar` as TextField
    const e = `${base}_en` as TextField
    return (
      <div>
        <div className="mb-1 text-[12.5px] font-semibold text-navy">
          {tx(labelAr, labelEn)}
          {hint && <span className="ms-1.5 font-normal text-muted">({hint})</span>}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {multi ? (
            <>
              <textarea value={p[a]} onChange={(ev) => patch(p.id, { [a]: ev.target.value })} rows={multi} placeholder="العربية" className={`${field} resize-y`} />
              <textarea dir="ltr" value={p[e]} onChange={(ev) => patch(p.id, { [e]: ev.target.value })} rows={multi} placeholder="English" className={`${field} resize-y`} />
            </>
          ) : (
            <>
              <input value={p[a]} onChange={(ev) => patch(p.id, { [a]: ev.target.value })} placeholder="العربية" className={field} />
              <input dir="ltr" value={p[e]} onChange={(ev) => patch(p.id, { [e]: ev.target.value })} placeholder="English" className={field} />
            </>
          )}
        </div>
      </div>
    )
  }
  const perLine = tx('كل بند في سطر', 'one item per line')

  return (
    <div className="mb-8 rounded-xl border border-gold/40 bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[15.5px] font-bold text-navy">{tx('باقات صفحة المؤسسات', 'Institutions page packages')}</div>
        <div className="flex flex-wrap gap-2">
          <a href="/institutions#packages" target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy no-underline hover:border-navy">
            {tx('معاينة الصفحة', 'Preview page')}
          </a>
          <button onClick={restore} className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy hover:border-navy">
            {tx('استعادة الافتراضي', 'Restore defaults')}
          </button>
          <button onClick={add} className="rounded-md bg-navy px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-navy-hover">
            {tx('+ باقة جديدة', '+ New package')}
          </button>
        </div>
      </div>
      <div className="mb-4 text-[12.5px] leading-6 text-muted">
        {tx(
          'تظهر في صفحة «للمؤسسات». اترك السعر فارغًا ليظهر «حسب احتياج الجهة». القوائم: كل بند في سطر مستقل. لا تُنشر التعديلات إلا بعد الضغط على «حفظ الباقات».',
          'Shown on the “For organizations” page. Leave price empty to show “Tailored to your needs”. Lists: one item per line. Changes go live only after “Save packages”.',
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {list.map((p, i) => {
          const isOpen = open === p.id
          return (
            <div key={p.id} className={`rounded-lg border ${isOpen ? 'border-navy' : 'border-border-2'} bg-bg-soft`}>
              <div className="flex flex-wrap items-center gap-2 p-3">
                <span className="w-6 text-center text-[12px] font-bold text-gold" dir="ltr">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <button onClick={() => setOpen(isOpen ? null : p.id)} className="min-w-0 flex-1 text-start text-[14px] font-semibold text-navy">
                  {p.name_ar || p.name_en || tx('(بدون اسم)', '(untitled)')}
                  {p.featured && <span className="ms-2 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] text-navy">{tx('مميّزة', 'Featured')}</span>}
                  {!p.active && <span className="ms-2 rounded-full bg-navy/10 px-2 py-0.5 text-[11px] text-muted">{tx('مخفية', 'Hidden')}</span>}
                </button>
                <button onClick={() => move(i, -1)} disabled={i === 0} className="h-8 w-8 rounded-md border border-border bg-white text-[13px] disabled:opacity-30" aria-label="up">
                  ↑
                </button>
                <button onClick={() => move(i, 1)} disabled={i === list.length - 1} className="h-8 w-8 rounded-md border border-border bg-white text-[13px] disabled:opacity-30" aria-label="down">
                  ↓
                </button>
                <button onClick={() => setOpen(isOpen ? null : p.id)} className="rounded-md border border-border bg-white px-3 py-1.5 text-[12.5px] text-navy hover:border-navy">
                  {isOpen ? tx('إغلاق', 'Close') : tx('تعديل', 'Edit')}
                </button>
                <button onClick={() => remove(p)} className="rounded-md border border-error px-3 py-1.5 text-[12.5px] text-error hover:bg-error-bg">
                  {tx('حذف', 'Delete')}
                </button>
              </div>

              {isOpen && (
                <div className="flex flex-col gap-3.5 border-t border-border-2 p-4">
                  <div className="text-[12px] font-bold tracking-wide text-accent">{tx('بيانات البطاقة', 'CARD')}</div>
                  {pair(p, 'name', 'اسم الباقة', 'Package name')}
                  {pair(p, 'duration', 'المدة', 'Duration')}
                  {pair(p, 'audience', 'لمن هذه الباقة (سطر واحد)', 'Who it’s for (one line)')}
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <div className="mb-1 text-[12.5px] font-semibold text-navy">
                        {tx('السعر يبدأ من (ر.س)', 'Starting price (SAR)')} <span className="font-normal text-muted">({tx('اختياري', 'optional')})</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        dir="ltr"
                        value={p.price_from ?? ''}
                        onChange={(ev) => patch(p.id, { price_from: ev.target.value === '' ? null : Math.max(0, Number(ev.target.value)) || null })}
                        placeholder={tx('فارغ = حسب الاحتياج', 'empty = tailored')}
                        className={`${field} w-48`}
                      />
                    </div>
                    <label className="flex items-center gap-2 pb-2 text-[13px] text-navy">
                      <input type="checkbox" checked={p.featured} onChange={(ev) => patch(p.id, { featured: ev.target.checked })} />
                      {tx('باقة مميّزة («الأكثر طلبًا»)', 'Featured (“Most requested”)')}
                    </label>
                    <label className="flex items-center gap-2 pb-2 text-[13px] text-navy">
                      <input type="checkbox" checked={p.active} onChange={(ev) => patch(p.id, { active: ev.target.checked })} />
                      {tx('ظاهرة في الموقع', 'Visible on site')}
                    </label>
                  </div>

                  <div className="mt-2 text-[12px] font-bold tracking-wide text-accent">{tx('نافذة التفاصيل', 'DETAILS WINDOW')}</div>
                  {pair(p, 'description', 'نبذة عن الباقة', 'Overview', 3)}
                  {pair(p, 'format', 'طريقة التقديم', 'Delivery format')}
                  {pair(p, 'capacity', 'عدد المتدربين', 'Group size')}
                  {pair(p, 'features', 'ما يشمله البرنامج', 'What’s included', 5, tx('أول 4 بنود تظهر في البطاقة — ', 'first 4 show on the card — ') + perLine)}
                  {pair(p, 'deliverables', 'المخرجات والتسليمات', 'Deliverables', 4, perLine)}
                  {pair(p, 'our_commitments', 'التزاماتنا', 'Our commitments', 5, perLine)}
                  {pair(p, 'client_commitments', 'التزامات الجهة', 'Client commitments', 5, perLine)}
                  {pair(p, 'terms', 'الشروط والأحكام', 'Terms & conditions', 4, perLine)}
                </div>
              )}
            </div>
          )
        })}
        {list.length === 0 && <div className="text-[12.5px] text-muted">{tx('لا توجد باقات — لن يظهر قسم الباقات في الصفحة.', 'No packages — the section is hidden on the page.')}</div>}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        {dirty && <span className="text-[12px] text-gold">{tx('تعديلات غير محفوظة', 'Unsaved changes')}</span>}
        {status === 'saved' && <span className="text-[12px] text-success">{tx('تم الحفظ ✓', 'Saved ✓')}</span>}
        {status === 'error' && <span className="text-[12px] text-error">{tx('تعذّر الحفظ', 'Could not save')}</span>}
        <button
          onClick={() => void save()}
          disabled={busy || !dirty}
          className="rounded-md bg-navy px-5 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {busy ? '...' : tx('حفظ الباقات', 'Save packages')}
        </button>
      </div>
    </div>
  )
}
