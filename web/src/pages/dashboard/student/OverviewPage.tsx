import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyEnrolledCourses } from '@/lib/courses'
import { listMyAssignments } from '@/lib/assignments'

export function StudentOverviewPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const coursesQuery = useQuery({
    queryKey: ['my-enrolled-courses', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyEnrolledCourses(profile!.id),
  })
  const assignmentsQuery = useQuery({
    queryKey: ['my-assignments', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyAssignments(profile!.id),
  })

  const pendingCount = (assignmentsQuery.data ?? []).filter((a) => !a.submission).length

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('sOverview.hello', { name: profile?.name ?? '' })}</div>
      <div className="mb-6 text-[13.5px] text-muted">{t('sOverview.subtitle')}</div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5 text-center">
          <div className="font-heading text-[26px] font-bold text-navy">{coursesQuery.data?.length ?? 0}</div>
          <div className="mt-1.5 text-[12.5px] text-muted">{t('sOverview.enrolledCourses')}</div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 text-center">
          <div className="font-heading text-[26px] font-bold text-navy">{pendingCount}</div>
          <div className="mt-1.5 text-[12.5px] text-muted">{t('sOverview.pendingAssignments')}</div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 text-center">
          <div className="font-heading text-[26px] font-bold text-navy">{assignmentsQuery.data?.length ?? 0}</div>
          <div className="mt-1.5 text-[12.5px] text-muted">{t('sOverview.totalAssignments')}</div>
        </div>
      </div>
    </div>
  )
}
