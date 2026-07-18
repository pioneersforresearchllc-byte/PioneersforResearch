import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { listCoursesWithMeta } from '@/lib/courses'
import { listAllServicesForOwner } from '@/lib/services'
import {
  createDiscountCode,
  deleteDiscountCode,
  listDiscountCodes,
  updateDiscountCode,
  type DiscountCode,
} from '@/lib/discounts'

export function OwnerDiscountsPage() {
  const { t, lang } = useLanguage()
  const queryClient = useQueryClient()
  const { data: codes } = useQuery({ queryKey: ['discount-codes'], queryFn: listDiscountCodes })
  const { data: courses } = useQuery({ queryKey: ['owner-courses'], queryFn: listCoursesWithMeta })
  const { data: services } = useQuery({ queryKey: ['owner-services'], queryFn: listAllServicesForOwner })

  const [code, setCode] = useState('')
  const [percent, setPercent] = useState('')
  const [courseIds, setCourseIds] = useState<Set<string>>(new Set())
  const [serviceIds, setServiceIds] = useState<Set<string>>(new Set())
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['discount-codes'] })

  const serviceTitle = (s: { title: string; title_en: string | null }) =>
    (lang === 'en' ? s.title_en : s.title) || s.title

  const courseTitleById = (id: string) => courses?.find((c) => c.id === id)?.title ?? '—'
  const serviceTitleById = (id: string) => {
    const s = services?.find((x) => x.id === id)
    return s ? serviceTitle(s) : '—'
  }

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
  }

  const targetNames = (dc: DiscountCode): string =>
    dc.targets
      .map((tg) => (tg.course_id ? courseTitleById(tg.course_id) : tg.service_id ? serviceTitleById(tg.service_id) : '—'))
      .join('، ')

  const create = async () => {
    const pct = Number(percent)
    if (!code.trim() || Number.isNaN(pct) || pct < 1 || pct > 100) {
      setError(t('disc.fillFields'))
      return
    }
    if (courseIds.size === 0 && serviceIds.size === 0) {
      setError(t('disc.selectAtLeastOne'))
      return
    }
    setBusy(true)
    setError('')
    try {
      await createDiscountCode({
        code: code.trim(),
        percent_off: Math.round(pct),
        starts_at: startsAt ? `${startsAt}T00:00:00Z` : null,
        ends_at: endsAt ? `${endsAt}T23:59:59Z` : null,
        active: true,
        courseIds: [...courseIds],
        serviceIds: [...serviceIds],
      })
      setCode('')
      setPercent('')
      setCourseIds(new Set())
      setServiceIds(new Set())
      setStartsAt('')
      setEndsAt('')
      refresh()
    } catch {
      setError(t('disc.createError'))
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (dc: DiscountCode) => {
    await updateDiscountCode(dc.id, { active: !dc.active })
    refresh()
  }

  const remove = async (dc: DiscountCode) => {
    if (!confirm(t('disc.confirmDelete'))) return
    await deleteDiscountCode(dc.id)
    refresh()
  }

  const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US') : null)
  const inputClass = 'rounded-md border border-border px-3 py-2 text-[13.5px]'
  const checkboxList = 'max-h-40 overflow-y-auto rounded-md border border-border bg-white p-2'

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('disc.title')}</div>

      <div className="mb-6 rounded-xl border border-border bg-bg-soft p-4">
        <div className="mb-3 text-[14px] font-semibold text-navy">{t('disc.newTitle')}</div>
        <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('disc.codePh')} className={inputClass} />
          <input type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} placeholder={t('disc.percentPh')} className={inputClass} />
          <label className="flex flex-col gap-1 text-[11.5px] text-muted">
            {t('disc.startsAt')}
            <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] text-muted">
            {t('disc.endsAt')}
            <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="mb-1 text-[12.5px] font-semibold text-navy">{t('disc.pickTargets')}</div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[11.5px] text-muted">{t('disc.coursesLabel')}</div>
            <div className={checkboxList}>
              {(courses ?? []).map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-1 text-[13px] text-navy">
                  <input type="checkbox" checked={courseIds.has(c.id)} onChange={() => toggle(courseIds, setCourseIds, c.id)} />
                  <span className="truncate">{c.title}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[11.5px] text-muted">{t('disc.servicesLabel')}</div>
            <div className={checkboxList}>
              {(services ?? []).map((s) => (
                <label key={s.id} className="flex items-center gap-2 py-1 text-[13px] text-navy">
                  <input type="checkbox" checked={serviceIds.has(s.id)} onChange={() => toggle(serviceIds, setServiceIds, s.id)} />
                  <span className="truncate">{serviceTitle(s)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="mt-2 text-[13px] text-error">{error}</div>}
        <button
          onClick={() => void create()}
          disabled={busy}
          className="mt-3 rounded-md bg-navy px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {busy ? t('disc.creating') : t('disc.create')}
        </button>
      </div>

      {codes && codes.length === 0 && <div className="text-muted">{t('disc.empty')}</div>}
      <div className="flex flex-col gap-2.5">
        {(codes ?? []).map((dc) => (
          <div key={dc.id} className="rounded-lg border border-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-gold/15 px-2.5 py-1 font-mono text-[14px] font-bold text-accent">{dc.code}</span>
                <span className="text-[14px] font-semibold text-navy">−{dc.percent_off}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-faint">
                  {fmtDate(dc.starts_at) ?? '—'} → {fmtDate(dc.ends_at) ?? t('disc.noEnd')}
                </span>
                <button
                  onClick={() => void toggleActive(dc)}
                  className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                    dc.active ? 'bg-success/10 text-success' : 'bg-bg-soft text-muted'
                  }`}
                >
                  {dc.active ? t('disc.active') : t('disc.inactive')}
                </button>
                <button
                  onClick={() => void remove(dc)}
                  className="rounded-md border border-error px-3 py-1.5 text-[12px] text-error hover:bg-error-bg"
                >
                  {t('dash.delete')}
                </button>
              </div>
            </div>
            <div className="mt-2 text-[12.5px] text-muted">
              {t('disc.appliesTo')}: {t('disc.itemsCount', { n: String(dc.targets.length) })}
              {dc.targets.length > 0 && <span className="text-faint"> — {targetNames(dc)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
