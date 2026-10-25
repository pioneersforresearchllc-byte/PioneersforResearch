// Lecture management for a course's trainers (and the owner): the shared
// CourseSessions view plus "add lecture", and edit / delete on every row.
// Writes are allowed by RLS for the course's teachers (migration 0087).
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { CourseSessions } from '@/components/CourseSessions'
import { addSession, deleteSession, updateSession, type CourseSession } from '@/lib/courses'

function errorText(e: unknown, ar: boolean): string {
  const err = e as { code?: string; message?: string }
  // 42501 = RLS refused the write: migration 0087 not applied yet.
  if (err?.code === '42501' || /row-level security/i.test(err?.message ?? '')) {
    return ar
      ? 'لا تملك صلاحية تعديل المحاضرات بعد. يجب تشغيل ملف الترحيل 0087_teacher_course_sessions.sql في Supabase.'
      : 'Not allowed yet — run migration 0087_teacher_course_sessions.sql in Supabase.'
  }
  return err?.message || (ar ? 'تعذّر الحفظ' : 'Save failed')
}

export function SessionsManager({ courseId, sessions }: { courseId: string; sessions: CourseSession[] }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const qc = useQueryClient()
  const [editing, setEditing] = useState<CourseSession | 'new' | null>(null)
  const [error, setError] = useState('')

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['taught-course-detail', courseId] })
    void qc.invalidateQueries({ queryKey: ['course-sessions-lite', courseId] })
    void qc.invalidateQueries({ queryKey: ['owner-courses'] })
  }

  const remove = async (s: CourseSession) => {
    const msg = ar
      ? `حذف المحاضرة «${s.title}»؟ سيُحذف معها سجل الحضور الخاص بها.`
      : `Delete lecture “${s.title}”? Its attendance records are deleted too.`
    if (!confirm(msg)) return
    setError('')
    try {
      await deleteSession(s.id)
      refresh()
    } catch (e) {
      setError(errorText(e, ar))
    }
  }

  return (
    <div>
      {error && <div className="mb-3 rounded-xl border border-error/30 bg-error-bg p-3 text-[13px] text-error">{error}</div>}
      <CourseSessions
        sessions={sessions}
        hostMode
        headerAction={
          <button
            onClick={() => setEditing('new')}
            className="shrink-0 rounded-md bg-navy px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-navy-hover"
          >
            {ar ? '+ إضافة محاضرة' : '+ Add lecture'}
          </button>
        }
        rowActions={(s) => (
          <span className="flex items-center gap-0.5">
            <button
              onClick={() => setEditing(s)}
              title={ar ? 'تعديل' : 'Edit'}
              aria-label={ar ? 'تعديل' : 'Edit'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-navy hover:bg-bg-soft"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
            <button
              onClick={() => void remove(s)}
              title={ar ? 'حذف' : 'Delete'}
              aria-label={ar ? 'حذف' : 'Delete'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-error hover:bg-error-bg"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
              </svg>
            </button>
          </span>
        )}
      />
      {editing && (
        <SessionForm
          courseId={courseId}
          session={editing === 'new' ? null : editing}
          nextNumber={sessions.length + 1}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

const input = 'w-full rounded-md border border-border px-3.5 py-2.5 text-[14px]'

function SessionForm({
  courseId,
  session,
  nextNumber,
  onClose,
  onSaved,
}: {
  courseId: string
  session: CourseSession | null
  nextNumber: number
  onClose: () => void
  onSaved: () => void
}) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const [title, setTitle] = useState(session?.title ?? '')
  const [date, setDate] = useState(session?.session_date ?? '')
  const [time, setTime] = useState((session?.session_time ?? '').slice(0, 5))
  const [link, setLink] = useState(session?.link ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!title.trim() || !date || !time) return setError(ar ? 'العنوان والتاريخ والوقت مطلوبة' : 'Title, date and time are required')
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) return setError(ar ? 'الرابط يجب أن يبدأ بـ https://' : 'The link must start with https://')
    setBusy(true)
    setError('')
    try {
      const values = { title: title.trim(), session_date: date, session_time: time, link: link.trim() || null }
      if (session) await updateSession(session.id, values)
      else await addSession(courseId, values)
      onSaved()
      onClose()
    } catch (e) {
      setError(errorText(e, ar))
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={onClose}>
      <div className="my-auto w-full max-w-[460px] rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 font-heading text-lg font-bold text-navy">
          {session ? (ar ? 'تعديل المحاضرة' : 'Edit lecture') : ar ? 'إضافة محاضرة' : 'Add lecture'}
        </div>
        <div className="flex flex-col gap-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={ar ? `عنوان المحاضرة — مثال: المحاضرة ${nextNumber}: مراجعة الأدبيات` : `Lecture title — e.g. Lecture ${nextNumber}: Literature review`}
            className={input}
          />
          <div className="flex gap-2.5">
            <label className="flex-1">
              <span className="mb-1 block text-[12.5px] font-semibold text-navy">{ar ? 'التاريخ' : 'Date'}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[12.5px] font-semibold text-navy">{ar ? 'الوقت' : 'Time'}</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} />
            </label>
          </div>
          <label>
            <span className="mb-1 block text-[12.5px] font-semibold text-navy">{ar ? 'رابط الاجتماع (اختياري)' : 'Meeting link (optional)'}</span>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              dir="ltr"
              placeholder="https://zoom.us/j/… · https://meet.google.com/…"
              className={input}
            />
            <span className="mt-1 block text-[11.5px] text-muted">
              {ar ? 'يمكنك إضافته لاحقًا؛ سيظهر للطلاب "الرابط قريبًا" حتى تضيفه.' : 'You can add it later; students see “Link soon” until then.'}
            </span>
          </label>
          {error && <div className="text-[13px] text-error">{error}</div>}
          <div className="mt-1 flex gap-2.5">
            <button
              onClick={() => void save()}
              disabled={busy}
              className="flex-1 rounded-md bg-navy py-2.75 text-[14px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
            >
              {busy ? '…' : session ? (ar ? 'حفظ التعديلات' : 'Save changes') : ar ? 'إضافة المحاضرة' : 'Add lecture'}
            </button>
            <button onClick={onClose} className="rounded-md border border-border px-5 py-2.75 text-[14px] text-navy">
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
