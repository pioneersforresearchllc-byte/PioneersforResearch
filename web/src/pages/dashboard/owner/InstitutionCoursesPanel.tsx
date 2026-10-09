import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { getTraineeReport, linkCourse, listInstitutionCourses, unlinkCourse } from '@/lib/institutionTracking'
import { TraineeReport } from '@/components/institution/TraineeReport'
import { AttendancePanel } from '@/components/institution/AttendancePanel'

/**
 * Owner → Institutions → one institution: link the institution's programs
 * (its trainees are whoever is enrolled in them), and open each program's
 * trainee report + attendance marking.
 */
export function InstitutionCoursesPanel({ institutionId, institutionName }: { institutionId: string; institutionName: string }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const tx = (a: string, e: string) => (ar ? a : e)
  const queryClient = useQueryClient()
  const [pick, setPick] = useState('')
  const [openCourse, setOpenCourse] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const { data: linked } = useQuery({
    queryKey: ['institution-courses', institutionId],
    queryFn: () => listInstitutionCourses(institutionId),
  })
  const { data: allCourses } = useQuery({
    queryKey: ['owner-course-options'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id, title, code_only').order('created_at', { ascending: false })
      return (data ?? []) as { id: string; title: string; code_only: boolean | null }[]
    },
  })
  const { data: reportRows } = useQuery({
    queryKey: ['trainee-report', openCourse],
    enabled: !!openCourse,
    queryFn: () => getTraineeReport(openCourse!),
  })

  const linkedIds = new Set((linked ?? []).map((c) => c.course_id))
  const options = (allCourses ?? []).filter((c) => !linkedIds.has(c.id))
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['institution-courses', institutionId] })

  const add = async () => {
    if (!pick) return
    setBusy(true)
    setError('')
    try {
      await linkCourse(institutionId, pick)
      setPick('')
      refresh()
    } catch {
      setError(tx('تعذّر الربط. تأكد من تطبيق تحديث قاعدة البيانات 0071.', 'Could not link. Make sure database update 0071 is applied.'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (courseId: string, title: string) => {
    if (!confirm(tx(`فك ربط «${title}» من هذه الجهة؟ لن تُحذف أي بيانات للمتدربين.`, `Unlink “${title}” from this organization? No trainee data is deleted.`))) return
    try {
      await unlinkCourse(institutionId, courseId)
      if (openCourse === courseId) setOpenCourse(null)
      refresh()
    } catch {
      setError(tx('تعذّر فك الربط.', 'Could not unlink.'))
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-border-2 bg-bg-soft p-3.5">
      <div className="mb-2 text-[13px] font-bold text-navy">{tx('برامج الجهة ومتابعة المتدربين', 'Organization programs & trainee tracking')}</div>
      <div className="mb-3 text-[12px] leading-6 text-muted">
        {tx('اربط الدورة الخاصة بالجهة، وكل من يسجّل فيها يظهر للجهة كمتدرب في تبويب «المتدربون».', 'Link the organization’s course — everyone enrolled in it shows to the organization as a trainee under “Trainees”.')}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <select value={pick} onChange={(e) => setPick(e.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-white px-3 py-2 text-[13px]">
          <option value="">{tx('— اختر دورة لربطها —', '— choose a course to link —')}</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
              {c.code_only ? ` (${tx('بالكود', 'code-only')})` : ''}
            </option>
          ))}
        </select>
        <button onClick={() => void add()} disabled={!pick || busy} className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50">
          {tx('ربط', 'Link')}
        </button>
      </div>
      {error && <div className="mb-2 rounded-md bg-error-bg px-3 py-2 text-[12.5px] text-error">{error}</div>}

      <div className="flex flex-col gap-2">
        {(linked ?? []).length === 0 && <div className="text-[12.5px] text-muted">{tx('لا توجد برامج مرتبطة.', 'No linked programs.')}</div>}
        {(linked ?? []).map((c) => {
          const isOpen = openCourse === c.course_id
          return (
            <div key={c.course_id} className={`rounded-md border bg-white ${isOpen ? 'border-navy' : 'border-border'}`}>
              <div className="flex flex-wrap items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-navy">{c.title}</div>
                  <div className="text-[12px] text-muted">
                    {tx('متدربون', 'Trainees')}: {c.trainees} · {tx('متوسط التقدّم', 'Avg progress')}: {c.avg_progress}% · {tx('شهادات', 'Certificates')}: {c.certificates}
                  </div>
                </div>
                <button onClick={() => setOpenCourse(isOpen ? null : c.course_id)} className="rounded-md border border-navy px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-bg-soft">
                  {isOpen ? tx('إغلاق', 'Close') : tx('التقرير والحضور', 'Report & attendance')}
                </button>
                <button onClick={() => void remove(c.course_id, c.title)} className="rounded-md border border-error px-3 py-1.5 text-[12px] text-error hover:bg-error-bg">
                  {tx('فك الربط', 'Unlink')}
                </button>
              </div>
              {isOpen && (
                <div className="flex flex-col gap-6 border-t border-border p-3.5">
                  <TraineeReport courseId={c.course_id} courseTitle={c.title} institutionName={institutionName} />
                  <AttendancePanel courseId={c.course_id} students={(reportRows ?? []).map((r) => ({ id: r.student_id, name: r.name }))} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
