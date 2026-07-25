import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyEnrolledCourses } from '@/lib/courses'
import { listMyAssignments } from '@/lib/assignments'
import { LoadingState } from '@/components/LoadingState'

const PHASE_KEYS = [
  'sOverview.phase.foundations',
  'sOverview.phase.literature',
  'sOverview.phase.methodology',
  'sOverview.phase.analysis',
  'sOverview.phase.publishing',
] as const

export function StudentOverviewPage() {
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const coursesQuery = useQuery({
    queryKey: ['my-enrolled-courses', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyEnrolledCourses(profile!.id),
  })
  const assignmentsQuery = useQuery({
    queryKey: ['my-assignments', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyAssignments(profile!.id),
  })

  const courses = coursesQuery.data ?? []
  const assignments = assignmentsQuery.data ?? []
  const loading = coursesQuery.isLoading || assignmentsQuery.isLoading

  // Earliest-due unsubmitted assignment drives the primary nudge.
  const pending = assignments
    .filter((a) => !a.submission)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
  const nextAssignment = pending[0]
  const incompleteCourse = courses
    .filter((c) => c.progress < 100)
    .sort((a, b) => a.progress - b.progress)[0]

  // Average course progress → which journey phase to highlight (0 of 5 when new).
  const avgProgress = courses.length
    ? courses.reduce((sum, c) => sum + c.progress, 0) / courses.length
    : 0
  const currentPhase = courses.length ? Math.min(PHASE_KEYS.length - 1, Math.floor(avgProgress / 20)) : 0

  const fmtDate = (d: string) => new Date(d).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US')

  // Resolve the single most useful next action from real data.
  let step: { text: string; sub?: string; to: string; cta: string }
  if (nextAssignment) {
    step = {
      text: t('sOverview.nextSubmit', { title: nextAssignment.title }),
      sub: t('sOverview.dueOn', { date: fmtDate(nextAssignment.due_date) }),
      to: '/student/assignments',
      cta: t('sOverview.goNow'),
    }
  } else if (incompleteCourse) {
    step = {
      text: t('sOverview.nextContinue', { title: incompleteCourse.title }),
      to: `/student/courses/${incompleteCourse.id}`,
      cta: t('sOverview.goNow'),
    }
  } else if (courses.length === 0) {
    step = { text: t('sOverview.nextBrowse'), to: '/#courses', cta: t('sOverview.browseNow') }
  } else {
    step = { text: t('sOverview.nextDone'), to: '/student/certificates', cta: t('sOverview.goNow') }
  }

  const pendingCount = pending.length

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">
        {t('sOverview.hello', { name: profile?.name ?? '' })}
      </div>
      <div className="mb-6 text-[13.5px] text-muted">{t('sOverview.subtitle')}</div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {/* NEXT STEP — the single action that moves the learner forward */}
          <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d2748] to-[#0a1c34] p-6 text-white md:p-7">
            <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-wide text-gold">
              <ArrowIcon />
              {t('sOverview.nextStep')}
            </div>
            <div className="mb-1 text-[16.5px] font-semibold leading-7 md:text-[18px]">{step.text}</div>
            {step.sub && <div className="mb-4 text-[13px] text-white/70">{step.sub}</div>}
            {!step.sub && <div className="mb-4" />}
            <Link
              to={step.to}
              className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-[13.5px] font-semibold text-navy no-underline transition-colors hover:bg-gold-light"
            >
              {step.cta}
            </Link>
          </div>

          {/* RESEARCHER'S JOURNEY — the guiding roadmap */}
          <div className="mb-6 rounded-2xl border border-border bg-white p-5 md:p-6">
            <div className="mb-1 text-[14px] font-semibold text-navy">{t('sOverview.journey')}</div>
            <div className="mb-5 text-[12.5px] leading-6 text-muted">{t('sOverview.journeyHint')}</div>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-2">
              {PHASE_KEYS.map((key, i) => {
                const done = i < currentPhase
                const active = i === currentPhase
                return (
                  <div key={key} className="flex flex-1 items-center gap-3 md:flex-col md:text-center">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                        active
                          ? 'bg-navy text-white ring-4 ring-navy/15'
                          : done
                            ? 'bg-success/15 text-success'
                            : 'bg-bg-soft text-muted'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <div
                      className={`text-[12.5px] md:mt-2 ${
                        active ? 'font-semibold text-navy' : done ? 'text-navy' : 'text-muted'
                      }`}
                    >
                      {t(key)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* PROGRESS SNAPSHOT */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              to="/student/courses"
              className="rounded-xl border border-border bg-white p-5 text-center no-underline transition-colors hover:border-navy"
            >
              <div className="font-heading text-[26px] font-bold text-navy">{courses.length}</div>
              <div className="mt-1.5 text-[12.5px] text-muted">{t('sOverview.enrolledCourses')}</div>
            </Link>
            <Link
              to="/student/assignments"
              className="rounded-xl border border-border bg-white p-5 text-center no-underline transition-colors hover:border-navy"
            >
              <div className="font-heading text-[26px] font-bold text-navy">{pendingCount}</div>
              <div className="mt-1.5 text-[12.5px] text-muted">{t('sOverview.pendingAssignments')}</div>
            </Link>
            <Link
              to="/student/assignments"
              className="rounded-xl border border-border bg-white p-5 text-center no-underline transition-colors hover:border-navy"
            >
              <div className="font-heading text-[26px] font-bold text-navy">{assignments.length}</div>
              <div className="mt-1.5 text-[12.5px] text-muted">{t('sOverview.totalAssignments')}</div>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  )
}
