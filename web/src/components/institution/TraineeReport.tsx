import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { getTraineeReport, type TraineeRow } from '@/lib/institutionTracking'
import { LoadingState } from '@/components/LoadingState'

type Tx = (a: string, e: string) => string

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function attendancePct(r: TraineeRow): number | null {
  return r.sessions_held > 0 ? Math.round((r.attended / r.sessions_held) * 100) : null
}

function summarize(rows: TraineeRow[]) {
  const n = rows.length
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)
  return {
    trainees: n,
    avgProgress: avg(rows.map((r) => r.progress)) ?? 0,
    avgAttendance: avg(rows.map(attendancePct).filter((x): x is number => x !== null)),
    avgGrade: avg(rows.map((r) => r.avg_grade).filter((x): x is number => x !== null)),
    certificates: rows.filter((r) => r.cert_number).length,
  }
}

function columns(tx: Tx) {
  return [
    tx('المتدرب', 'Trainee'),
    tx('التقدّم', 'Progress'),
    tx('الواجبات المسلّمة', 'Assignments submitted'),
    tx('متوسط الدرجات', 'Avg grade'),
    tx('الحضور', 'Attendance'),
    tx('الشهادة', 'Certificate'),
  ]
}

function rowCells(r: TraineeRow, tx: Tx, locale: string): string[] {
  const att = attendancePct(r)
  return [
    r.name,
    `${r.progress}%`,
    `${r.submitted} / ${r.assignments_total}`,
    r.avg_grade != null ? `${r.avg_grade}` : '—',
    r.sessions_held > 0 ? `${r.attended} / ${r.sessions_held} (${att}%)` : '—',
    r.cert_number ? `${r.cert_number} — ${new Date(r.cert_issued_at!).toLocaleDateString(locale)}` : tx('لم تصدر', 'Not issued'),
  ]
}

function downloadCsv(rows: TraineeRow[], tx: Tx, locale: string, fileName: string) {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [columns(tx).map(q).join(','), ...rows.map((r) => rowCells(r, tx, locale).map(q).join(','))]
  // BOM so Excel opens Arabic text correctly.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Opens a formal, printable report (the browser's "Save as PDF" makes the PDF). */
function printReport(rows: TraineeRow[], tx: Tx, ar: boolean, locale: string, courseTitle: string, institutionName: string) {
  const w = window.open('', '_blank')
  if (!w) return
  const s = summarize(rows)
  const kpi = (label: string, value: string) => `<div class="kpi"><div class="v">${esc(value)}</div><div class="l">${esc(label)}</div></div>`
  const head = columns(tx).map((c) => `<th>${esc(c)}</th>`).join('')
  const body = rows
    .map((r, i) => `<tr><td class="n">${i + 1}</td>${rowCells(r, tx, locale).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('')
  const legal = ar
    ? 'شركة بايونيرز هيلث ريسيرتش كونسالتينج (ذات مسؤولية محدودة) — الرقم الموحّد 7055175363 — ترخيص وزارة الاستثمار 24926274626 — جدة، المملكة العربية السعودية'
    : 'Pioneers Health Research Consulting (LLC) — Unified No. 7055175363 — MISA License 24926274626 — Jeddah, Saudi Arabia'
  w.document.write(`<!doctype html><html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">
<title>${esc(tx('تقرير متابعة المتدربين', 'Trainee progress report'))} — ${esc(courseTitle)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #0b1f3a; margin: 0; font-size: 12px; }
  .top { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #c9a24b; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand img { width: 46px; height: 46px; }
  .brand b { display: block; font-size: 15px; }
  .brand span { color: #5b6b80; font-size: 11px; }
  .meta { text-align: end; font-size: 11px; color: #5b6b80; line-height: 1.7; }
  h1 { font-size: 19px; margin: 0 0 4px; }
  .sub { color: #5b6b80; margin-bottom: 14px; }
  .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; }
  .kpi { border: 1px solid #dde3ea; border-radius: 8px; padding: 8px; text-align: center; }
  .kpi .v { font-size: 18px; font-weight: 700; }
  .kpi .l { color: #5b6b80; font-size: 10.5px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0b1f3a; color: #fff; font-weight: 600; padding: 7px 6px; font-size: 11px; text-align: start; }
  td { border-bottom: 1px solid #e6ebf1; padding: 6px; vertical-align: top; }
  tr:nth-child(even) td { background: #f6f8fb; }
  td.n { color: #8a97a8; width: 22px; }
  .foot { margin-top: 18px; padding-top: 8px; border-top: 1px solid #dde3ea; color: #8a97a8; font-size: 10px; line-height: 1.6; }
  .note { color: #5b6b80; font-size: 10.5px; margin-top: 8px; }
</style></head><body>
<div class="top">
  <div class="brand"><img src="${location.origin}/logo.png" alt=""><div><b>Pioneers Health Research</b><span>الرواد الاستشارية للبحوث الصحية</span></div></div>
  <div class="meta">${esc(tx('تاريخ التقرير', 'Report date'))}: ${esc(new Date().toLocaleDateString(locale))}<br>${esc(tx('الجهة', 'Organization'))}: ${esc(institutionName || '—')}</div>
</div>
<h1>${esc(tx('تقرير متابعة المتدربين', 'Trainee progress report'))}</h1>
<div class="sub">${esc(tx('البرنامج', 'Program'))}: ${esc(courseTitle)}</div>
<div class="kpis">
  ${kpi(tx('عدد المتدربين', 'Trainees'), String(s.trainees))}
  ${kpi(tx('متوسط التقدّم', 'Avg progress'), `${s.avgProgress}%`)}
  ${kpi(tx('متوسط الحضور', 'Avg attendance'), s.avgAttendance != null ? `${s.avgAttendance}%` : '—')}
  ${kpi(tx('متوسط الدرجات', 'Avg grade'), s.avgGrade != null ? String(s.avgGrade) : '—')}
  ${kpi(tx('الشهادات الصادرة', 'Certificates issued'), `${s.certificates} / ${s.trainees}`)}
</div>
<table><thead><tr><th>#</th>${head}</tr></thead><tbody>${body}</tbody></table>
<div class="note">${esc(tx('التقدّم محسوب من الواجبات المصحّحة، والحضور من الجلسات التي حان موعدها. يمكن التحقق من الشهادات عبر pioneersresearch.com/verify', 'Progress is based on graded assignments; attendance on sessions held to date. Certificates can be verified at pioneersresearch.com/verify'))}</div>
<div class="foot">${esc(legal)}</div>
<script>window.onload = function () { setTimeout(function () { window.print() }, 300) }</script>
</body></html>`)
  w.document.close()
}

export function TraineeReport({ courseId, courseTitle, institutionName }: { courseId: string; courseTitle: string; institutionName: string }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const tx: Tx = (a, e) => (ar ? a : e)
  const locale = ar ? 'ar-SA' : 'en-US'
  const { data: rows, isLoading, error } = useQuery({
    queryKey: ['trainee-report', courseId],
    queryFn: () => getTraineeReport(courseId),
  })

  if (isLoading) return <LoadingState />
  if (error) return <div className="rounded-lg bg-error-bg px-4 py-3 text-[13px] text-error">{tx('تعذّر تحميل التقرير.', 'Could not load the report.')}</div>
  const list = rows ?? []
  const s = summarize(list)
  const fileName = `${tx('تقرير', 'report')}-${courseTitle}`.replace(/[\\/:*?"<>|]/g, '').slice(0, 80)

  const kpis = [
    { label: tx('المتدربون', 'Trainees'), value: String(s.trainees) },
    { label: tx('متوسط التقدّم', 'Avg progress'), value: `${s.avgProgress}%` },
    { label: tx('متوسط الحضور', 'Avg attendance'), value: s.avgAttendance != null ? `${s.avgAttendance}%` : '—' },
    { label: tx('متوسط الدرجات', 'Avg grade'), value: s.avgGrade != null ? String(s.avgGrade) : '—' },
    { label: tx('الشهادات', 'Certificates'), value: `${s.certificates} / ${s.trainees}` },
  ]

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-white p-3.5 text-center">
            <div className="font-heading text-[22px] font-bold text-navy">{k.value}</div>
            <div className="mt-0.5 text-[12px] text-muted">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => printReport(list, tx, ar, locale, courseTitle, institutionName)}
          disabled={list.length === 0}
          className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          🖨️ {tx('طباعة / حفظ PDF', 'Print / save PDF')}
        </button>
        <button
          onClick={() => downloadCsv(list, tx, locale, fileName)}
          disabled={list.length === 0}
          className="rounded-md border border-navy px-4 py-2 text-[12.5px] font-semibold text-navy hover:bg-bg-soft disabled:opacity-50"
        >
          ⬇️ {tx('تصدير Excel', 'Export Excel')}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[13.5px] text-muted">
          {tx('لا يوجد متدربون مسجّلون في هذا البرنامج بعد.', 'No trainees are enrolled in this program yet.')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="bg-navy text-start text-white">
                {columns(tx).map((c) => (
                  <th key={c} className="px-3 py-2.5 text-start text-[12px] font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const att = attendancePct(r)
                return (
                  <tr key={r.student_id} className="border-t border-border even:bg-bg-soft/60">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-navy">{r.name}</div>
                      <div className="text-[11.5px] text-muted">@{r.username}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-navy/10">
                          <div className="h-full rounded-full bg-gold" style={{ width: `${r.progress}%` }} />
                        </div>
                        <span className="text-[12px] font-semibold text-navy">{r.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-navy" dir="ltr">
                      <span className="block text-start">
                        {r.submitted} / {r.assignments_total}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-navy">{r.avg_grade ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {r.sessions_held > 0 ? (
                        <span className={att! >= 75 ? 'text-success' : att! >= 50 ? 'text-gold' : 'text-error'}>
                          {r.attended} / {r.sessions_held} ({att}%)
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.cert_number ? (
                        <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11.5px] font-semibold text-success">✓ {r.cert_number}</span>
                      ) : (
                        <span className="text-[12px] text-muted">{tx('لم تصدر', 'Not issued')}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2.5 text-[11.5px] leading-6 text-muted">
        {tx('التقدّم محسوب من الواجبات المصحّحة، والحضور من الجلسات التي حان موعدها.', 'Progress is based on graded assignments; attendance on sessions held to date.')}
      </p>
    </div>
  )
}
