import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyTaughtCourses } from '@/lib/courses'
import { listAssignmentsForTeacher } from '@/lib/assignments'
import { listAssignedRequests } from '@/lib/services'

export function TeacherOverviewPage() {
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const ar = lang === 'ar'
  const coursesQuery = useQuery({
    queryKey: ['my-taught-courses', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyTaughtCourses(profile!.id),
  })
  const assignmentsQuery = useQuery({
    queryKey: ['teacher-review-assignments', profile?.id],
    enabled: !!profile,
    queryFn: () => listAssignmentsForTeacher(profile!.id),
  })
  const requestsQuery = useQuery({
    queryKey: ['assigned-requests', profile?.id],
    enabled: !!profile,
    queryFn: () => listAssignedRequests(profile!.id),
  })

  const totalStudents = (coursesQuery.data ?? []).reduce((sum, c) => sum + c.enrolledCount, 0)
  const pendingReview = (assignmentsQuery.data ?? []).reduce((sum, a) => sum + (a.submittedCount - a.gradedCount), 0)
  const activeRequests = (requestsQuery.data ?? []).filter((r) => r.status === 'paid' || r.status === 'in_progress')

  // The one thing to do next, in priority order.
  const next = pendingReview > 0
    ? { text: ar ? `لديك ${pendingReview} تسليم بانتظار التصحيح` : `${pendingReview} submissions waiting to be graded`, to: '/teacher/review', cta: ar ? 'ابدأ التصحيح' : 'Start grading' }
    : activeRequests.length > 0
      ? { text: ar ? `لديك ${activeRequests.length} طلب خدمة قيد التنفيذ` : `${activeRequests.length} service requests in progress`, to: '/teacher/assigned', cta: ar ? 'افتح الطلبات' : 'Open requests' }
      : { text: ar ? 'لا يوجد ما ينتظرك الآن — شارك معرفتك بمقال جديد.' : 'Nothing waiting — share your knowledge in a new article.', to: '/teacher/articles', cta: ar ? 'اكتب مقالًا' : 'Write an article' }

  const cards = [
    { value: coursesQuery.data?.length ?? 0, label: t('tOverview.myCourses'), to: '/teacher/courses', icon: '📘' },
    { value: totalStudents, label: t('tOverview.totalStudents'), to: '/teacher/students', icon: '👥' },
    { value: pendingReview, label: t('tOverview.pendingReview'), to: '/teacher/review', icon: '📝', hot: pendingReview > 0 },
    { value: activeRequests.length, label: ar ? 'طلبات خدمات نشطة' : 'Active service requests', to: '/teacher/assigned', icon: '🗂️', hot: activeRequests.length > 0 },
  ]

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('tOverview.hello', { name: profile?.name ?? '' })}</div>
      <div className="mb-6 text-[13.5px] text-muted">{t('tOverview.subtitle')}</div>

      <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#0d2748] to-[#0a1c34] p-6 text-white">
        <div className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-gold">{ar ? 'خطوتك التالية' : 'Your next step'}</div>
        <div className="mb-4 text-[17px] font-semibold leading-7">{next.text}</div>
        <Link to={next.to} className="inline-flex rounded-lg bg-gold px-5 py-2.5 text-[13.5px] font-semibold text-navy no-underline hover:bg-gold-light">
          {next.cta}
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className={`rounded-xl border bg-white p-5 text-center no-underline transition-all hover:-translate-y-0.5 hover:border-navy ${c.hot ? 'border-gold' : 'border-border'}`}
          >
            <div className="mb-1 text-[20px]">{c.icon}</div>
            <div className="font-heading text-[26px] font-bold text-navy">{c.value}</div>
            <div className="mt-1 text-[12.5px] text-muted">{c.label}</div>
          </Link>
        ))}
      </div>

      {activeRequests.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="mb-3 text-[15px] font-bold text-navy">{ar ? 'طلبات الخدمات المكلّف بها' : 'Your assigned requests'}</div>
          <div className="flex flex-col divide-y divide-border">
            {activeRequests.slice(0, 5).map((r) => (
              <Link key={r.id} to="/teacher/assigned" className="flex items-center justify-between gap-3 py-2.5 no-underline">
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-navy">{r.subject}</span>
                  <span className="block truncate text-[12px] text-muted">{r.serviceTitle}</span>
                </span>
                <span className="shrink-0 text-[12px] text-muted">
                  {t('adminRequests.deliveryBy')}: {r.delivery_date}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
