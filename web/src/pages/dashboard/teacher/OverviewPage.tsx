import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyTaughtCourses } from '@/lib/courses'
import { listAssignmentsForTeacher } from '@/lib/assignments'

export function TeacherOverviewPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const coursesQuery = useQuery({
    queryKey: ['my-taught-courses', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyTaughtCourses(profile!.id),
  })
  const assignmentsQuery = useQuery({
    queryKey: ['teacher-review-assignments', profile?.id],
    enabled: !!profile,
    queryFn: () => listAssignmentsForTeacher(profile!.id),
  })

  const totalStudents = (coursesQuery.data ?? []).reduce((sum, c) => sum + c.enrolledCount, 0)
  const pendingReview = (assignmentsQuery.data ?? []).reduce((sum, a) => sum + (a.submittedCount - a.gradedCount), 0)

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('tOverview.hello', { name: profile?.name ?? '' })}</div>
      <div className="mb-6 text-[13.5px] text-muted">{t('tOverview.subtitle')}</div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5 text-center">
          <div className="font-heading text-[26px] font-bold text-navy">{coursesQuery.data?.length ?? 0}</div>
          <div className="mt-1.5 text-[12.5px] text-muted">{t('tOverview.myCourses')}</div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 text-center">
          <div className="font-heading text-[26px] font-bold text-navy">{totalStudents}</div>
          <div className="mt-1.5 text-[12.5px] text-muted">{t('tOverview.totalStudents')}</div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 text-center">
          <div className="font-heading text-[26px] font-bold text-navy">{pendingReview}</div>
          <div className="mt-1.5 text-[12.5px] text-muted">{t('tOverview.pendingReview')}</div>
        </div>
      </div>
    </div>
  )
}
