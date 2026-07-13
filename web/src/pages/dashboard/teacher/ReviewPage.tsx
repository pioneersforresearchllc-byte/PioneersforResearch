import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import {
  gradeSubmission,
  listAssignmentsForTeacher,
  listSubmissionsForAssignment,
  type AssignmentForReview,
  type SubmissionWithStudent,
} from '@/lib/assignments'

function GradeForm({ submission, onGraded }: { submission: SubmissionWithStudent; onGraded: () => void }) {
  const [grade, setGrade] = useState(submission.grade?.toString() ?? '')
  const [feedback, setFeedback] = useState(submission.feedback ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    const g = Number(grade)
    if (!grade || Number.isNaN(g) || g < 0 || g > 100) {
      setError('الدرجة يجب أن تكون رقمًا بين 0 و100')
      return
    }
    setError('')
    setBusy(true)
    try {
      await gradeSubmission(submission.id, g, feedback.trim() || null)
      onGraded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ الدرجة')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          placeholder="الدرجة /100"
          className="w-24 rounded-md border border-border px-2.5 py-1.5 text-[12.5px]"
        />
        <input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="ملاحظات (اختياري)"
          className="min-w-32 flex-1 rounded-md border border-border px-2.5 py-1.5 text-[12.5px]"
        />
        <button
          onClick={() => void save()}
          disabled={busy}
          className="rounded-md bg-navy px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {submission.status === 'graded' ? 'تحديث الدرجة' : 'حفظ الدرجة'}
        </button>
      </div>
      {error && <div className="text-[12px] text-error">{error}</div>}
    </div>
  )
}

function AssignmentPanel({ assignment, onClose }: { assignment: AssignmentForReview; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['assignment-submissions', assignment.id],
    queryFn: () => listSubmissionsForAssignment(assignment.id),
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['assignment-submissions', assignment.id] })
    void queryClient.invalidateQueries({ queryKey: ['teacher-review-assignments'] })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-[560px] flex-col overflow-y-auto rounded-xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 font-heading text-lg font-bold text-navy">{assignment.title}</div>
        <div className="mb-4 text-[12.5px] text-muted">{assignment.courseTitle} · تسليم: {assignment.due_date}</div>

        {(data ?? []).length === 0 && <div className="text-[13.5px] text-muted">لا تسليمات بعد.</div>}
        <div className="flex flex-col gap-3">
          {(data ?? []).map((s) => (
            <div key={s.id} className="rounded-lg border border-border p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="text-[13.5px] font-semibold text-navy">{s.studentName}</div>
                <span className="text-[11.5px] text-faint">@{s.studentUsername}</span>
              </div>
              {s.answer_text && (
                <div className="mb-1.5 whitespace-pre-wrap rounded-md bg-bg-soft p-2.5 text-[13px] text-muted-2">
                  {s.answer_text}
                </div>
              )}
              {s.file_url && (
                <a
                  href={s.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-1.5 inline-block text-[12.5px] text-navy"
                >
                  📎 ملف مرفق من الطالب
                </a>
              )}
              {s.status === 'pending' ? (
                <div className="text-[12.5px] text-faint">لم يُسلّم بعد</div>
              ) : (
                <GradeForm submission={s} onGraded={refresh} />
              )}
            </div>
          ))}
        </div>

        <button onClick={onClose} className="mt-4 rounded-md border border-border py-2 text-[13px] text-navy">
          إغلاق
        </button>
      </div>
    </div>
  )
}

export function TeacherReviewPage() {
  const { profile } = useAuth()
  const [active, setActive] = useState<AssignmentForReview | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-review-assignments', profile?.id],
    enabled: !!profile,
    queryFn: () => listAssignmentsForTeacher(profile!.id),
  })

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">مراجعة الواجبات</div>

      {isLoading && <div className="text-muted">جارِ التحميل...</div>}
      {data && data.length === 0 && <div className="text-muted">لا توجد واجبات بعد.</div>}

      <div className="flex flex-col gap-2.5">
        {(data ?? []).map((a) => (
          <button
            key={a.id}
            onClick={() => setActive(a)}
            className="flex items-center justify-between rounded-lg border border-border bg-white p-4 text-right hover:border-navy"
          >
            <div>
              <div className="text-[14px] font-semibold text-navy">{a.title}</div>
              <div className="text-[12.5px] text-muted">
                {a.courseTitle} · تسليم: {a.due_date}
              </div>
            </div>
            <div className="text-[12.5px] text-faint">
              {a.submittedCount} تسليم · {a.gradedCount} مصحّح
            </div>
          </button>
        ))}
      </div>

      {active && <AssignmentPanel assignment={active} onClose={() => setActive(null)} />}
    </div>
  )
}
