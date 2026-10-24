// The four role dashboards (shell + tabs + badge counters). Kept out of App.tsx
// so the whole dashboard layer — DashboardShell and its gates (terms, trainer
// agreement, phone) — lives in its own lazy chunk that public visitors never
// download.
import { useQuery } from '@tanstack/react-query'
import { DashboardShell, type DashboardTab } from '@/layouts/DashboardShell'
import { countMyUnseenRequests } from '@/lib/services'
import { countMyStudentUnseen, countMyTeacherUnseen } from '@/lib/assignments'
import { countMyDueInvoices } from '@/lib/billing'
import { useAuth } from '@/context/AuthContext'

const studentTabs: DashboardTab[] = [
  { key: 'overview', labelKey: 'tab.overview', to: '/student' },
  { key: 'courses', labelKey: 'tab.myCourses', to: '/student/courses' },
  { key: 'assignments', labelKey: 'tab.assignments', to: '/student/assignments' },
  { key: 'grades', labelKey: 'tab.grades', to: '/student/grades' },
  { key: 'certificates', labelKey: 'tab.certificates', to: '/student/certificates' },
  { key: 'feedback', labelKey: 'tab.feedback', to: '/student/feedback' },
  { key: 'articles', labelKey: 'tab.articles', to: '/student/articles' },
  { key: 'my-services', labelKey: 'tab.myServices', to: '/student/services' },
  { key: 'workshops', labelKey: 'tab.workshops', to: '/student/workshops' },
  { key: 'requests', labelKey: 'tab.myRequests', to: '/student/requests' },
  { key: 'billing', labelKey: 'tab.billing', to: '/student/billing' },
  { key: 'invoices', labelKey: 'tab.invoices', to: '/student/invoices' },
  { key: 'chat', labelKey: 'tab.messages', to: '/student/chat' },
  { key: 'account', labelKey: 'tab.myAccount', to: '/student/account' },
]

const teacherTabs: DashboardTab[] = [
  { key: 'overview', labelKey: 'tab.overview', to: '/teacher' },
  { key: 'students', labelKey: 'tab.students', to: '/teacher/students' },
  { key: 'courses', labelKey: 'tab.coursesPrograms', to: '/teacher/courses' },
  { key: 'review', labelKey: 'tab.reviewAssignments', to: '/teacher/review' },
  { key: 'articles', labelKey: 'tab.myArticles', to: '/teacher/articles' },
  { key: 'workshops', labelKey: 'tab.workshops', to: '/teacher/workshops' },
  { key: 'assigned', labelKey: 'tab.assignedRequests', to: '/teacher/assigned' },
  { key: 'requests', labelKey: 'tab.myRequests', to: '/teacher/requests' },
  { key: 'chat', labelKey: 'tab.messages', to: '/teacher/chat' },
  { key: 'account', labelKey: 'tab.myAccount', to: '/teacher/account' },
]

const ownerTabs: DashboardTab[] = [
  { key: 'overview', labelKey: 'tab.overview', to: '/owner' },
  { key: 'applications', labelKey: 'tab.teacherApplications', to: '/owner/applications' },
  { key: 'teachers', labelKey: 'tab.teachers', to: '/owner/teachers' },
  { key: 'courses', labelKey: 'tab.coursesPrograms', to: '/owner/courses' },
  { key: 'services', labelKey: 'tab.services', to: '/owner/services' },
  { key: 'service-requests', labelKey: 'tab.serviceRequests', to: '/owner/service-requests' },
  { key: 'workshops', labelKey: 'tab.workshops', to: '/owner/workshops' },
  { key: 'billing', labelKey: 'tab.billingIssue', to: '/owner/billing' },
  { key: 'invoices', labelKey: 'tab.finance', to: '/owner/invoices' },
  { key: 'profit', labelKey: 'tab.profit', to: '/owner/profit' },
  { key: 'discounts', labelKey: 'tab.discounts', to: '/owner/discounts' },
  { key: 'institutions', labelKey: 'tab.institutions', to: '/owner/institutions' },
  { key: 'inst-consultations', labelKey: 'tab.instConsultations', to: '/owner/institution-consultations' },
  { key: 'certificates', labelKey: 'tab.certificates', to: '/owner/certificates' },
  { key: 'admins', labelKey: 'tab.admins', to: '/owner/admins' },
  { key: 'accounts', labelKey: 'tab.accounts', to: '/owner/accounts' },
  { key: 'consents', labelKey: 'tab.consents', to: '/owner/consents' },
  { key: 'broadcast', labelKey: 'tab.broadcast', to: '/owner/broadcast' },
  { key: 'messages', labelKey: 'tab.messages', to: '/owner/messages' },
  { key: 'contact', labelKey: 'tab.contactMessages', to: '/owner/contact' },
  { key: 'home-content', labelKey: 'tab.homeContent', to: '/owner/home-content' },
  { key: 'reviews', labelKey: 'tab.reviews', to: '/owner/reviews' },
  { key: 'articles', labelKey: 'tab.manageArticles', to: '/owner/articles' },
  { key: 'account', labelKey: 'tab.myAccount', to: '/owner/account' },
]

const institutionTabs: DashboardTab[] = [
  { key: 'inst-home', labelKey: 'tab.instHome', to: '/institution' },
  { key: 'inst-trainees', labelKey: 'tab.instTrainees', to: '/institution/trainees' },
  { key: 'inst-consult', labelKey: 'tab.instConsult', to: '/institution/consultations' },
  { key: 'inst-team', labelKey: 'tab.instTeam', to: '/institution/team' },
  { key: 'account', labelKey: 'tab.myAccount', to: '/institution/account' },
]

/** Unseen-requests count for the "My Requests" tab badge, kept fresh so a new
 *  development (owner priced/updated a request) shows up without a reload. */
function useRequestsBadge(userId: string | undefined): Record<string, number> {
  const { data } = useQuery({
    queryKey: ['my-requests-unseen', userId],
    enabled: !!userId,
    queryFn: () => countMyUnseenRequests(userId!),
    refetchInterval: 60_000,
  })
  return { requests: data ?? 0 }
}

export function StudentDashboard() {
  const { profile } = useAuth()
  const badges = useRequestsBadge(profile?.id)
  const { data: unseenSubs } = useQuery({
    queryKey: ['student-unseen-subs', profile?.id],
    enabled: !!profile,
    queryFn: countMyStudentUnseen,
    refetchInterval: 60_000,
  })
  const { data: dueInvoices } = useQuery({
    queryKey: ['student-due-invoices', profile?.id],
    enabled: !!profile,
    queryFn: countMyDueInvoices,
    refetchInterval: 60_000,
  })
  return (
    <DashboardShell
      subtitleKey="shell.studentSubtitle"
      userName={profile?.name ?? ''}
      tabs={studentTabs}
      badges={{ ...badges, assignments: unseenSubs ?? 0, billing: dueInvoices ?? 0 }}
    />
  )
}

export function TeacherDashboard() {
  const { profile } = useAuth()
  const badges = useRequestsBadge(profile?.id)
  const { data: unseenSubs } = useQuery({
    queryKey: ['teacher-unseen-subs', profile?.id],
    enabled: !!profile,
    queryFn: countMyTeacherUnseen,
    refetchInterval: 60_000,
  })
  return (
    <DashboardShell
      subtitleKey="shell.teacherSubtitle"
      userName={profile?.name ?? ''}
      tabs={teacherTabs}
      badges={{ ...badges, review: unseenSubs ?? 0 }}
    />
  )
}

export function OwnerDashboard() {
  const { profile } = useAuth()
  return <DashboardShell subtitleKey="shell.ownerSubtitle" userName={profile?.name ?? ''} tabs={ownerTabs} />
}

export function InstitutionDashboard() {
  const { profile } = useAuth()
  return <DashboardShell subtitleKey="shell.instSubtitle" userName={profile?.name ?? ''} tabs={institutionTabs} />
}
