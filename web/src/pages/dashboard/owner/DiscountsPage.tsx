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
  const [targetType, setTargetType] = useState<'course' | 'service'>('course')
  const [targetId, setTargetId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['discount-codes'] })

  const serviceTitle = (s: { title: string; title_en: string | null }) =>
    (lang === 'en' ? s.title_en : s.title) || s.title

  const targetName = (dc: DiscountCode): string => {
    if (dc.course_id) return courses?.find((c) => c.id === dc.course_id)?.title ?? '—'
    if (dc.service_id) {
      const s = services?.find((x) => x.id === dc.service_id)
      return s ? serviceTitle(s) : '—'
    }
    return '—'
  }

  const create = async () => {
    const pct = Number(percent)
    if (!code.trim() || Number.isNaN(pct) || pct < 1 || pct > 100 || !targetId) {
      setError(t('disc.fillFields'))
      return
    }
    setBusy(true)
    setError('')
    try {
      await createDiscountCode({
        code: code.trim(),
        percent_off: Math.round(pct),
        course_id: targetType === 'course' ? targetId : null,
        service_id: targetType === 'service' ? targetId : null,
        starts_at: startsAt ? `${startsAt}T00:00:00Z` : null,
        ends_at: endsAt ? `${endsAt}T23:59:59Z` : null,
        active: true,
      })
      setCode('')
      setPercent('')
      setTargetId('')
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

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('disc.title')}</div>

      <div className="mb-6 rounded-xl border border-border bg-bg-soft p-4">
        <div className="mb-3 text-[14px] font-semibold text-navy">{t('disc.newTitle')}</div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('disc.codePh')} className={inputClass} />
          <input type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} placeholder={t('disc.percentPh')} className={inputClass} />
          <select
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value as 'course' | 'service')
              setTargetId('')
            }}
            className={inputClass}
          >
            <option value="course">{t('disc.course')}</option>
            <option value="service">{t('disc.service')}</option>
          </select>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={inputClass}>
            <option value="">{t('disc.selectTarget')}</option>
            {targetType === 'course'
              ? (courses ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))
              : (services ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {serviceTitle(s)}
                  </option>
                ))}
          </select>
          <label className="flex flex-col gap-1 text-[11.5px] text-muted">
            {t('disc.startsAt')}
            <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] text-muted">
            {t('disc.endsAt')}
            <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} />
          </label>
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
          <div key={dc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-gold/15 px-2.5 py-1 font-mono text-[14px] font-bold text-accent">{dc.code}</span>
              <span className="text-[14px] font-semibold text-navy">−{dc.percent_off}%</span>
              <span className="text-[13px] text-muted">
                {dc.course_id ? t('disc.course') : t('disc.service')}: {targetName(dc)}
              </span>
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
        ))}
      </div>
    </div>
  )
}
