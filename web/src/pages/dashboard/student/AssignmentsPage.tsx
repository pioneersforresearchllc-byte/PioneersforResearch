import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import {
  listMyAssignments,
  signAssignmentFile,
  signSubmissionFile,
  submitAnswer,
  uploadSubmissionFile,
  type MyAssignment,
} from '@/lib/assignments'
import { SignedFileLink } from '@/components/SignedFileLink'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { SubmissionThread } from '@/pages/dashboard/shared/SubmissionThread'
import { PaperclipIcon } from '@/pages/dashboard/chat/Icons'

function statusLabel(a: MyAssignment, t: ReturnType<typeof useLanguage>['t']) {
  if (!a.submission || a.submission.status === 'pending') return t('sAssign.notSubmitted')
  if (a.submission.status === 'submitted') return t('sAssign.awaitingGrade')
  return t('sAssign.graded', { grade: String(a.submission.grade) })
}

function SubmitForm({ assignment, onSubmitted }: { assignment: MyAssignment; onSubmitted: () => void }) {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [answer, setAnswer] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const submit = async () => {
    if (!profile) return
    setBusy(true)
    setError('')
    try {
      const fileUrl = file ? await uploadSubmissionFile(profile.id, file) : null
      await submitAnswer({
        assignmentId: assignment.id,
        studentId: profile.id,
        answerText: answer.trim() || null,
        fileUrl,
      })
      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('sAssign.submitError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={t('sAssign.answerPh')}
        rows={3}
        className="resize-y rounded-md border border-border px-3 py-2 text-[13.5px]"
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title={t('sAssign.attachFile')}
          className="flex shrink-0 items-center justify-center rounded-full border border-border p-2 text-muted hover:border-navy hover:text-navy"
        >
          <PaperclipIcon />
        </button>
        {file && <span className="truncate text-[12.5px] text-navy">{file.name}</span>}
      </div>
      {error && <div className="text-[12px] text-error">{error}</div>}
      <div className="text-[11.5px] text-faint">{t('sAssign.noEditWarning')}</div>
      <button
        onClick={() => void submit()}
        disabled={busy}
        className="self-start rounded-md bg-navy px-4.5 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
      >
        {t('sAssign.submit')}
      </button>
    </div>
  )
}

export function StudentAssignmentsPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
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
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('sAssign.title')}</div>

      {isLoading && <LoadingState />}
      {data && data.length === 0 && <EmptyState title={t('sAssign.none')} />}

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
                    {t('sAssign.courseDue', { course: a.courseTitle, date: a.due_date })}
                  </div>
                </div>
                <span
                  className={`text-[12px] font-semibold ${
                    graded ? 'text-success' : a.submission ? 'text-accent' : 'text-faint'
                  }`}
                >
                  {statusLabel(a, t)}
                </span>
              </button>

              {expanded === a.id && (
                <div className="mt-3 border-t border-border-2 pt-3">
                  {a.details && <p className="mb-2 text-[13.5px] leading-7 text-muted-2">{a.details}</p>}
                  {a.file_url && (
                    <div className="mb-2">
                      <SignedFileLink sign={() => signAssignmentFile(a.file_url!)} label={t('sAssign.teacherFile')} />
                    </div>
                  )}

                  {a.submission ? (
                    <div className="flex flex-col gap-3">
                      <div className="rounded-md bg-bg-soft p-2.5">
                        {a.submission.answer_text && (
                          <p className="mb-1.5 whitespace-pre-wrap text-[13px] text-muted-2">{a.submission.answer_text}</p>
                        )}
                        {a.submission.file_url && (
                          <div className="mb-1.5">
                            <SignedFileLink sign={() => signSubmissionFile(a.submission!.file_url!)} label={t('sAssign.yourFile')} />
                          </div>
                        )}
                        {graded && a.submission.grade != null && (
                          <div className="mt-1.5 rounded-md bg-navy/[0.06] p-2 text-[13px] font-semibold text-navy">
                            {t('sAssign.gradeLabel', { grade: String(a.submission.grade) })}
                          </div>
                        )}
                        {graded && a.submission.feedback && (
                          <div className="mt-1.5 rounded-md bg-success-bg p-2 text-[13px] text-success">
                            {t('sAssign.feedbackLabel', { text: a.submission.feedback })}
                          </div>
                        )}
                        {!graded && (
                          <div className="text-[12.5px] text-muted">{t('sAssign.submittedWaiting')}</div>
                        )}
                      </div>
                      {profile && <SubmissionThread submissionId={a.submission.id} myUserId={profile.id} />}
                    </div>
                  ) : (
                    <SubmitForm assignment={a} onSubmitted={refresh} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
