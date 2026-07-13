import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { listMyEnrolledCourses } from '@/lib/courses'

export function StudentCoursesPage() {
  const { profile } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['my-enrolled-courses', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyEnrolledCourses(profile!.id),
  })

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">دوراتي</div>

      {isLoading && <div className="text-muted">جارِ التحميل...</div>}
      {data && data.length === 0 && (
        <div className="text-muted">
          لسه ما اشتركت بأي برنامج —{' '}
          <Link to="/#programs" className="font-semibold text-navy">
            استعرض البرامج
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {(data ?? []).map((c) => (
          <Link
            key={c.id}
            to={`/student/courses/${c.id}`}
            className="block rounded-xl border border-border bg-white p-5 no-underline hover:border-navy"
          >
            <div className="mb-2 text-[15.5px] font-semibold text-navy">{c.title}</div>
            <div className="mb-3 text-[12.5px] text-muted">{c.teacherNames.join('، ') || 'بلا معلم مكلّف'}</div>
            <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-bg-soft">
              <div className="h-full bg-gold" style={{ width: `${c.progress}%` }} />
            </div>
            <div className="text-[12px] text-faint">{c.progress}% مكتمل</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
