import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyTaughtCourses } from '@/lib/courses'

export function TeacherCoursesPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const { data, isLoading } = useQuery({
    queryKey: ['my-taught-courses', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyTaughtCourses(profile!.id),
  })

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('tCourses.title')}</div>

      {isLoading && <div className="text-muted">{t('dash.loading')}</div>}
      {data && data.length === 0 && <div className="text-muted">{t('tCourses.none')}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(data ?? []).map((c) => (
          <Link
            key={c.id}
            to={`/teacher/courses/${c.id}`}
            className="block rounded-xl border border-border bg-white p-5 no-underline hover:border-navy"
          >
            <div className="mb-2 text-[15.5px] font-semibold text-navy">{c.title}</div>
            <div className="text-[12.5px] text-muted">
              {t('tCourses.enrolledSessions', { students: String(c.enrolledCount), sessions: String(c.sessionCount) })}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
