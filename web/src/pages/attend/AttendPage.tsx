// Direct attendance link (/attend/:sessionId) for a CPD live session. The
// trainer shares the link (or its QR code) during the session; an enrolled
// learner opens it, signs in if needed, and records their own attendance.
// The check-in window and enrolment are enforced server-side (migration 0092).
import { useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { AuthCard } from '@/components/AuthCard'
import { Spinner } from '@/components/LoadingState'
import { getCheckinInfo, selfCheckin, type CheckinStatus } from '@/lib/cpdActivity'

export function AttendPage() {
  const { sessionId = '' } = useParams()
  const location = useLocation()
  const { session, loading } = useAuth()
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const tx = (a: string, e: string) => (ar ? a : e)
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CheckinStatus | null>(null)
  const [error, setError] = useState('')
  useDocumentMeta(tx('تسجيل الحضور', 'Attendance check-in'), undefined, { noindex: true })

  const { data: info, isLoading, error: infoError } = useQuery({
    queryKey: ['checkin-info', sessionId],
    queryFn: () => getCheckinInfo(sessionId),
    enabled: !!session && !!sessionId,
  })

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!session) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  const checkIn = async () => {
    setBusy(true)
    setError('')
    try {
      setResult(await selfCheckin(sessionId))
      void qc.invalidateQueries({ queryKey: ['checkin-info', sessionId] })
      void qc.invalidateQueries({ queryKey: ['cpd-my-attendance'] })
    } catch (e) {
      setError((e as Error).message || tx('تعذّر تسجيل الحضور', 'Check-in failed'))
    } finally {
      setBusy(false)
    }
  }

  const resultText: Record<CheckinStatus, [string, string, boolean]> = {
    checked_in: ['تم تسجيل حضورك بنجاح ✔', 'Your attendance has been recorded ✔', true],
    already: ['حضورك مسجّل مسبقًا لهذه الجلسة.', 'Your attendance is already recorded for this session.', true],
    not_enrolled: ['أنت غير مسجّل في هذا النشاط، فلا يمكن تسجيل حضورك.', 'You are not enrolled in this activity, so attendance cannot be recorded.', false],
    too_early: ['لم يُفتح تسجيل الحضور بعد. يُفتح قبل بدء الجلسة بـ 30 دقيقة.', 'Check-in is not open yet. It opens 30 minutes before the session starts.', false],
    closed: ['انتهت فترة تسجيل الحضور لهذه الجلسة.', 'The check-in window for this session has closed.', false],
    not_found: ['الجلسة غير موجودة.', 'Session not found.', false],
  }

  let body: ReactNode
  if (isLoading) {
    body = (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  } else if (infoError || !info) {
    body = (
      <p className="rounded-xl border border-error/30 bg-error-bg p-4 text-[13.5px] text-error">
        {tx('تعذّر تحميل بيانات الجلسة. تأكد من الرابط وحاول مرة أخرى.', 'Could not load the session. Check the link and try again.')}
      </p>
    )
  } else if (info.status === 'not_found') {
    body = <p className="text-[14px] text-muted">{tx('الجلسة غير موجودة أو حُذفت.', 'This session does not exist or was removed.')}</p>
  } else {
    const done = result ? resultText[result] : null
    const alreadyPresent = info.present === true
    body = (
      <div>
        <div className="mb-5 rounded-2xl border border-border bg-bg-soft p-4">
          <div className="text-[12px] font-semibold text-accent">{info.course_title}</div>
          <div className="mt-1 text-[16px] font-bold text-navy">{info.title}</div>
          <div className="mt-1 text-[12.5px] text-muted" dir="ltr">
            <span className="block text-start">
              {info.session_date}
              {info.session_time ? ` · ${info.session_time.slice(0, 5)}` : ''} ({tx('بتوقيت الرياض', 'Riyadh time')})
            </span>
          </div>
        </div>

        {done ? (
          <p
            className={`rounded-xl p-4 text-[14px] font-semibold ${done[2] ? 'border border-success/30 bg-success/10 text-success' : 'border border-error/30 bg-error-bg text-error'}`}
          >
            {ar ? done[0] : done[1]}
          </p>
        ) : alreadyPresent ? (
          <p className="rounded-xl border border-success/30 bg-success/10 p-4 text-[14px] font-semibold text-success">
            {tx('حضورك مسجّل لهذه الجلسة ✔', 'You are marked present for this session ✔')}
          </p>
        ) : !info.enrolled ? (
          <p className="rounded-xl border border-error/30 bg-error-bg p-4 text-[13.5px] text-error">
            {tx('أنت غير مسجّل في هذا النشاط. سجّل فيه أولًا ثم افتح الرابط مجددًا.', 'You are not enrolled in this activity. Enrol first, then open the link again.')}
          </p>
        ) : info.window === 'early' ? (
          <p className="rounded-xl border border-border bg-white p-4 text-[13.5px] text-muted">
            {tx('يُفتح تسجيل الحضور قبل بدء الجلسة بـ 30 دقيقة ويبقى مفتوحًا 4 ساعات من بدايتها.', 'Check-in opens 30 minutes before the session starts and stays open for 4 hours after it starts.')}
          </p>
        ) : info.window === 'closed' ? (
          <p className="rounded-xl border border-border bg-white p-4 text-[13.5px] text-muted">
            {tx('انتهت فترة تسجيل الحضور لهذه الجلسة. تواصل مع منسق النشاط إذا كنت حاضرًا.', 'The check-in window has closed. Contact the activity coordinator if you attended.')}
          </p>
        ) : (
          <button
            onClick={() => void checkIn()}
            disabled={busy}
            className="w-full rounded-full bg-gold px-6 py-3.5 text-[16px] font-bold text-navy disabled:opacity-60"
          >
            {busy ? tx('جارٍ التسجيل…', 'Recording…') : tx('سجّل حضوري الآن', 'Record my attendance')}
          </button>
        )}
        {error && <p className="mt-3 text-[13px] text-error">{error}</p>}

        {info.course_id && info.enrolled && (
          <Link
            to={`/student/courses/${info.course_id}?tab=attendance`}
            className="mt-5 block text-center text-[13.5px] font-semibold text-navy underline decoration-gold/60 underline-offset-4"
          >
            {tx('عرض سجل حضوري في النشاط', 'View my attendance record')}
          </Link>
        )}
      </div>
    )
  }

  return (
    <AuthCard>
      <h1 className="font-heading mb-1 text-[22px] font-bold text-navy">{tx('تسجيل الحضور', 'Attendance check-in')}</h1>
      <p className="mb-5 text-[13px] leading-6 text-muted">
        {tx('يُحتسب حضورك إلكترونيًا ضمن متطلبات ساعات التعليم المستمر.', 'Your attendance is recorded electronically towards CPD hour requirements.')}
      </p>
      {body}
    </AuthCard>
  )
}
