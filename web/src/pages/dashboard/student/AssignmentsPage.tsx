import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import {
  listMyAssignments,
  submitAnswer,
  uploadSubmissionFile,
  type MyAssignment,
} from '@/lib/assignments'

function statusLabel(a: MyAssignment) {
  if (!a.submission || a.submission.status === 'pending') return 'لم يُسلّم بعد'
  if (a.submission.status === 'submitted') return 'بانتظار التصحيح'
  return `تم التصحيح — ${a.submission.grade}/100`
}

function SubmitForm({ assignment, onSubmitted }: { assignment: MyAssignment; onSubmitted: () => void }) {
  const { profile } = useAuth()
  const [answer, setAnswer] = useState(assignment.submission?.answer_text ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!profile) return
    setBusy(true)
    try {
      const fileUrl = file ? await uploadSubmissionFile(profile.id, file) : (assignment.submission?.file_url ?? null)
      await submitAnswer({
        assignmentId: assignment.id,
        studentId: profile.id,
        answerText: answer.trim() || null,
        fileUrl,
      })
      onSubmitted()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="إجابتك (اختياري)"
        rows={3}
        className="resize-y rounded-md border border-border px-3 py-2 text-[13.5px]"
      />
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button
        onClick={() => void submit()}
        disabled={busy}
        className="self-start rounded-md bg-navy px-4.5 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
      >
        {assignment.submission ? 'تحديث الإجابة' : 'تسليم الواجب'}
      </button>
    </div>
  )
}

export function StudentAssignmentsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-assignments', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyAssignments(profile!.id),
  })

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['my-assignments', profile?.id] })

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">واجباتي</div>

      {isLoading && <div className="text-muted">جارِ التحميل...</div>}
      {data && data.length === 0 && <div className="text-muted">لا توجد واجبات حاليًا.</div>}

      <div className="flex flex-col gap-2.5">
        {(data ?? []).map((a) => {
          const graded = a.submission?.status === 'graded'
          return (
            <div key={a.id} className="rounded-lg border border-border bg-white p-4">
              <button
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                className="flex w-full items-center justify-between text-right"
              >
                <div>
                  <div className="text-[14px] font-semibold text-navy">{a.title}</div>
                  <div className="text-[12.5px] text-muted">
                    {a.courseTitle} · تسليم: {a.due_date}
                  </div>
                </div>
                <span
                  className={`text-[12px] font-semibold ${
                    graded ? 'text-success' : a.submission ? 'text-accent' : 'text-faint'
                  }`}
                >
                  {statusLabel(a)}
                </span>
              </button>

              {expanded === a.id && (
                <div className="mt-3 border-t border-border-2 pt-3">
                  {a.details && <p className="mb-2 text-[13.5px] leading-7 text-muted-2">{a.details}</p>}
                  {a.file_url && (
                    <a href={a.file_url} target="_blank" rel="noreferrer" className="mb-2 inline-block text-[12.5px] text-navy">
                      📎 ملف الواجب من المعلم
                    </a>
                  )}
                  {graded && a.submission?.feedback && (
                    <div className="mb-2 rounded-md bg-success-bg p-2.5 text-[13px] text-success">
                      ملاحظات المعلم: {a.submission.feedback}
                    </div>
                  )}
                  {!graded && <SubmitForm assignment={a} onSubmitted={refresh} />}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
