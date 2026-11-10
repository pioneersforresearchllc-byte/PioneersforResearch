// Owner: SCFHS CPD indicators and per-activity evaluation reports — learning
// resources, resource usage rate, LMS satisfaction, assessment and attendance
// results, activity evaluation averages, and speaker evaluations used to keep
// the approved speakers list up to date (migration 0092).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { LoadingState } from '@/components/LoadingState'
import { EVAL_ASPECTS, getActivityReport, getPlatformIndicators, pct, type ActivityReport } from '@/lib/cpdActivity'

/** Speakers averaging below this (out of 5) are flagged for committee review. */
const SPEAKER_REVIEW_THRESHOLD = 3.5

async function listCpdActivities(): Promise<{ id: string; title: string }[]> {
  const { data, error } = await supabase.from('courses').select('id, title').not('cpd', 'is', null).order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as { id: string; title: string }[]
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-1 font-heading text-[24px] font-bold text-navy">{value}</div>
      {hint && <div className="mt-0.5 text-[11.5px] leading-5 text-faint">{hint}</div>}
    </div>
  )
}

function Bar({ value }: { value: number | null | undefined }) {
  const v = typeof value === 'number' ? value : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-soft">
        <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, (v / 5) * 100)}%` }} />
      </div>
      <span className="w-10 text-end text-[12.5px] font-semibold text-navy">{typeof value === 'number' ? value.toFixed(1) : '—'}</span>
    </div>
  )
}

export function OwnerCpdReportsPage() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const tx = (a: string, e: string) => (ar ? a : e)

  const { data: ind, isLoading } = useQuery({ queryKey: ['cpd-indicators'], queryFn: getPlatformIndicators })
  const { data: activities } = useQuery({ queryKey: ['cpd-activities'], queryFn: listCpdActivities })
  const [courseId, setCourseId] = useState('')
  useEffect(() => {
    if (!courseId && activities && activities.length > 0) setCourseId(activities[0].id)
  }, [activities, courseId])
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['cpd-activity-report', courseId],
    queryFn: () => getActivityReport(courseId),
    enabled: !!courseId,
  })

  const kindLabel: Record<string, [string, string]> = {
    file: ['ملفات (PDF، عروض، صوت، فيديو)', 'Files (PDF, slides, audio, video)'],
    video: ['فيديوهات', 'Videos'],
    link: ['روابط ومصادر خارجية', 'Links & external resources'],
    note: ['ملاحظات ودروس مكتوبة', 'Notes & written lessons'],
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-heading text-xl font-bold text-navy">{tx('التعليم المستمر (CPD): المؤشرات والتقارير', 'CPD indicators & reports')}</div>
        <div className="mt-1 text-[13px] leading-6 text-muted">
          {tx(
            'مؤشرات تقييم عملية التعلم ومخرجاته في بيئة التعلم الإلكتروني، محسوبة مباشرة من بيانات المنصة للأنشطة التي تحتوي على بيانات CPD.',
            'Learning-process and outcome indicators for the e-learning environment, computed live from platform data for activities that have CPD details.',
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !ind ? (
        <div className="rounded-lg bg-gold/10 p-3 text-[13px] text-navy">
          {tx('شغّل ملف قاعدة البيانات 0092 أولًا لتفعيل هذه الصفحة.', 'Run database migration 0092 first to enable this page.')}
        </div>
      ) : (
        <>
          <section>
            <div className="mb-3 text-[15px] font-bold text-navy">{tx('مؤشرات المنصة', 'Platform indicators')}</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label={tx('أنشطة التعليم المستمر', 'CPD activities')} value={ind.activities} />
              <Stat
                label={tx('مصادر التعلم المستوفية لمعايير التطوير المهني', 'Learning resources meeting CPD standards')}
                value={ind.resources_total}
                hint={tx('المواد المنشورة داخل أنشطة CPD المعتمدة من اللجنة العلمية', 'Published materials inside committee-approved CPD activities')}
              />
              <Stat label={tx('الممارسون المسجّلون', 'Enrolled practitioners')} value={ind.learners} />
              <Stat
                label={tx('نسبة استخدام الممارسين لمصادر التعلم', 'Practitioners using learning resources')}
                value={pct(ind.learners_using_resources, ind.learners)}
                hint={`${ind.learners_using_resources} / ${ind.learners}`}
              />
              <Stat
                label={tx('نسبة الرضا عن نظام إدارة التعلم', 'Satisfaction with the LMS')}
                value={pct(ind.lms_satisfied, ind.lms_rated)}
                hint={tx(`راضٍ (4–5 من 5) من ${ind.lms_rated} تقييم · المتوسط ${ind.lms_avg ?? '—'}`, `Satisfied (4–5 of 5) of ${ind.lms_rated} ratings · avg ${ind.lms_avg ?? '—'}`)}
              />
              <Stat
                label={tx('نسبة الرضا العام عن الأنشطة', 'Overall activity satisfaction')}
                value={pct(ind.overall_satisfied, ind.overall_rated)}
                hint={`${ind.overall_satisfied} / ${ind.overall_rated}`}
              />
              <Stat label={tx('نسبة النجاح في الاختبارات', 'Assessment pass rate')} value={pct(ind.quiz_passed, ind.quiz_takers)} hint={`${ind.quiz_passed} / ${ind.quiz_takers}`} />
              <Stat
                label={tx('نسبة الحضور المسجّل', 'Recorded attendance rate')}
                value={pct(ind.attendance_present, ind.attendance_marks)}
                hint={`${ind.attendance_present} / ${ind.attendance_marks}`}
              />
            </div>
            {Object.keys(ind.resources_by_kind).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(ind.resources_by_kind).map(([k, n]) => (
                  <span key={k} className="rounded-full border border-border bg-white px-3 py-1 text-[12px] text-navy">
                    {(kindLabel[k] ?? [k, k])[ar ? 0 : 1]}: <b>{n}</b>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[15px] font-bold text-navy">{tx('تقرير نشاط', 'Activity report')}</div>
              {activities && activities.length > 0 && (
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="max-w-full rounded-md border border-border bg-white px-3 py-2 text-[13.5px]"
                >
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {!activities || activities.length === 0 ? (
              <p className="text-[13px] text-muted">
                {tx('لا توجد أنشطة فيها بيانات CPD بعد. أضف بيانات CPD من «الدورات والبرامج».', 'No activities with CPD details yet. Add CPD details from Courses.')}
              </p>
            ) : reportLoading ? (
              <LoadingState />
            ) : !report ? (
              <p className="text-[13px] text-muted">{tx('تعذّر تحميل التقرير.', 'Could not load the report.')}</p>
            ) : (
              <ActivityReportView report={report} courseId={courseId} ar={ar} />
            )}
          </section>

          <section className="rounded-xl border border-border-2 bg-bg-soft p-4 text-[13px] leading-7 text-navy">
            <div className="mb-1 font-bold">{tx('آلية تحديث قائمة المتحدثين', 'How the speakers list is updated')}</div>
            {tx(
              `يقيّم المتدربون كل متحدث (المعرفة العلمية، وأسلوب العرض) في نموذج تقييم النشاط داخل المنصة. بعد كل نشاط تراجع اللجنة العلمية هذا التقرير: يبقى المتحدث الذي متوسطه ${SPEAKER_REVIEW_THRESHOLD} فأعلى في قائمة المتحدثين المعتمدين، ويُحال من يقل عن ذلك للمراجعة (ملاحظات تطويرية أو مراجعة المحتوى أو الاستبعاد من الأنشطة القادمة)، ويُحدَّث سجل المتحدثين وتُوثَّق القرارات في محضر اللجنة.`,
              `Learners rate every speaker (scientific knowledge, delivery) in the in-platform activity evaluation. After each activity the scientific committee reviews this report: speakers averaging ${SPEAKER_REVIEW_THRESHOLD} or above stay on the approved list; those below are referred for review (developmental feedback, content review, or exclusion from future activities). The speakers register is updated and decisions are minuted.`,
            )}
          </section>
        </>
      )}
    </div>
  )
}

function ActivityReportView({ report: r, courseId, ar }: { report: ActivityReport; courseId: string; ar: boolean }) {
  const tx = (a: string, e: string) => (ar ? a : e)
  const expected = r.enrolled * r.sessions_held
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={tx('المسجّلون', 'Enrolled')} value={r.enrolled} />
        <Stat
          label={tx('نسبة الحضور', 'Attendance rate')}
          value={pct(r.present_marks, expected)}
          hint={tx(`${r.present_marks} حضور من ${r.sessions_held} جلسة منعقدة · ${r.self_checkins} تسجيل ذاتي`, `${r.present_marks} present over ${r.sessions_held} held sessions · ${r.self_checkins} self check-ins`)}
        />
        <Stat
          label={tx('النجاح في الاختبار', 'Assessment passed')}
          value={pct(r.quiz.passed, r.quiz.learners)}
          hint={tx(`${r.quiz.passed} / ${r.quiz.learners} · متوسط الدرجة ${r.quiz.avg_score}%`, `${r.quiz.passed} / ${r.quiz.learners} · avg score ${r.quiz.avg_score}%`)}
        />
        <Stat
          label={tx('استجابات التقييم', 'Evaluation responses')}
          value={pct(r.evaluation.responses, r.enrolled)}
          hint={tx(`${r.evaluation.responses} من ${r.enrolled} · يوصي به ${pct(r.evaluation.recommend_yes, r.evaluation.recommend_answered)}`, `${r.evaluation.responses} of ${r.enrolled} · recommend ${pct(r.evaluation.recommend_yes, r.evaluation.recommend_answered)}`)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <div className="mb-2 text-[13.5px] font-bold text-navy">{tx('متوسط تقييم النشاط (من 5)', 'Activity evaluation averages (of 5)')}</div>
          <div className="flex flex-col gap-2.5">
            {EVAL_ASPECTS.map((a) => (
              <div key={a.key}>
                <div className="mb-1 text-[12.5px] text-muted-2">{ar ? a.ar : a.en}</div>
                <Bar value={r.aspects[a.key]} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[13.5px] font-bold text-navy">{tx('تقييم المتحدثين', 'Speaker evaluations')}</div>
          {r.speakers.length === 0 ? (
            <p className="text-[12.5px] text-muted">{tx('لا توجد تقييمات للمتحدثين بعد.', 'No speaker ratings yet.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-muted">
                    <th className="py-1.5 text-start font-semibold">{tx('المتحدث', 'Speaker')}</th>
                    <th className="py-1.5 text-center font-semibold">{tx('المعرفة', 'Knowledge')}</th>
                    <th className="py-1.5 text-center font-semibold">{tx('العرض', 'Delivery')}</th>
                    <th className="py-1.5 text-center font-semibold">{tx('الحالة', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.speakers.map((s) => {
                    const vals = [s.knowledge, s.delivery].filter((v): v is number => typeof v === 'number')
                    const avg = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null
                    const ok = avg === null || avg >= SPEAKER_REVIEW_THRESHOLD
                    return (
                      <tr key={s.name} className="border-t border-border">
                        <td className="py-2 font-semibold text-navy">
                          {s.name}
                          <div className="text-[11px] font-normal text-faint">{tx(`${s.responses} تقييم`, `${s.responses} ratings`)}</div>
                        </td>
                        <td className="py-2 text-center">{s.knowledge ?? '—'}</td>
                        <td className="py-2 text-center">{s.delivery ?? '—'}</td>
                        <td className="py-2 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ok ? 'bg-success/10 text-success' : 'bg-error-bg text-error'}`}>
                            {ok ? tx('معتمد', 'Approved') : tx('يحتاج مراجعة', 'Needs review')}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <div className="mb-2 text-[13.5px] font-bold text-navy">{tx('مصادر التعلم في النشاط', 'Learning resources in this activity')}</div>
          <p className="text-[13px] leading-7 text-muted-2">
            {tx(
              `${r.materials.published} مادة منشورة · استخدمها ${r.materials.learners_using} من ${r.enrolled} متدرب (${pct(r.materials.learners_using, r.enrolled)}) · ${r.materials.completions} مرة إكمال.`,
              `${r.materials.published} published items · used by ${r.materials.learners_using} of ${r.enrolled} learners (${pct(r.materials.learners_using, r.enrolled)}) · ${r.materials.completions} completions.`,
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
            <Link to={`/course/${courseId}`} className="rounded-md border border-border px-3 py-1.5 text-navy no-underline hover:border-navy">
              {tx('صفحة النشاط العامة', 'Public activity page')}
            </Link>
            <Link to={`/owner/courses/${courseId}`} className="rounded-md border border-border px-3 py-1.5 text-navy no-underline hover:border-navy">
              {tx('مساحة النشاط والمحاضرات', 'Activity space & lectures')}
            </Link>
          </div>
        </div>
        <div>
          <div className="mb-2 text-[13.5px] font-bold text-navy">{tx('ملاحظات المتدربين', 'Learner comments')}</div>
          {r.comments.length === 0 ? (
            <p className="text-[12.5px] text-muted">{tx('لا توجد ملاحظات بعد.', 'No comments yet.')}</p>
          ) : (
            <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
              {r.comments.map((c, i) => (
                <li key={i} className="rounded-lg bg-bg-soft px-3 py-2 text-[12.5px] leading-6 text-navy">
                  {c.comment}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
