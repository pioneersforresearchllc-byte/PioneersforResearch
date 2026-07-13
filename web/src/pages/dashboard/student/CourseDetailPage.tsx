import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getEnrolledCourseDetail } from '@/lib/courses'

export function StudentCourseDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['enrolled-course-detail', id, profile?.id],
    enabled: !!id && !!profile,
    queryFn: () => getEnrolledCourseDetail(id!, profile!.id),
  })

  if (isLoading) return <div className="text-muted">جارِ التحميل...</div>
  if (!data) {
    return (
      <div>
        <div className="mb-3 text-muted">أنت غير مسجّل بهذا البرنامج.</div>
        <Link to="/student/courses" className="text-navy no-underline">
          → رجوع لدوراتي
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/student/courses" className="mb-4 inline-block text-[13px] text-muted no-underline">
        → رجوع لدوراتي
      </Link>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{data.course.title}</div>
      <div className="mb-5 text-[13.5px] text-muted">{data.teacherNames.join('، ') || 'بلا معلم مكلّف'}</div>
      <p className="mb-6 max-w-160 text-[14.5px] leading-8 text-muted-2">{data.course.description}</p>

      <div className="mb-2.5 text-[15px] font-semibold text-navy">الحصص</div>
      {data.sessions.length === 0 && <div className="text-[13.5px] text-muted">لا توجد حصص مجدولة بعد.</div>}
      <div className="flex flex-col gap-2">
        {data.sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-4">
            <div>
              <div className="text-[14px] font-semibold text-navy">{s.title}</div>
              <div className="text-[12.5px] text-muted">
                {s.session_date} · {s.session_time}
              </div>
            </div>
            {s.link && (
              <a
                href={s.link}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-navy px-4 py-1.75 text-[12.5px] text-navy no-underline hover:bg-bg-soft"
              >
                رابط الحصة
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
