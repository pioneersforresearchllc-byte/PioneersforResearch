// Owner: manage a course's learning space (materials, announcements, Q&A)
// with the same tools trainers get on their course page.
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { LoadingState } from '@/components/LoadingState'
import { CourseMaterials } from '@/components/course/CourseMaterials'
import { CourseAnnouncements } from '@/components/course/CourseAnnouncements'
import { CourseDiscussion } from '@/components/course/CourseDiscussion'
import { CourseTabs, useCourseTab } from '@/components/course/CourseTabs'

async function getCourseHeader(id: string) {
  const [{ data: course }, { count }] = await Promise.all([
    supabase.from('courses').select('id, title, description').eq('id', id).maybeSingle(),
    supabase.from('enrollments').select('course_id', { count: 'exact', head: true }).eq('course_id', id),
  ])
  return course ? { ...(course as { id: string; title: string; description: string }), students: count ?? 0 } : null
}

export function OwnerCourseSpacePage() {
  const { id } = useParams()
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const [tab, setTab] = useCourseTab('content')
  const { data, isLoading } = useQuery({ queryKey: ['owner-course-header', id], enabled: !!id, queryFn: () => getCourseHeader(id!) })

  if (isLoading) return <LoadingState />
  if (!data) {
    return (
      <Link to="/owner/courses" className="text-navy no-underline">
        {ar ? '→ العودة إلى الدورات' : '← Back to courses'}
      </Link>
    )
  }

  const tabs = [
    { key: 'content', label: ar ? 'محتوى الدورة' : 'Content' },
    { key: 'announcements', label: ar ? 'الإعلانات' : 'Announcements' },
    { key: 'qa', label: ar ? 'الأسئلة والنقاش' : 'Q&A' },
  ]
  const active = tabs.some((x) => x.key === tab) ? tab : 'content'

  return (
    <div>
      <Link to="/owner/courses" className="mb-4 inline-block text-[13px] text-muted no-underline hover:text-navy">
        {ar ? '→ العودة إلى الدورات' : '← Back to courses'}
      </Link>
      <div className="mb-1 font-heading text-xl font-bold text-navy">{data.title}</div>
      <div className="mb-5 text-[13px] text-muted">{ar ? `${data.students} طالب مسجّل` : `${data.students} enrolled students`}</div>

      <CourseTabs tabs={tabs} active={active} onChange={setTab} />
      {active === 'content' && <CourseMaterials courseId={data.id} mode="manage" studentCount={data.students} />}
      {active === 'announcements' && <CourseAnnouncements courseId={data.id} manage />}
      {active === 'qa' && <CourseDiscussion courseId={data.id} staff />}
    </div>
  )
}
