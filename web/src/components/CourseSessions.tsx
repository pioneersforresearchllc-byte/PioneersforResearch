// A comfortable, shared view of a course's live lectures (sessions): a
// prominent "next lecture" card with a relative time and a join button, then
// the full schedule with per-lecture status (ended / live / today / upcoming).
// Used by both the student and the trainer course pages.
import { useLanguage } from '@/lib/i18n'
import type { CourseSession } from '@/lib/courses'

const HOUR = 3_600_000
type Status = 'past' | 'live' | 'today' | 'upcoming'

function parseStart(s: CourseSession): Date | null {
  if (!s.session_date) return null
  const d = new Date(`${s.session_date}T${(s.session_time || '00:00:00').slice(0, 8)}`)
  return isNaN(d.getTime()) ? null : d
}

function statusOf(start: Date, now: Date): Status {
  const open = start.getTime() - 15 * 60_000
  const end = start.getTime() + 3 * HOUR
  if (now.getTime() > end) return 'past'
  if (now.getTime() >= open) return 'live'
  if (start.toDateString() === now.toDateString()) return 'today'
  return 'upcoming'
}

function fmtTime(d: Date, ar: boolean): string {
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const suffix = ar ? (h < 12 ? 'ص' : 'م') : h < 12 ? 'AM' : 'PM'
  h = h % 12 || 12
  return `${h}:${m} ${suffix}`
}

function relLabel(start: Date, now: Date, status: Status, ar: boolean): string {
  const time = fmtTime(start, ar)
  if (status === 'live') return ar ? 'جارية الآن' : 'Live now'
  if (status === 'past') return ar ? 'انتهت' : 'Ended'
  const diff = start.getTime() - now.getTime()
  if (diff < HOUR) {
    const mins = Math.max(1, Math.round(diff / 60_000))
    return ar ? `تبدأ خلال ${mins} دقيقة` : `Starts in ${mins} min`
  }
  if (status === 'today') return ar ? `اليوم • ${time}` : `Today • ${time}`
  const days = Math.ceil(diff / (24 * HOUR))
  if (days === 1) return ar ? `غدًا • ${time}` : `Tomorrow • ${time}`
  if (days <= 7) return ar ? `بعد ${days} أيام • ${time}` : `In ${days} days • ${time}`
  return `${start.toLocaleDateString(ar ? 'ar' : 'en-GB')} • ${time}`
}

const BADGE: Record<Status, string> = {
  live: 'bg-green-50 text-green-700',
  today: 'bg-gold/15 text-accent',
  upcoming: 'bg-bg-soft text-muted-2',
  past: 'bg-bg-soft text-faint',
}

export function CourseSessions({ sessions, hostMode = false }: { sessions: CourseSession[]; hostMode?: boolean }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const now = new Date()

  const rows = sessions
    .map((s, i) => ({ s, start: parseStart(s), order: i }))
    .filter((r): r is { s: CourseSession; start: Date; order: number } => r.start !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((r, idx) => ({ ...r, num: idx + 1, status: statusOf(r.start, now) }))

  const next = rows.find((r) => r.status === 'live') ?? rows.find((r) => r.status !== 'past')
  const badgeText = (st: Status) =>
    st === 'live' ? (ar ? 'جارية الآن' : 'Live') : st === 'today' ? (ar ? 'اليوم' : 'Today') : st === 'past' ? (ar ? 'منتهية' : 'Ended') : ar ? 'قادمة' : 'Upcoming'

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5 md:p-6">
        <div className="mb-1 text-[15px] font-semibold text-navy">{ar ? 'المحاضرات' : 'Lectures'}</div>
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted">
          {ar ? 'لم تُجدوَل محاضرات بعد.' : 'No lectures scheduled yet.'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Next lecture highlight */}
      {next && (
        <div className="overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.08] to-transparent p-5 md:p-6">
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-accent">
            {next.status === 'live' ? (ar ? 'محاضرة جارية' : 'Lecture live') : ar ? 'محاضرتك القادمة' : 'Your next lecture'}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[16px] font-bold text-navy">
                {ar ? `المحاضرة ${next.num}` : `Lecture ${next.num}`} — {next.s.title}
              </div>
              <div
                className={`mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold ${
                  next.status === 'live' ? 'text-green-700' : 'text-accent'
                }`}
              >
                {next.status === 'live' && <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />}
                {relLabel(next.start, now, next.status, ar)}
              </div>
            </div>
            {next.s.link ? (
              <a
                href={next.s.link}
                target="_blank"
                rel="noreferrer"
                className={`shrink-0 rounded-full px-6 py-3 text-[14px] font-bold text-white no-underline shadow-sm transition-colors ${
                  next.status === 'live' ? 'bg-success hover:brightness-110' : 'bg-navy hover:bg-navy-hover'
                }`}
              >
                {hostMode ? (ar ? 'بدء المحاضرة' : 'Start lecture') : ar ? 'دخول المحاضرة' : 'Join lecture'}
              </a>
            ) : (
              <span className="shrink-0 rounded-full bg-bg-soft px-5 py-3 text-[13px] font-semibold text-muted">
                {ar ? 'الرابط قريبًا' : 'Link soon'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Full schedule */}
      <div className="rounded-2xl border border-border bg-white p-5 md:p-6">
        <div className="mb-3 text-[15px] font-semibold text-navy">{ar ? 'جدول المحاضرات' : 'Lecture schedule'}</div>
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <div
              key={r.s.id}
              className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${
                r.status === 'live' ? 'border-success/40 bg-green-50/40' : 'border-border bg-bg-soft/40'
              } ${r.status === 'past' ? 'opacity-60' : ''}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/5 text-[13px] font-bold text-navy">
                  {r.num}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-navy">{r.s.title}</div>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    {r.start.toLocaleDateString(ar ? 'ar' : 'en-GB')} · {fmtTime(r.start, ar)}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${BADGE[r.status]}`}>
                  {badgeText(r.status)}
                </span>
                {r.s.link && r.status !== 'past' && (
                  <a
                    href={r.s.link}
                    target="_blank"
                    rel="noreferrer"
                    className={`rounded-md px-3.5 py-1.5 text-[12.5px] font-semibold no-underline transition-colors ${
                      r.status === 'live'
                        ? 'bg-success text-white hover:brightness-110'
                        : 'border border-navy text-navy hover:bg-bg-soft'
                    }`}
                  >
                    {hostMode ? (ar ? 'بدء' : 'Start') : ar ? 'دخول' : 'Join'}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
