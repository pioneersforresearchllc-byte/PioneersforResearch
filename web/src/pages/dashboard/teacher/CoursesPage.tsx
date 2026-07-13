import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { listMyTaughtCourses } from '@/lib/courses'

export function TeacherCoursesPage() {
  const { profile } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['my-taught-courses', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyTaughtCourses(profile!.id),
  })

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">الدورات والبرامج</div>

      {isLoading && <div className="text-muted">جارِ التحميل...</div>}
      {data && data.length === 0 && <div className="text-muted">لسه ما انكلّفت بأي برنامج.</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(data ?? []).map((c) => (
          <Link
            key={c.id}
            to={`/teacher/courses/${c.id}`}
            className="block rounded-xl border border-border bg-white p-5 no-underline hover:border-navy"
          >
            <div className="mb-2 text-[15.5px] font-semibold text-navy">{c.title}</div>
            <div className="text-[12.5px] text-muted">
              {c.enrolledCount} طالب مسجّل · {c.sessionCount} حصة
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
