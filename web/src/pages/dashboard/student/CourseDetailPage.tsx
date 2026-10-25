import { useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { getCourseContent, getEnrolledCourseDetail } from '@/lib/courses'
import { LoadingState } from '@/components/LoadingState'
import { CourseSessions } from '@/components/CourseSessions'

export function StudentCourseDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { t } = useLanguage()
  const contentRef = useRef<HTMLIFrameElement>(null)
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

  return (
    <div>
      <Link to="/student/courses" className="mb-4 inline-block text-[13px] text-muted no-underline hover:text-navy">
        {t('cDetail.backToMine')}
      </Link>

      {/* Course header */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d2748] to-[#0a1c34] p-6 text-white md:p-8">
        <div className="font-heading text-2xl font-bold md:text-[28px]">{data.course.title}</div>
        <div className="mt-2 text-[13.5px] text-white/70">
          {data.teacherNames.join('، ') || t('sCourses.noTeacher')}
        </div>
        {data.course.description && (
          <p className="mt-4 max-w-200 text-[14.5px] leading-8 text-white/85">{data.course.description}</p>
        )}
      </div>

      {/* Custom HTML content (sandboxed) */}
      {contentHtml && (
        <div className="mb-6">
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
      <CourseSessions sessions={data.sessions} />
    </div>
  )
}
