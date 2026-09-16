import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { getOverviewStats } from '@/lib/owner'
import { LoadingState } from '@/components/LoadingState'

type TFn = ReturnType<typeof useLanguage>['t']

/** Small week-over-week delta badge (styled for a dark card). */
function Delta({ cur, prev, t }: { cur: number; prev: number; t: TFn }) {
  const base = 'inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold'
  if (prev === 0 && cur === 0) {
    return <span className={`${base} text-white/70`}>— {t('oOverview.vsLastWeek')}</span>
  }
  if (prev === 0) {
    return <span className={`${base} text-white`}>▲ {t('oOverview.new')}</span>
  }
  const pct = Math.round(((cur - prev) / prev) * 100)
  const up = pct >= 0
  return (
    <span className={`${base} ${up ? 'text-[#7ff0c0]' : 'text-[#ffb4ac]'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}% <span className="font-normal text-white/70">{t('oOverview.vsLastWeek')}</span>
    </span>
  )
}

export function OwnerOverviewPage() {
  const { t } = useLanguage()
  const { data, isLoading } = useQuery({ queryKey: ['owner-overview-stats'], queryFn: getOverviewStats })

  const fmtSar = (cents: number) => `${(cents / 100).toLocaleString('en-US')} ${t('course.currency')}`

  const weekly = data
    ? [
        { icon: '🎓', accent: 'from-navy to-navy-hover', label: t('oOverview.newStudents'), cur: data.students_this_week, prev: data.students_last_week, display: String(data.students_this_week) },
        { icon: '📚', accent: 'from-[#1c4577] to-[#0d2748]', label: t('oOverview.newEnrollments'), cur: data.enrollments_this_week, prev: data.enrollments_last_week, display: String(data.enrollments_this_week) },
        { icon: '🗂️', accent: 'from-[#8a6d2f] to-[#6b5426]', label: t('oOverview.newRequests'), cur: data.requests_this_week, prev: data.requests_last_week, display: String(data.requests_this_week) },
        { icon: '💰', accent: 'from-[#1f8a5b] to-[#146341]', label: t('oOverview.weekRevenue'), cur: data.revenue_this_week_cents, prev: data.revenue_last_week_cents, display: fmtSar(data.revenue_this_week_cents) },
      ]
    : []

  const totals = data
    ? [
        { icon: '👥', label: t('oOverview.students'), value: data.students_count },
        { icon: '🧑‍🏫', label: t('oOverview.activeTeachers'), value: data.approved_teacher_count },
        { icon: '⏳', label: t('oOverview.pendingTeachers'), value: data.pending_teacher_count },
        { icon: '📘', label: t('oOverview.courses'), value: data.courses_count },
        { icon: '📝', label: t('oOverview.enrollments'), value: data.enrollments_count },
        { icon: '🗂️', label: t('oOverview.requests'), value: data.requests_count },
        { icon: '💵', label: t('oOverview.revenue'), value: fmtSar(data.total_revenue_cents) },
        { icon: '⭐', label: t('oOverview.avgRating'), value: data.overall_avg_rating.toFixed(1) },
      ]
    : []

  return (
    <div>
      <div className="mb-1 font-heading text-xl font-bold text-navy">{t('oOverview.title')}</div>
      <p className="mb-5 text-[13px] text-muted">{t('oOverview.subtitle')}</p>

      {isLoading && <LoadingState />}

      {data && (
        <>
          <div className="mb-2.5 text-[13px] font-semibold text-accent">{t('oOverview.thisWeek')}</div>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {weekly.map((c) => (
              <div
                key={c.label}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.accent} p-5 text-white shadow-[0_10px_30px_-12px_rgba(11,31,58,0.4)]`}
              >
                <div className="mb-3 text-[22px]">{c.icon}</div>
                <div className="font-heading text-[28px] font-bold leading-none">{c.display}</div>
                <div className="mt-1.5 text-[12.5px] text-white/80">{c.label}</div>
                <div className="mt-3">
                  <Delta cur={c.cur} prev={c.prev} t={t} />
                </div>
              </div>
            ))}
          </div>

          <div className="mb-2.5 text-[13px] font-semibold text-muted">{t('oOverview.total')}</div>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {totals.map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-white p-4 text-center">
                <div className="mb-1 text-[18px]">{c.icon}</div>
                <div className="font-heading text-[22px] font-bold text-navy">{c.value}</div>
                <div className="mt-1 text-[12px] text-muted">{c.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
