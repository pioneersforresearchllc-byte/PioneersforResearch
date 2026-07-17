import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { getOverviewStats } from '@/lib/owner'

export function OwnerOverviewPage() {
  const { t } = useLanguage()
  const { data, isLoading } = useQuery({ queryKey: ['owner-overview-stats'], queryFn: getOverviewStats })

  const formatSar = (cents: number) => `${(cents / 100).toLocaleString('en-US')} ${t('course.currency')}`

  const cards = data
    ? [
        { label: t('oOverview.pendingTeachers'), value: data.pending_teacher_count },
        { label: t('oOverview.activeTeachers'), value: data.approved_teacher_count },
        { label: t('oOverview.courses'), value: data.courses_count },
        { label: t('oOverview.students'), value: data.students_count },
        { label: t('oOverview.revenue'), value: formatSar(data.total_revenue_cents) },
        { label: t('oOverview.logins'), value: data.login_count },
        { label: t('oOverview.avgRating'), value: data.overall_avg_rating.toFixed(1) },
      ]
    : []

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('oOverview.title')}</div>
      {isLoading && <div className="text-muted">{t('dash.loading')}</div>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-white p-5 text-center">
            <div className="font-heading text-[26px] font-bold text-navy">{c.value}</div>
            <div className="mt-1.5 text-[12.5px] text-muted">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
