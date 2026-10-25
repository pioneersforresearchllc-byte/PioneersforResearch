import { useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { getCourseContent, getEnrolledCourseDetail } from '@/lib/courses'
import { listMyAssignments } from '@/lib/assignments'
import { getContentProgress } from '@/lib/courseMaterials'
import { LoadingState } from '@/components/LoadingState'
import { CourseSessions } from '@/components/CourseSessions'
import { CourseMaterials } from '@/components/course/CourseMaterials'
import { AnnouncementBanner, CourseAnnouncements, useAnnouncements } from '@/components/course/CourseAnnouncements'
import { CourseDiscussion } from '@/components/course/CourseDiscussion'
import { CourseTabs, useCourseTab } from '@/components/course/CourseTabs'

export function StudentCourseDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const ar = lang === 'ar'
  const contentRef = useRef<HTMLIFrameElement>(null)
  const [tab, setTab] = useCourseTab('content')
  const { data, isLoading } = useQuery({
    queryKey: ['enrolled-course-detail', id, profile?.id],
    enabled: !!id && !!profile,
    queryFn: () => getEnrolledCourseDetail(id!, profile!.id),
  })
  // Custom HTML content (RLS restricts it to enrolled students). Only fetched
  // once we know the student is enrolled (data is present).
  const { data: contentHtml } = useQuery({
    queryKey: ['course-content', id],
    enabled: !!id && !!data,
    queryFn: () => getCourseContent(id!),
  })
  const { data: assignments } = useQuery({
    queryKey: ['my-assignments', profile?.id],
    enabled: !!profile && !!data,
    queryFn: () => listMyAssignments(profile!.id),
  })
  const { data: contentPct } = useQuery({
    queryKey: ['course-content-progress', id, profile?.id],
    enabled: !!profile && !!data,
    queryFn: () => getContentProgress(profile!.id, [id!]),
  })
  const announcements = useAnnouncements(id ?? '')

  if (isLoading) return <LoadingState />
  if (!data) {
    return (
      <div>
        <div className="mb-3 text-muted">{t('cDetail.notEnrolled')}</div>
        <Link to="/student/courses" className="text-navy no-underline">
          {t('cDetail.backToMine')}
        </Link>
      </div>
    )
  }

  const courseAssignments = (assignments ?? []).filter((a) => a.course_id === id)
  const pendingAssignments = courseAssignments.filter((a) => !a.submission || a.submission.status === 'pending').length
  const now = Date.now()
  const upcomingSessions = data.sessions.filter((s) => new Date(`${s.session_date}T${(s.session_time || '00:00').slice(0, 5)}`).getTime() > now - 3 * 3_600_000).length
  const freshAnnouncements = (announcements.data ?? []).filter((a) => now - new Date(a.created_at).getTime() < 7 * 24 * 3_600_000).length
  const pct = contentPct?.get(id!)

  const tabs = [
    { key: 'content', label: ar ? 'محتوى الدورة' : 'Content' },
    ...(contentHtml ? [{ key: 'lesson', label: ar ? 'الدرس التفاعلي' : 'Interactive lesson' }] : []),
    { key: 'lectures', label: ar ? 'المحاضرات' : 'Lectures', badge: upcomingSessions || undefined },
    { key: 'assignments', label: ar ? 'الواجبات' : 'Assignments', badge: pendingAssignments || undefined },
    { key: 'announcements', label: ar ? 'الإعلانات' : 'Announcements', badge: freshAnnouncements || undefined },
    { key: 'qa', label: ar ? 'الأسئلة والنقاش' : 'Q&A' },
  ]
  const active = tabs.some((x) => x.key === tab) ? tab : 'content'

  return (
    <div>
      <Link to="/student/courses" className="mb-4 inline-block text-[13px] text-muted no-underline hover:text-navy">
        {t('cDetail.backToMine')}
      </Link>

      {/* Course header */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d2748] to-[#0a1c34] p-6 text-white md:p-8">
        {data.course.image_url && (
          <img src={data.course.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
        )}
        <div className="relative">
          <div className="font-heading text-2xl font-bold md:text-[28px]">{data.course.title}</div>
          <div className="mt-2 text-[13.5px] text-white/70">
            {data.teacherNames.join('، ') || t('sCourses.noTeacher')}
            {data.course.duration_label && ` · ${data.course.duration_label}`}
          </div>
          {data.course.description && (
            <p className="mt-4 line-clamp-3 max-w-200 text-[14.5px] leading-8 text-white/85">{data.course.description}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2.5">
            {pct !== undefined && (
              <Stat label={ar ? 'إنجاز المحتوى' : 'Content done'} value={`${pct}%`} />
            )}
            <Stat label={ar ? 'المحاضرات' : 'Lectures'} value={String(data.sessions.length)} />
            <Stat label={ar ? 'واجبات معلّقة' : 'Pending tasks'} value={String(pendingAssignments)} />
          </div>
        </div>
      </div>

      <AnnouncementBanner courseId={id!} onOpen={() => setTab('announcements')} />

      <CourseTabs tabs={tabs} active={active} onChange={setTab} />

      {active === 'content' && <CourseMaterials courseId={id!} mode="student" />}

      {active === 'lesson' && contentHtml && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[15px] font-semibold text-navy">{t('cDetail.content')}</div>
            <button
              onClick={() => void contentRef.current?.requestFullscreen?.()}
              className="rounded-md border border-border px-3 py-1.5 text-[12.5px] font-semibold text-navy hover:border-navy"
            >
              {t('cDetail.fullscreen')}
            </button>
          </div>
          <iframe
            ref={contentRef}
            title={data.course.title}
            srcDoc={contentHtml}
            // allow-scripts WITHOUT allow-same-origin: the pasted script runs
            // but in an opaque origin, isolated from the app + the user session.
            sandbox="allow-scripts allow-popups allow-downloads"
            className="h-[82vh] w-full rounded-2xl border border-border bg-white"
          />
        </div>
      )}

      {/* Live lectures: next-lecture highlight + full schedule */}
      {active === 'lectures' && <CourseSessions sessions={data.sessions} />}

      {active === 'assignments' && (
        <div className="flex flex-col gap-2.5">
          {courseAssignments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-bg-soft/60 px-6 py-10 text-center text-[13px] text-muted">
              {ar ? 'لا توجد واجبات لهذه الدورة حاليًا.' : 'No assignments for this course yet.'}
            </div>
          )}
          {courseAssignments.map((a) => {
            const st = a.submission?.status ?? 'pending'
            const overdue = st === 'pending' && new Date(a.due_date).getTime() < now - 24 * 3_600_000
            return (
              <Link
                key={a.id}
                to="/student/assignments"
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-4 no-underline hover:border-navy"
              >
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-semibold text-navy">{a.title}</div>
                  <div className={`text-[12.5px] ${overdue ? 'text-error' : 'text-muted'}`}>
                    {ar ? 'التسليم: ' : 'Due: '}
                    {new Date(a.due_date).toLocaleDateString(ar ? 'ar' : 'en-GB')}
                    {overdue && (ar ? ' · متأخر' : ' · overdue')}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-bold ${
                    st === 'graded' ? 'bg-success-bg text-success' : st === 'submitted' ? 'bg-bg-soft text-muted-2' : 'bg-gold/15 text-accent'
                  }`}
                >
                  {st === 'graded'
                    ? `${ar ? 'الدرجة' : 'Grade'}: ${a.submission?.grade}`
                    : st === 'submitted'
                      ? ar
                        ? 'بانتظار التصحيح'
                        : 'Awaiting grade'
                      : ar
                        ? 'لم يُسلَّم — سلّم الآن'
                        : 'Not submitted — submit'}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {active === 'announcements' && <CourseAnnouncements courseId={id!} />}
      {active === 'qa' && <CourseDiscussion courseId={id!} />}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm">
      <div className="text-[17px] font-bold leading-6">{value}</div>
      <div className="text-[11.5px] text-white/65">{label}</div>
    </div>
  )
}
