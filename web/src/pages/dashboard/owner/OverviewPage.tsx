import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { getOverviewStats } from '@/lib/owner'
import { getOwnerAttention } from '@/lib/attention'
import { listServiceRequests, type RequestStatus } from '@/lib/services'
import { listContactMessages } from '@/lib/owner'
import { LoadingState } from '@/components/LoadingState'
import { Price } from '@/components/Riyal'

type TFn = ReturnType<typeof useLanguage>['t']

/** Small week-over-week delta badge (styled for a dark card). */
function Delta({ cur, prev, t }: { cur: number; prev: number; t: TFn }) {
  const base = 'inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold'
  if (prev === 0 && cur === 0) {
    return <span className={`${base} text-white/70`}>— {t('oOverview.vsLastWeek')}</span>
  }
  if (prev === 0) {
    return <span className={`${base} text-white`}>▲ {t('oOverview.new')}</span>
  }
  const pct = Math.round(((cur - prev) / prev) * 100)
  const up = pct >= 0
  return (
    <span className={`${base} ${up ? 'text-[#7ff0c0]' : 'text-[#ffb4ac]'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}% <span className="font-normal text-white/70">{t('oOverview.vsLastWeek')}</span>
    </span>
  )
}

const ATTENTION_LABELS: Record<string, { ar: string; en: string; icon: string }> = {
  toPrice: { ar: 'طلبات خدمات جديدة تنتظر التسعير', en: 'New service requests to price', icon: '🗂️' },
  unassigned: { ar: 'طلبات مدفوعة بلا مدرّب مكلّف', en: 'Paid requests without an assignee', icon: '👤' },
  receipts: { ar: 'إيصالات دفع تنتظر التأكيد', en: 'Payment receipts to confirm', icon: '🧾' },
  applications: { ar: 'طلبات انضمام مدرّبين', en: 'Teacher applications', icon: '🧑‍🏫' },
  institutions: { ar: 'مؤسسات تنتظر التفعيل', en: 'Institutions awaiting approval', icon: '🏛️' },
  consultations: { ar: 'استشارات مؤسسات جديدة', en: 'New institution consultations', icon: '📋' },
  contact: { ar: 'رسائل تواصل غير مقروءة', en: 'Unread contact messages', icon: '✉️' },
  reviews: { ar: 'آراء عملاء تنتظر الموافقة', en: 'Reviews awaiting approval', icon: '⭐' },
}

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: 'bg-gold/15 text-accent',
  awaiting_payment: 'bg-gold/15 text-gold',
  paid: 'bg-success/10 text-success',
  in_progress: 'bg-accent/10 text-accent',
  done: 'bg-success/10 text-success',
  cancelled: 'bg-bg-soft text-muted',
}

export function OwnerOverviewPage() {
  const { t, lang } = useLanguage()
  const ar = lang === 'ar'
  const { data, isLoading } = useQuery({ queryKey: ['owner-overview-stats'], queryFn: getOverviewStats })
  const { data: attention } = useQuery({ queryKey: ['owner-attention'], queryFn: getOwnerAttention, refetchInterval: 60_000 })
  const { data: requests } = useQuery({ queryKey: ['owner-latest-requests'], queryFn: listServiceRequests })
  const { data: messages } = useQuery({ queryKey: ['contact-messages'], queryFn: listContactMessages })

  const fmtSar = (cents: number) => <Price cents={cents} />
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(ar ? 'ar' : 'en-US', { day: 'numeric', month: 'short' })

  const weekly = data
    ? [
        { icon: '🎓', accent: 'from-navy to-navy-hover', label: t('oOverview.newStudents'), cur: data.students_this_week, prev: data.students_last_week, display: String(data.students_this_week) },
        { icon: '📚', accent: 'from-[#1c4577] to-[#0d2748]', label: t('oOverview.newEnrollments'), cur: data.enrollments_this_week, prev: data.enrollments_last_week, display: String(data.enrollments_this_week) },
        { icon: '🗂️', accent: 'from-[#8a6d2f] to-[#6b5426]', label: t('oOverview.newRequests'), cur: data.requests_this_week, prev: data.requests_last_week, display: String(data.requests_this_week) },
        { icon: '💰', accent: 'from-[#1f8a5b] to-[#146341]', label: t('oOverview.weekRevenue'), cur: data.revenue_this_week_cents, prev: data.revenue_last_week_cents, display: fmtSar(data.revenue_this_week_cents) },
      ]
    : []

  const totals = data
    ? [
        { icon: '👥', label: t('oOverview.students'), value: data.students_count, to: '/owner/accounts' },
        { icon: '🧑‍🏫', label: t('oOverview.activeTeachers'), value: data.approved_teacher_count, to: '/owner/teachers' },
        { icon: '⏳', label: t('oOverview.pendingTeachers'), value: data.pending_teacher_count, to: '/owner/applications' },
        { icon: '📘', label: t('oOverview.courses'), value: data.courses_count, to: '/owner/courses' },
        { icon: '📝', label: t('oOverview.enrollments'), value: data.enrollments_count, to: '/owner/courses' },
        { icon: '🗂️', label: t('oOverview.requests'), value: data.requests_count, to: '/owner/service-requests' },
        { icon: '💵', label: t('oOverview.revenue'), value: fmtSar(data.total_revenue_cents), to: '/owner/invoices' },
        { icon: '⭐', label: t('oOverview.avgRating'), value: data.overall_avg_rating.toFixed(1), to: '/owner/reviews' },
      ]
    : []

  const quick = [
    { to: '/owner/billing', ar: 'إصدار فاتورة', en: 'Issue invoice', icon: '🧾' },
    { to: '/owner/services', ar: 'إدارة الخدمات', en: 'Manage services', icon: '🧩' },
    { to: '/owner/courses', ar: 'دورة جديدة', en: 'New course', icon: '📘' },
    { to: '/owner/broadcast', ar: 'رسالة جماعية', en: 'Broadcast', icon: '📣' },
    { to: '/owner/discounts', ar: 'كود خصم', en: 'Discount code', icon: '🏷️' },
    { to: '/owner/home-content', ar: 'محتوى الرئيسية', en: 'Homepage content', icon: '🖥️' },
  ]

  const latest = (requests ?? []).slice(0, 5)
  const unread = (messages ?? []).filter((m) => !m.read).slice(0, 3)
  const statusLabel = (s: RequestStatus) => t(`myRequests.status.${s}` as 'myRequests.status.pending')

  return (
    <div>
      <div className="mb-1 font-heading text-xl font-bold text-navy">{t('oOverview.title')}</div>
      <p className="mb-5 text-[13px] text-muted">{t('oOverview.subtitle')}</p>

      {/* NEEDS ATTENTION */}
      <div className="mb-7 rounded-2xl border border-border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[15px] font-bold text-navy">🔔 {ar ? 'يحتاج انتباهك الآن' : 'Needs your attention'}</div>
          {attention && attention.length > 0 && (
            <span className="rounded-full bg-error px-2.5 py-0.5 text-[12px] font-bold text-white">
              {attention.reduce((a, i) => a + i.count, 0)}
            </span>
          )}
        </div>
        {!attention ? (
          <div className="text-[13px] text-muted">…</div>
        ) : attention.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-[14px] text-success">
            ✓ {ar ? 'كل شيء تحت السيطرة — لا يوجد ما ينتظرك.' : 'All caught up — nothing is waiting on you.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {attention.map((a) => {
              const l = ATTENTION_LABELS[a.key]
              return (
                <Link
                  key={a.key}
                  to={a.to}
                  className="group flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/[0.06] px-4 py-3 no-underline transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold/10"
                >
                  <span className="text-[20px]">{l.icon}</span>
                  <span className="flex-1 text-[13.5px] font-semibold leading-6 text-navy">{ar ? l.ar : l.en}</span>
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-navy px-2 text-[13px] font-bold text-gold">{a.count}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {isLoading && <LoadingState />}

      {data && (
        <>
          <div className="mb-2.5 text-[13px] font-semibold text-accent">{t('oOverview.thisWeek')}</div>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {weekly.map((c) => (
              <div
                key={c.label}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.accent} p-5 text-white shadow-[0_10px_30px_-12px_rgba(11,31,58,0.4)]`}
              >
                <div className="mb-3 text-[22px]">{c.icon}</div>
                <div className="font-heading text-[28px] font-bold leading-none">{c.display}</div>
                <div className="mt-1.5 text-[12.5px] text-white/80">{c.label}</div>
                <div className="mt-3">
                  <Delta cur={c.cur} prev={c.prev} t={t} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* LATEST ACTIVITY */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-white p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[15px] font-bold text-navy">{ar ? 'أحدث طلبات الخدمات' : 'Latest service requests'}</div>
            <Link to="/owner/service-requests" className="text-[12.5px] font-semibold text-accent no-underline">
              {ar ? 'عرض الكل ←' : 'View all →'}
            </Link>
          </div>
          {latest.length === 0 ? (
            <div className="text-[13px] text-muted">{ar ? 'لا توجد طلبات بعد.' : 'No requests yet.'}</div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {latest.map((r) => (
                <Link key={r.id} to="/owner/service-requests" className="flex items-center gap-3 py-2.5 no-underline">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold text-navy">{r.subject}</div>
                    <div className="truncate text-[12px] text-muted">
                      {r.serviceTitle} · {fmtDate(r.created_at)}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${STATUS_STYLES[r.status]}`}>{statusLabel(r.status)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[15px] font-bold text-navy">{ar ? 'رسائل لم تُقرأ' : 'Unread messages'}</div>
            <Link to="/owner/contact" className="text-[12.5px] font-semibold text-accent no-underline">
              {ar ? 'عرض الكل ←' : 'View all →'}
            </Link>
          </div>
          {unread.length === 0 ? (
            <div className="text-[13px] text-muted">{ar ? 'لا توجد رسائل جديدة.' : 'No new messages.'}</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {unread.map((m) => (
                <Link key={m.id} to="/owner/contact" className="rounded-xl bg-bg-soft px-3.5 py-2.5 no-underline">
                  <div className="text-[13px] font-semibold text-navy">{m.name}</div>
                  <div className="line-clamp-2 text-[12.5px] leading-5 text-muted">{m.message}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="mb-2.5 text-[13px] font-semibold text-muted">{ar ? 'إجراءات سريعة' : 'Quick actions'}</div>
      <div className="mb-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {quick.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-4 text-center no-underline transition-all hover:-translate-y-0.5 hover:border-navy"
          >
            <span className="text-[22px]">{q.icon}</span>
            <span className="text-[12.5px] font-semibold text-navy">{ar ? q.ar : q.en}</span>
          </Link>
        ))}
      </div>

      {data && (
        <>
          <div className="mb-2.5 text-[13px] font-semibold text-muted">{t('oOverview.total')}</div>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {totals.map((c) => (
              <Link key={c.label} to={c.to} className="rounded-xl border border-border bg-white p-4 text-center no-underline transition-colors hover:border-navy">
                <div className="mb-1 text-[18px]">{c.icon}</div>
                <div className="font-heading text-[22px] font-bold text-navy">{c.value}</div>
                <div className="mt-1 text-[12px] text-muted">{c.label}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
