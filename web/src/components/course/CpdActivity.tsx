// Learner-facing SCFHS CPD activity blocks on the course page:
//   • CpdQuiz       — the activity assessment (multiple-choice, graded)
//   • CpdEvaluation — activity-satisfaction + speaker evaluation form
//   • MyAttendance  — the learner's own attendance across the activity sessions
// All tolerate migration 0091 not being applied yet.
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n'
import {
  checkinPath,
  EVAL_ASPECTS,
  emptyEvaluation,
  getLearnerQuiz,
  getMyAttendance,
  getMyBestAttempt,
  getMyEvaluation,
  submitEvaluation,
  submitQuiz,
  type CourseEvaluation,
  type QuizResult,
} from '@/lib/cpdActivity'

// ── Assessment / quiz ───────────────────────────────────────────────────────
export function CpdQuiz({ courseId, studentId }: { courseId: string; studentId: string }) {
  const { lang } = useLanguage()
  const tx = (a: string, e: string) => (lang === 'ar' ? a : e)
  const { data: quiz, isLoading } = useQuery({ queryKey: ['cpd-quiz', courseId], queryFn: () => getLearnerQuiz(courseId) })
  const { data: best, refetch: refetchBest } = useQuery({
    queryKey: ['cpd-quiz-best', courseId, studentId],
    queryFn: () => getMyBestAttempt(courseId, studentId),
  })
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [result, setResult] = useState<QuizResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (quiz) setAnswers(new Array(quiz.questions.length).fill(null))
  }, [quiz])

  if (isLoading) return <div className="py-8 text-center text-[13px] text-muted">…</div>
  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-soft/60 px-6 py-10 text-center text-[13px] text-muted">
        {tx('لا يوجد اختبار لهذا النشاط حاليًا.', 'No assessment for this activity yet.')}
      </div>
    )
  }

  const answered = answers.filter((a) => a !== null).length
  const allAnswered = answered === quiz.questions.length

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const r = await submitQuiz(courseId, answers)
      setResult(r)
      await refetchBest()
    } catch {
      setError(tx('تعذّر إرسال الاختبار. حاول مرة أخرى.', 'Could not submit the assessment. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  // Result just submitted, or prior best attempt banner.
  const banner = result ?? (best ? { score: best.score, passed: best.passed, pass_mark: quiz.passMark, correct: 0, total: quiz.questions.length } : null)

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-border bg-white p-5">
        <div className="text-[15px] font-bold text-navy">{tx('اختبار النشاط (التقييم المعرفي)', 'Activity assessment')}</div>
        <p className="mt-1.5 text-[13px] leading-7 text-muted">
          {tx(
            `اختبار من ${quiz.questions.length} سؤالًا. نسبة النجاح المطلوبة ${quiz.passMark}%. يُحتسب ضمن متطلبات إصدار الشهادة.`,
            `${quiz.questions.length}-question assessment. Pass mark ${quiz.passMark}%. Counts towards the certificate requirements.`,
          )}
        </p>
        {banner && (
          <div
            className={`mt-3 rounded-xl px-4 py-3 text-[13.5px] font-semibold ${
              banner.passed ? 'bg-success/10 text-success' : 'bg-error-bg text-error'
            }`}
          >
            {result ? tx('نتيجتك: ', 'Your score: ') : tx('أفضل محاولة سابقة: ', 'Best previous attempt: ')}
            <span dir="ltr">{banner.score}%</span>{' · '}
            {banner.passed ? tx('ناجح ✔', 'Passed ✔') : tx('لم تجتز نسبة النجاح', 'Below the pass mark')}
            {result && (
              <span className="font-normal">
                {' '}
                ({tx('إجابات صحيحة', 'correct')} <span dir="ltr">{result.correct}/{result.total}</span>)
              </span>
            )}
          </div>
        )}
      </div>

      {!started && !result ? (
        <button onClick={() => setStarted(true)} className="rounded-full bg-navy px-6 py-2.5 text-[14px] font-bold text-white">
          {best ? tx('إعادة المحاولة', 'Retake the assessment') : tx('ابدأ الاختبار', 'Start the assessment')}
        </button>
      ) : (
        <div className="flex flex-col gap-4">
          {quiz.questions.map((q, qi) => (
            <div key={qi} className="rounded-2xl border border-border bg-white p-5">
              <div className="mb-3 flex gap-2 text-[14.5px] font-semibold text-navy">
                <span className="shrink-0 text-accent">{qi + 1}.</span>
                <span>{q.prompt}</span>
              </div>
              <div className="flex flex-col gap-2">
                {q.options.map((opt, oi) => {
                  const picked = answers[qi] === oi
                  return (
                    <label
                      key={oi}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13.5px] ${
                        picked ? 'border-navy bg-navy/5 font-semibold text-navy' : 'border-border text-muted-2 hover:border-navy/40'
                      } ${result ? 'pointer-events-none opacity-70' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`q${qi}`}
                        checked={picked}
                        disabled={!!result}
                        onChange={() => setAnswers((a) => a.map((v, j) => (j === qi ? oi : v)))}
                      />
                      {opt}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          {error && <div className="rounded-lg bg-error-bg px-3 py-2 text-[12.5px] text-error">{error}</div>}

          {!result && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => void submit()}
                disabled={!allAnswered || busy}
                className="rounded-full bg-gold px-6 py-2.5 text-[14px] font-bold text-navy disabled:opacity-50"
              >
                {busy ? tx('جارٍ التصحيح…', 'Grading…') : tx('إرسال الإجابات', 'Submit answers')}
              </button>
              <span className="text-[12.5px] text-muted">
                {tx(`أجبت على ${answered} من ${quiz.questions.length}`, `${answered} of ${quiz.questions.length} answered`)}
              </span>
            </div>
          )}
          {result && (
            <button
              onClick={() => {
                setResult(null)
                setStarted(false)
                setAnswers(new Array(quiz.questions.length).fill(null))
              }}
              className="self-start rounded-full border border-border px-5 py-2 text-[13px] font-semibold text-navy hover:border-navy"
            >
              {tx('إعادة المحاولة', 'Retake')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Evaluation / feedback ───────────────────────────────────────────────────
function Stars({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          aria-label={`${n}`}
          className={`text-[20px] leading-none ${n <= value ? 'text-gold' : 'text-border-2'} disabled:cursor-default`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function CpdEvaluation({
  courseId,
  studentId,
  speakerNames,
}: {
  courseId: string
  studentId: string
  speakerNames: string[]
}) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const tx = (a: string, e: string) => (ar ? a : e)
  const { data: existing, isLoading, refetch } = useQuery({
    queryKey: ['cpd-eval', courseId, studentId],
    queryFn: () => getMyEvaluation(courseId, studentId),
  })
  const [form, setForm] = useState<CourseEvaluation>(emptyEvaluation)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Seed the form from a saved evaluation, merging in the current speaker list.
  useEffect(() => {
    const base = existing ?? emptyEvaluation
    const speakers = speakerNames.map((name) => {
      const prev = base.speakers.find((s) => s.name === name)
      return prev ?? { name, knowledge: 0, delivery: 0, comment: '' }
    })
    setForm({ ...base, speakers })
    setSaved(!!existing)
  }, [existing, speakerNames])

  if (isLoading) return <div className="py-8 text-center text-[13px] text-muted">…</div>

  const setRating = (key: string, v: number) => setForm((f) => ({ ...f, ratings: { ...f.ratings, [key]: v } }))
  const setSpeaker = (i: number, patch: Partial<CourseEvaluation['speakers'][number]>) =>
    setForm((f) => ({ ...f, speakers: f.speakers.map((s, j) => (j === i ? { ...s, ...patch } : s)) }))

  const complete = EVAL_ASPECTS.every((a) => (form.ratings[a.key] ?? 0) > 0)

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await submitEvaluation(courseId, studentId, form)
      setSaved(true)
      await refetch()
    } catch {
      setError(tx('تعذّر حفظ التقييم. تأكد من تطبيق تحديث قاعدة البيانات 0091.', 'Could not save the evaluation. Make sure database update 0091 is applied.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="text-[15px] font-bold text-navy">{tx('نموذج تقييم النشاط', 'Activity evaluation')}</div>
        <p className="mt-1.5 text-[13px] leading-7 text-muted">
          {tx(
            'رأيك يُستخدم لتحسين الأنشطة القادمة واختيار المتحدثين. التقييم إلزامي ضمن متطلبات الشهادة، ويُعرض بشكل مجمّع ومجهول المصدر.',
            'Your feedback improves future activities and speaker selection. The evaluation is a certificate requirement and is reported in aggregate, anonymously.',
          )}
        </p>
        {saved && <div className="mt-3 rounded-xl bg-success/10 px-4 py-2.5 text-[13px] font-semibold text-success">{tx('تم حفظ تقييمك. يمكنك تعديله.', 'Your evaluation is saved. You can update it.')}</div>}
      </div>

      {/* Activity aspects */}
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="mb-3 text-[14px] font-bold text-navy">{tx('رضاك عن النشاط', 'Activity satisfaction')}</div>
        <div className="flex flex-col divide-y divide-border">
          {EVAL_ASPECTS.map((a) => (
            <div key={a.key} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[13.5px] text-muted-2">{ar ? a.ar : a.en}</span>
              <Stars value={form.ratings[a.key] ?? 0} onChange={(v) => setRating(a.key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Speakers */}
      {form.speakers.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="mb-3 text-[14px] font-bold text-navy">{tx('تقييم المتحدثين', 'Speaker evaluation')}</div>
          <div className="flex flex-col gap-4">
            {form.speakers.map((s, i) => (
              <div key={i} className="rounded-xl border border-border-2 bg-bg-soft p-4">
                <div className="mb-2 text-[13.5px] font-bold text-navy">{s.name}</div>
                <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                  <span className="text-[13px] text-muted-2">{tx('التمكّن العلمي من الموضوع', 'Command of the subject')}</span>
                  <Stars value={s.knowledge} onChange={(v) => setSpeaker(i, { knowledge: v })} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                  <span className="text-[13px] text-muted-2">{tx('أسلوب العرض والتوصيل', 'Delivery and presentation')}</span>
                  <Stars value={s.delivery} onChange={(v) => setSpeaker(i, { delivery: v })} />
                </div>
                <textarea
                  value={s.comment}
                  onChange={(e) => setSpeaker(i, { comment: e.target.value })}
                  rows={2}
                  placeholder={tx('ملاحظات عن المتحدث (اختياري)', 'Notes about the speaker (optional)')}
                  className="mt-2 w-full resize-y rounded-md border border-border px-3 py-2 text-[13px]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommend + comments */}
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13.5px] font-semibold text-navy">{tx('هل توصي زملاءك بهذا النشاط؟', 'Would you recommend this activity to colleagues?')}</span>
          <div className="flex gap-2">
            {[
              [true, tx('نعم', 'Yes')],
              [false, tx('لا', 'No')],
            ].map(([val, label]) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setForm((f) => ({ ...f, would_recommend: val as boolean }))}
                className={`rounded-full border px-4 py-1.5 text-[12.5px] font-semibold ${
                  form.would_recommend === val ? 'border-navy bg-navy text-white' : 'border-border text-muted hover:border-navy/40'
                }`}
              >
                {label as string}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={form.comments}
          onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
          rows={3}
          placeholder={tx('اقتراحاتك لتحسين النشاط (اختياري)', 'Your suggestions to improve the activity (optional)')}
          className="mt-3 w-full resize-y rounded-md border border-border px-3 py-2 text-[13px]"
        />
      </div>

      {error && <div className="rounded-lg bg-error-bg px-3 py-2 text-[12.5px] text-error">{error}</div>}
      <div className="flex items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={!complete || busy}
          className="rounded-full bg-gold px-6 py-2.5 text-[14px] font-bold text-navy disabled:opacity-50"
        >
          {busy ? tx('جارٍ الحفظ…', 'Saving…') : saved ? tx('تحديث التقييم', 'Update evaluation') : tx('إرسال التقييم', 'Submit evaluation')}
        </button>
        {!complete && <span className="text-[12.5px] text-muted">{tx('قيّم جميع جوانب النشاط أولًا', 'Rate every activity aspect first')}</span>}
      </div>
    </div>
  )
}

// ── Learner's own attendance ────────────────────────────────────────────────
export function MyAttendance({ courseId, studentId }: { courseId: string; studentId: string }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const tx = (a: string, e: string) => (ar ? a : e)
  const { data: rows, isLoading } = useQuery({
    queryKey: ['cpd-my-attendance', courseId, studentId],
    queryFn: () => getMyAttendance(courseId, studentId),
  })
  const today = new Date().toISOString().slice(0, 10)
  const summary = useMemo(() => {
    const held = (rows ?? []).filter((r) => r.session_date <= today)
    const present = held.filter((r) => r.present === true).length
    return { held: held.length, present }
  }, [rows, today])

  if (isLoading) return <div className="py-8 text-center text-[13px] text-muted">…</div>
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-soft/60 px-6 py-10 text-center text-[13px] text-muted">
        {tx('لا توجد جلسات مباشرة مجدولة لهذا النشاط.', 'No live sessions scheduled for this activity.')}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-border bg-white p-5">
        <div className="text-[15px] font-bold text-navy">{tx('سجل حضوري', 'My attendance record')}</div>
        <p className="mt-1.5 text-[13px] leading-7 text-muted">
          {tx(
            `حضرت ${summary.present} من ${summary.held} جلسة منعقدة. يُحتسب الحضور إلكترونيًا ضمن متطلبات ساعات التعليم المستمر.`,
            `You attended ${summary.present} of ${summary.held} held sessions. Attendance is recorded electronically towards the CPD hour requirements.`,
          )}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const upcoming = r.session_date > today
          return (
            <div key={r.session_id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-4">
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-navy">{r.title}</div>
                <div className="text-[12px] text-muted" dir="ltr">
                  <span className="block text-start">
                    {r.session_date}
                    {r.session_time ? ` · ${r.session_time.slice(0, 5)}` : ''}
                  </span>
                </div>
              </div>
              {r.session_date === today && r.present !== true && (
                <Link
                  to={checkinPath(r.session_id)}
                  className="shrink-0 rounded-full bg-gold px-3.5 py-1.5 text-[12px] font-bold text-navy no-underline"
                >
                  {tx('سجّل حضوري', 'Check in')}
                </Link>
              )}
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-bold ${
                  upcoming
                    ? 'bg-navy/5 text-muted'
                    : r.present === true
                      ? 'bg-success/10 text-success'
                      : r.present === false
                        ? 'bg-error-bg text-error'
                        : 'bg-bg-soft text-muted-2'
                }`}
              >
                {upcoming
                  ? tx('قادمة', 'Upcoming')
                  : r.present === true
                    ? tx('حاضر ✔', 'Present ✔')
                    : r.present === false
                      ? tx('غائب', 'Absent')
                      : tx('لم يُسجَّل بعد', 'Not recorded yet')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
