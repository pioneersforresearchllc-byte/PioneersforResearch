import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { getTaughtCourseDetail } from '@/lib/courses'
import { createAssignment, listAssignmentsForCourse, uploadAssignmentFile } from '@/lib/assignments'
import { LoadingState } from '@/components/LoadingState'
import { AttendancePanel } from '@/components/institution/AttendancePanel'
import { SessionsManager } from '@/components/course/SessionsManager'
import { CourseMaterials } from '@/components/course/CourseMaterials'
import { CourseAnnouncements } from '@/components/course/CourseAnnouncements'
import { CourseDiscussion } from '@/components/course/CourseDiscussion'
import { CourseTabs, useCourseTab } from '@/components/course/CourseTabs'
import { getCompletionsByStudent, getCourseSpace, listPosts } from '@/lib/courseMaterials'

function NewAssignmentModal({
  courseId,
  teacherId,
  students,
  onClose,
  onCreated,
}: {
  courseId: string
  teacherId: string
  students: { id: string; name: string }[]
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [details, setDetails] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [targetAll, setTargetAll] = useState(true)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { t } = useLanguage()

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))

  const submit = async () => {
    if (!title.trim() || !dueDate) {
      setError(t('tCourseDetail.nameDateRequired'))
      return
    }
    setBusy(true)
    setError('')
    try {
      const fileUrl = file ? await uploadAssignmentFile(courseId, file) : null
      await createAssignment({
        courseId,
        teacherId,
        title: title.trim(),
        dueDate,
        details: details.trim() || null,
        fileUrl,
        targetAll,
        targetStudentIds: targetAll ? [] : selected,
      })
      onCreated()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('tCourseDetail.createError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-[460px] overflow-y-auto rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 font-heading text-lg font-bold text-navy">{t('tCourseDetail.newAssignmentTitle')}</div>
        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('tCourseDetail.assignmentNamePh')}
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t('tCourseDetail.detailsPh')}
            rows={3}
            className="resize-y rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

          <label className="flex items-center gap-2 text-[13.5px] text-navy">
            <input type="checkbox" checked={targetAll} onChange={(e) => setTargetAll(e.target.checked)} />
            {t('tCourseDetail.forAllStudents')}
          </label>

          {!targetAll && (
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              {students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] ${
                    selected.includes(s.id) ? 'border-navy bg-navy text-white' : 'border-border bg-white text-navy'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {error && <div className="text-[13px] text-error">{error}</div>}

          <div className="mt-1 flex gap-2.5">
            <button
              onClick={() => void submit()}
              disabled={busy}
              className="flex-1 rounded-md bg-navy py-2.75 text-[14px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
            >
              {t('tCourseDetail.createAssignment')}
            </button>
            <button onClick={onClose} className="rounded-md border border-border px-5 py-2.75 text-[14px] text-navy">
              {t('dash.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TeacherCourseDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const ar = lang === 'ar'
  const queryClient = useQueryClient()
  const [showNewAssignment, setShowNewAssignment] = useState(false)
  const [tab, setTab] = useCourseTab('content')

  const { data, isLoading } = useQuery({
    queryKey: ['taught-course-detail', id, profile?.id],
    enabled: !!id && !!profile,
    queryFn: () => getTaughtCourseDetail(id!, profile!.id),
  })
  const assignmentsQuery = useQuery({
    queryKey: ['course-assignments', id],
    enabled: !!id,
    queryFn: () => listAssignmentsForCourse(id!),
  })
  const spaceQuery = useQuery({ queryKey: ['course-space', id], enabled: !!id && !!data, queryFn: () => getCourseSpace(id!), retry: false })
  const byStudentQuery = useQuery({
    queryKey: ['course-completions-by-student', id],
    enabled: !!id && !!data,
    queryFn: () => getCompletionsByStudent(id!),
  })
  const postsQuery = useQuery({ queryKey: ['course-posts', id], enabled: !!id && !!data, queryFn: () => listPosts(id!), retry: false })

  if (isLoading) return <LoadingState />
  if (!data) {
    return (
      <div>
        <div className="mb-3 text-muted">{t('cDetail.notAssigned')}</div>
        <Link to="/teacher/courses" className="text-navy no-underline">
          {t('cDetail.backToTeaching')}
        </Link>
      </div>
    )
  }

  const publishedCount = (spaceQuery.data?.materials ?? []).filter((m) => m.published).length
  const posts = postsQuery.data ?? []
  const unanswered = posts.filter(
    (q) =>
      !q.parent_id &&
      !q.resolved &&
      !posts.some((r) => r.parent_id === q.id && (r.authorRole === 'teacher' || r.authorRole === 'owner')),
  ).length
  const toGrade = (assignmentsQuery.data ?? []).reduce((n, a) => n + Math.max(0, a.submittedCount - a.gradedCount), 0)

  const tabs = [
    { key: 'content', label: ar ? 'محتوى الدورة' : 'Content' },
    { key: 'lectures', label: ar ? 'المحاضرات والحضور' : 'Lectures & attendance' },
    { key: 'assignments', label: t('tCourseDetail.assignments'), badge: toGrade || undefined },
    { key: 'students', label: ar ? `الطلاب (${data.students.length})` : `Students (${data.students.length})` },
    { key: 'announcements', label: ar ? 'الإعلانات' : 'Announcements' },
    { key: 'qa', label: ar ? 'الأسئلة والنقاش' : 'Q&A', badge: unanswered || undefined },
  ]
  const active = tabs.some((x) => x.key === tab) ? tab : 'content'

  return (
    <div>
      <Link to="/teacher/courses" className="mb-4 inline-block text-[13px] text-muted no-underline">
        {t('cDetail.backToTeaching')}
      </Link>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{data.course.title}</div>
      <p className="mb-4 max-w-160 text-[14.5px] leading-8 text-muted-2">{data.course.description}</p>

      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label={ar ? 'الطلاب' : 'Students'} value={data.students.length} />
        <StatCard label={ar ? 'عناصر منشورة' : 'Published items'} value={publishedCount} />
        <StatCard label={ar ? 'بانتظار التصحيح' : 'To grade'} value={toGrade} highlight={toGrade > 0} />
        <StatCard label={ar ? 'أسئلة بلا رد' : 'Unanswered'} value={unanswered} highlight={unanswered > 0} />
      </div>

      <CourseTabs tabs={tabs} active={active} onChange={setTab} />

      {active === 'content' && <CourseMaterials courseId={id!} mode="manage" studentCount={data.students.length} />}

      {active === 'lectures' && (
        <>
          <div className="mb-6">
            <SessionsManager courseId={id!} sessions={data.sessions} />
          </div>
          <AttendancePanel courseId={id!} students={data.students} />
        </>
      )}

      {active === 'assignments' && (
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <div className="text-[15px] font-semibold text-navy">{t('tCourseDetail.assignments')}</div>
          <button
            onClick={() => setShowNewAssignment(true)}
            className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover"
          >
            {t('tCourseDetail.newAssignment')}
          </button>
        </div>
        {assignmentsQuery.data && assignmentsQuery.data.length === 0 && (
          <div className="text-[13.5px] text-muted">{t('tCourseDetail.noAssignments')}</div>
        )}
        <div className="flex flex-col gap-2">
          {(assignmentsQuery.data ?? []).map((a) => (
            <Link
              key={a.id}
              to="/teacher/review"
              className="flex items-center justify-between rounded-lg border border-border bg-white p-4 no-underline hover:border-navy"
            >
              <div>
                <div className="text-[14px] font-semibold text-navy">{a.title}</div>
                <div className="text-[12.5px] text-muted">{t('tCourseDetail.due', { date: a.due_date })}</div>
              </div>
              <div className="text-[12.5px] text-faint">
                {t('tCourseDetail.submittedGraded', { submitted: String(a.submittedCount), graded: String(a.gradedCount) })}
              </div>
            </Link>
          ))}
        </div>
      </div>
      )}

      {active === 'students' && (
        <div>
          <div className="mb-2.5 text-[15px] font-semibold text-navy">
            {t('tCourseDetail.enrolledStudents', { n: String(data.students.length) })}
          </div>
          {data.students.length === 0 && <div className="text-[13.5px] text-muted">{t('tCourseDetail.noStudents')}</div>}
          <div className="flex flex-col gap-2">
            {data.students.map((s) => {
              const doneN = byStudentQuery.data?.get(s.id) ?? 0
              const pct = publishedCount ? Math.min(100, Math.round((doneN / publishedCount) * 100)) : 0
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white p-3.5">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-navy">{s.name}</div>
                    <div className="text-[12px] text-muted">@{s.username}</div>
                  </div>
                  {publishedCount > 0 ? (
                    <div className="w-36 shrink-0 sm:w-44">
                      <div className="mb-1 flex justify-between text-[11.5px] text-muted">
                        <span>{ar ? 'إنجاز المحتوى' : 'Content'}</span>
                        <span>
                          {doneN}/{publishedCount}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-bg-soft">
                        <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[12.5px] text-faint">{t('tCourseDetail.progress', { n: String(s.progress) })}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {active === 'announcements' && <CourseAnnouncements courseId={id!} manage />}
      {active === 'qa' && <CourseDiscussion courseId={id!} staff />}

      {showNewAssignment && profile && (
        <NewAssignmentModal
          courseId={id!}
          teacherId={profile.id}
          students={data.students}
          onClose={() => setShowNewAssignment(false)}
          onCreated={() => void queryClient.invalidateQueries({ queryKey: ['course-assignments', id] })}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white px-4 py-3 ${highlight ? 'border-gold/60' : 'border-border'}`}>
      <div className={`text-[20px] font-bold ${highlight ? 'text-accent' : 'text-navy'}`}>{value}</div>
      <div className="text-[12px] text-muted">{label}</div>
    </div>
  )
}
