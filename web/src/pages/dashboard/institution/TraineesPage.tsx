import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { getMyInstitution } from '@/lib/institutions'
import { listInstitutionCourses } from '@/lib/institutionTracking'
import { LoadingState } from '@/components/LoadingState'
import { TraineeReport } from '@/components/institution/TraineeReport'

/** Institution dashboard → Trainees: the programs linked to this institution and each trainee's progress. */
export function InstitutionTraineesPage() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const tx = (a: string, e: string) => (ar ? a : e)
  const { data: inst } = useQuery({ queryKey: ['my-institution'], queryFn: getMyInstitution })
  const { data: courses, isLoading } = useQuery({ queryKey: ['institution-courses'], queryFn: () => listInstitutionCourses() })
  const [selected, setSelected] = useState<string | null>(null)

  const list = courses ?? []
  const current = list.find((c) => c.course_id === selected) ?? (list.length === 1 ? list[0] : null)
  const title = (c: { title: string; title_en: string | null }) => (ar ? c.title : c.title_en || c.title)

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{tx('متابعة المتدربين', 'Trainee tracking')}</div>
      <div className="mb-6 text-[13.5px] leading-7 text-muted">
        {tx('تقدّم منسوبيكم في البرامج المتعاقد عليها: الواجبات والدرجات والحضور والشهادات، مع تقرير قابل للطباعة والتصدير.', 'Your staff’s progress in contracted programs — assignments, grades, attendance and certificates — with a printable, exportable report.')}
      </div>

      {isLoading && <LoadingState />}

      {!isLoading && list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-white px-5 py-10 text-center">
          <div className="mb-2 text-[28px]">📊</div>
          <div className="mb-1 text-[15px] font-semibold text-navy">{tx('لا توجد برامج مرتبطة بجهتكم بعد', 'No programs linked to your organization yet')}</div>
          <div className="mx-auto max-w-md text-[13px] leading-6 text-muted">
            {tx('بعد التعاقد، نربط برنامجكم بحساب الجهة وتظهر هنا بيانات متدربيكم تلقائيًا.', 'Once contracted, we link your program to this account and your trainees’ data appears here automatically.')}
          </div>
        </div>
      )}

      {list.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const active = current?.course_id === c.course_id
            return (
              <button
                key={c.course_id}
                type="button"
                onClick={() => setSelected(c.course_id)}
                className={`rounded-xl border p-4 text-start transition-all ${active ? 'border-navy bg-navy text-white shadow-[0_10px_24px_-14px_rgba(11,31,58,0.8)]' : 'border-border bg-white text-navy hover:border-navy/50'}`}
              >
                <div className="mb-3 text-[14.5px] font-bold leading-6">{title(c)}</div>
                <div className={`grid grid-cols-3 gap-2 text-center text-[11.5px] ${active ? 'text-white/70' : 'text-muted'}`}>
                  <div>
                    <div className={`font-heading text-[18px] font-bold ${active ? 'text-gold' : 'text-navy'}`}>{c.trainees}</div>
                    {tx('متدرب', 'trainees')}
                  </div>
                  <div>
                    <div className={`font-heading text-[18px] font-bold ${active ? 'text-gold' : 'text-navy'}`}>{c.avg_progress}%</div>
                    {tx('متوسط التقدّم', 'avg progress')}
                  </div>
                  <div>
                    <div className={`font-heading text-[18px] font-bold ${active ? 'text-gold' : 'text-navy'}`}>
                      {c.sessions_held}/{c.sessions_total}
                    </div>
                    {tx('جلسات منفّذة', 'sessions held')}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {current ? (
        <div>
          <div className="mb-3 text-[16px] font-bold text-navy">{title(current)}</div>
          <TraineeReport courseId={current.course_id} courseTitle={title(current)} institutionName={inst?.name ?? ''} />
        </div>
      ) : (
        list.length > 1 && <div className="text-[13px] text-muted">{tx('اختر برنامجًا لعرض تقرير متدربيه.', 'Choose a program to see its trainee report.')}</div>
      )}
    </div>
  )
}
