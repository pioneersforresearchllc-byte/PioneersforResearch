import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyEnrolledCourses } from '@/lib/courses'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'

export function StudentCoursesPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const { data, isLoading } = useQuery({
    queryKey: ['my-enrolled-courses', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyEnrolledCourses(profile!.id),
  })

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('sCourses.title')}</div>

      {isLoading && <LoadingState />}
      {data && data.length === 0 && (
        <EmptyState
          title={t('sCourses.emptyPrefix')}
          action={
            <Link
              to="/#courses"
              className="inline-flex items-center rounded-lg bg-navy px-4 py-2 text-[13px] font-semibold text-white no-underline transition-colors hover:bg-navy-hover"
            >
              {t('sCourses.browse')}
            </Link>
          }
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(data ?? []).map((c) => (
          <Link
            key={c.id}
            to={`/student/courses/${c.id}`}
            className="block rounded-xl border border-border bg-white p-5 no-underline hover:border-navy"
          >
            <div className="mb-2 text-[15.5px] font-semibold text-navy">{c.title}</div>
            <div className="mb-3 text-[12.5px] text-muted">{c.teacherNames.join('، ') || t('sCourses.noTeacher')}</div>
            <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-bg-soft">
              <div className="h-full bg-gold" style={{ width: `${c.progress}%` }} />
            </div>
            <div className="text-[12px] text-faint">{t('dash.percentComplete', { n: String(c.progress) })}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
