import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { listMyGrades } from '@/lib/account'
import { listMyEnrolledCourses } from '@/lib/courses'

export function StudentGradesPage() {
  const { profile } = useAuth()
  const coursesQuery = useQuery({
    queryKey: ['my-enrolled-courses', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyEnrolledCourses(profile!.id),
  })
  const gradesQuery = useQuery({
    queryKey: ['my-grades', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyGrades(profile!.id),
  })

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">تقدمي ودرجاتي</div>

      <div className="mb-6">
        <div className="mb-2.5 text-[15px] font-semibold text-navy">تقدمي بالدورات</div>
        {coursesQuery.data && coursesQuery.data.length === 0 && (
          <div className="text-[13.5px] text-muted">لا توجد برامج مسجّل فيها.</div>
        )}
        <div className="flex flex-col gap-2">
          {(coursesQuery.data ?? []).map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-white p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[14px] font-semibold text-navy">{c.title}</span>
                <span className="text-[12.5px] text-faint">{c.progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-soft">
                <div className="h-full bg-gold" style={{ width: `${c.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2.5 text-[15px] font-semibold text-navy">درجات الواجبات</div>
        {gradesQuery.data && gradesQuery.data.length === 0 && (
          <div className="text-[13.5px] text-muted">لا توجد واجبات مصحّحة بعد.</div>
        )}
        <div className="flex flex-col gap-2">
          {(gradesQuery.data ?? []).map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-4">
              <div>
                <div className="text-[14px] font-semibold text-navy">{g.assignmentTitle}</div>
                <div className="text-[12.5px] text-muted">{g.courseTitle}</div>
              </div>
              <span className="text-[15px] font-bold text-success">{g.grade}/100</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
