import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getTaughtCourseDetail } from '@/lib/courses'
import { createAssignment, listAssignmentsForCourse, uploadAssignmentFile } from '@/lib/assignments'

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

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))

  const submit = async () => {
    if (!title.trim() || !dueDate) {
      setError('اسم الواجب وتاريخ التسليم مطلوبان')
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
      setError(e instanceof Error ? e.message : 'تعذر إنشاء الواجب')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-[460px] overflow-y-auto rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 font-heading text-lg font-bold text-navy">واجب جديد</div>
        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="اسم الواجب"
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
            placeholder="تفاصيل الواجب (اختياري)"
            rows={3}
            className="resize-y rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

          <label className="flex items-center gap-2 text-[13.5px] text-navy">
            <input type="checkbox" checked={targetAll} onChange={(e) => setTargetAll(e.target.checked)} />
            لكل الطلاب المسجّلين بالبرنامج
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
              إنشاء الواجب
            </button>
            <button onClick={onClose} className="rounded-md border border-border px-5 py-2.75 text-[14px] text-navy">
              إلغاء
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
  const queryClient = useQueryClient()
  const [showNewAssignment, setShowNewAssignment] = useState(false)

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

  if (isLoading) return <div className="text-muted">جارِ التحميل...</div>
  if (!data) {
    return (
      <div>
        <div className="mb-3 text-muted">أنت غير مكلّف بهذا البرنامج.</div>
        <Link to="/teacher/courses" className="text-navy no-underline">
          → رجوع للدورات والبرامج
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/teacher/courses" className="mb-4 inline-block text-[13px] text-muted no-underline">
        → رجوع للدورات والبرامج
      </Link>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{data.course.title}</div>
      <p className="mb-6 max-w-160 text-[14.5px] leading-8 text-muted-2">{data.course.description}</p>

      <div className="mb-6">
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

      <div className="mb-6">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="text-[15px] font-semibold text-navy">الواجبات</div>
          <button
            onClick={() => setShowNewAssignment(true)}
            className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover"
          >
            + واجب جديد
          </button>
        </div>
        {assignmentsQuery.data && assignmentsQuery.data.length === 0 && (
          <div className="text-[13.5px] text-muted">لا توجد واجبات بعد.</div>
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
                <div className="text-[12.5px] text-muted">تسليم: {a.due_date}</div>
              </div>
              <div className="text-[12.5px] text-faint">
                {a.submittedCount} تسليم · {a.gradedCount} مصحّح
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2.5 text-[15px] font-semibold text-navy">الطلاب المسجّلون ({data.students.length})</div>
        {data.students.length === 0 && <div className="text-[13.5px] text-muted">لا يوجد طلاب مسجّلون بعد.</div>}
        <div className="flex flex-col gap-2">
          {data.students.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-3.5">
              <div>
                <div className="text-[13.5px] font-semibold text-navy">{s.name}</div>
                <div className="text-[12px] text-muted">@{s.username}</div>
              </div>
              <div className="text-[12.5px] text-faint">{s.progress}% تقدّم</div>
            </div>
          ))}
        </div>
      </div>

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
