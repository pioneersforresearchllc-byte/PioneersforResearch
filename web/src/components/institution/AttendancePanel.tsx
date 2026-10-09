import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listAttendance, listCourseSessions, setAttendance, type SessionLite } from '@/lib/institutionTracking'

/**
 * Per-session attendance marking for a course (teacher of the course or owner).
 * Click a session to open its roster; each trainee is Present / Absent / unmarked.
 */
export function AttendancePanel({ courseId, students }: { courseId: string; students: { id: string; name: string }[] }) {
  const { profile } = useAuth()
  const { lang } = useLanguage()
  const tx = (a: string, e: string) => (lang === 'ar' ? a : e)
  const queryClient = useQueryClient()
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data: sessions } = useQuery({ queryKey: ['course-sessions-lite', courseId], queryFn: () => listCourseSessions(courseId) })
  const sessionIds = (sessions ?? []).map((s) => s.id)
  const { data: marks } = useQuery({
    queryKey: ['attendance', courseId, sessionIds.join(',')],
    enabled: sessionIds.length > 0,
    queryFn: () => listAttendance(sessionIds),
  })

  const mark = async (s: SessionLite, studentId: string, present: boolean | null) => {
    if (!profile) return
    const key = `${s.id}:${studentId}`
    setBusy(key)
    setError('')
    try {
      await setAttendance(s.id, studentId, present, profile.id)
      await queryClient.invalidateQueries({ queryKey: ['attendance', courseId] })
      void queryClient.invalidateQueries({ queryKey: ['trainee-report', courseId] })
    } catch {
      setError(tx('تعذّر حفظ الحضور. تأكد من تطبيق تحديث قاعدة البيانات 0071.', 'Could not save attendance. Make sure database update 0071 is applied.'))
    } finally {
      setBusy(null)
    }
  }

  const markAll = async (s: SessionLite) => {
    if (!profile) return
    setBusy(`${s.id}:all`)
    setError('')
    try {
      for (const st of students) {
        if (marks?.get(`${s.id}:${st.id}`) === undefined) await setAttendance(s.id, st.id, true, profile.id)
      }
      await queryClient.invalidateQueries({ queryKey: ['attendance', courseId] })
      void queryClient.invalidateQueries({ queryKey: ['trainee-report', courseId] })
    } catch {
      setError(tx('تعذّر حفظ الحضور.', 'Could not save attendance.'))
    } finally {
      setBusy(null)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <div className="mb-2.5 text-[15px] font-semibold text-navy">{tx('الحضور', 'Attendance')}</div>
      {error && <div className="mb-2 rounded-lg bg-error-bg px-3 py-2 text-[12.5px] text-error">{error}</div>}
      {(sessions ?? []).length === 0 && (
        <div className="text-[13px] text-muted">{tx('لا توجد جلسات مجدولة لهذه الدورة. أضف الجلسات من إدارة الدورات أولًا.', 'No sessions scheduled for this course yet. Add sessions from course management first.')}</div>
      )}
      <div className="flex flex-col gap-2">
        {(sessions ?? []).map((s) => {
          const isOpen = open === s.id
          const present = students.filter((st) => marks?.get(`${s.id}:${st.id}`) === true).length
          const absent = students.filter((st) => marks?.get(`${s.id}:${st.id}`) === false).length
          const upcoming = s.session_date > today
          return (
            <div key={s.id} className={`rounded-lg border bg-white ${isOpen ? 'border-navy' : 'border-border'}`}>
              <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full items-center justify-between gap-3 p-3.5 text-start">
                <div>
                  <div className="text-[13.5px] font-semibold text-navy">{s.title}</div>
                  <div className="text-[12px] text-muted" dir="ltr">
                    <span className="block text-start">
                      {s.session_date} · {s.session_time?.slice(0, 5)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[12px]">
                  {upcoming ? (
                    <span className="rounded-full bg-navy/5 px-2.5 py-1 text-muted">{tx('قادمة', 'Upcoming')}</span>
                  ) : (
                    <>
                      <span className="rounded-full bg-success/10 px-2.5 py-1 text-success">
                        {tx('حاضر', 'Present')} {present}
                      </span>
                      <span className="rounded-full bg-error-bg px-2.5 py-1 text-error">
                        {tx('غائب', 'Absent')} {absent}
                      </span>
                    </>
                  )}
                  <span className="text-muted">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-border p-3.5">
                  {students.length === 0 ? (
                    <div className="text-[12.5px] text-muted">{tx('لا يوجد متدربون مسجّلون.', 'No enrolled trainees.')}</div>
                  ) : (
                    <>
                      <div className="mb-2.5 flex justify-end">
                        <button
                          onClick={() => void markAll(s)}
                          disabled={busy !== null}
                          className="rounded-md border border-border px-3 py-1.5 text-[12px] text-navy hover:border-navy disabled:opacity-50"
                        >
                          {tx('تحضير غير المسجّلين كحاضرين', 'Mark unmarked as present')}
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {students.map((st) => {
                          const v = marks?.get(`${s.id}:${st.id}`)
                          const key = `${s.id}:${st.id}`
                          const btn = (active: boolean, tone: string) =>
                            `rounded-md border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50 ${active ? tone : 'border-border bg-white text-muted hover:border-navy/40'}`
                          return (
                            <div key={st.id} className="flex items-center justify-between gap-2 rounded-md bg-bg-soft px-3 py-2">
                              <span className="text-[13px] text-navy">{st.name}</span>
                              <div className="flex gap-1.5">
                                <button
                                  disabled={busy === key}
                                  onClick={() => void mark(s, st.id, v === true ? null : true)}
                                  className={btn(v === true, 'border-success bg-success text-white')}
                                >
                                  {tx('حاضر', 'Present')}
                                </button>
                                <button
                                  disabled={busy === key}
                                  onClick={() => void mark(s, st.id, v === false ? null : false)}
                                  className={btn(v === false, 'border-error bg-error text-white')}
                                >
                                  {tx('غائب', 'Absent')}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
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
