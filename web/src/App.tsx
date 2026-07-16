import { Route, Routes } from 'react-router-dom'
import { MarketingLayout } from '@/layouts/MarketingLayout'
import { DashboardShell, type DashboardTab } from '@/layouts/DashboardShell'
import { RequireRole } from '@/routes/RequireRole'
import { Placeholder } from '@/components/Placeholder'
import { useAuth } from '@/context/AuthContext'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { RegisterOtpPage } from '@/pages/auth/RegisterOtpPage'
import { TeacherApplyPage } from '@/pages/auth/TeacherApplyPage'
import { TeacherPendingPage } from '@/pages/auth/TeacherPendingPage'
import { OwnerLoginPage } from '@/pages/auth/OwnerLoginPage'
import { OwnerOtpPage } from '@/pages/auth/OwnerOtpPage'
import { MarketingHome } from '@/pages/marketing/MarketingHome'
import { CourseDetailPage } from '@/pages/marketing/CourseDetailPage'
import { ArticleDetailPage } from '@/pages/marketing/ArticleDetailPage'
import { ChatPage } from '@/pages/dashboard/chat/ChatPage'
import { OwnerCoursesPage } from '@/pages/dashboard/owner/CoursesPage'
import { OwnerApplicationsPage } from '@/pages/dashboard/owner/ApplicationsPage'
import { OwnerTeachersPage } from '@/pages/dashboard/owner/TeachersPage'
import { StudentCoursesPage } from '@/pages/dashboard/student/CoursesPage'
import { StudentCourseDetailPage } from '@/pages/dashboard/student/CourseDetailPage'
import { TeacherCoursesPage } from '@/pages/dashboard/teacher/CoursesPage'
import { TeacherCourseDetailPage } from '@/pages/dashboard/teacher/CourseDetailPage'
import { TeacherReviewPage } from '@/pages/dashboard/teacher/ReviewPage'
import { StudentAssignmentsPage } from '@/pages/dashboard/student/AssignmentsPage'
import { OwnerCertificatesPage } from '@/pages/dashboard/owner/CertificatesPage'
import { StudentCertificatesPage } from '@/pages/dashboard/student/CertificatesPage'
import { TeacherArticlesPage } from '@/pages/dashboard/teacher/ArticlesPage'
import { StudentArticlesPage } from '@/pages/dashboard/student/ArticlesPage'
import { OwnerOverviewPage } from '@/pages/dashboard/owner/OverviewPage'
import { OwnerAdminsPage } from '@/pages/dashboard/owner/AdminsPage'
import { OwnerContactPage } from '@/pages/dashboard/owner/ContactPage'
import { StudentGradesPage } from '@/pages/dashboard/student/GradesPage'
import { StudentFeedbackPage } from '@/pages/dashboard/student/FeedbackPage'
import { AccountPage } from '@/pages/dashboard/shared/AccountPage'
import { StudentOverviewPage } from '@/pages/dashboard/student/OverviewPage'
import { TeacherOverviewPage } from '@/pages/dashboard/teacher/OverviewPage'
import { TeacherStudentsPage } from '@/pages/dashboard/teacher/StudentsPage'

const studentTabs: DashboardTab[] = [
  { key: 'overview', label: 'نظرة عامة', to: '/student' },
  { key: 'courses', label: 'دوراتي', to: '/student/courses' },
  { key: 'assignments', label: 'واجباتي', to: '/student/assignments' },
  { key: 'grades', label: 'تقدمي ودرجاتي', to: '/student/grades' },
  { key: 'certificates', label: 'شهاداتي', to: '/student/certificates' },
  { key: 'feedback', label: 'ملاحظات المعلم', to: '/student/feedback' },
  { key: 'articles', label: 'المقالات', to: '/student/articles' },
  { key: 'chat', label: 'الرسائل', to: '/student/chat' },
  { key: 'account', label: 'حسابي', to: '/student/account' },
]

const teacherTabs: DashboardTab[] = [
  { key: 'overview', label: 'نظرة عامة', to: '/teacher' },
  { key: 'students', label: 'الطلاب', to: '/teacher/students' },
  { key: 'courses', label: 'الدورات والبرامج', to: '/teacher/courses' },
  { key: 'review', label: 'مراجعة الواجبات', to: '/teacher/review' },
  { key: 'articles', label: 'مقالاتي', to: '/teacher/articles' },
  { key: 'chat', label: 'الرسائل', to: '/teacher/chat' },
  { key: 'account', label: 'حسابي', to: '/teacher/account' },
]

const ownerTabs: DashboardTab[] = [
  { key: 'overview', label: 'نظرة عامة', to: '/owner' },
  { key: 'applications', label: 'طلبات المعلمين', to: '/owner/applications' },
  { key: 'teachers', label: 'المعلمون', to: '/owner/teachers' },
  { key: 'courses', label: 'البرامج', to: '/owner/courses' },
  { key: 'certificates', label: 'الشهادات', to: '/owner/certificates' },
  { key: 'admins', label: 'أعضاء الإدارة', to: '/owner/admins' },
  { key: 'messages', label: 'الرسائل', to: '/owner/messages' },
  { key: 'contact', label: 'رسائل التواصل', to: '/owner/contact' },
  { key: 'account', label: 'حسابي', to: '/owner/account' },
]

function StudentDashboard() {
  const { profile } = useAuth()
  return <DashboardShell subtitle="منصة الطالب" userName={profile?.name ?? ''} tabs={studentTabs} />
}

function TeacherDashboard() {
  const { profile } = useAuth()
  return <DashboardShell subtitle="لوحة المعلم" userName={profile?.name ?? ''} tabs={teacherTabs} />
}

function OwnerDashboard() {
  const { profile } = useAuth()
  return <DashboardShell subtitle="لوحة الإدارة" userName={profile?.name ?? ''} tabs={ownerTabs} />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<MarketingHome />} />
          <Route path="/course/:id" element={<CourseDetailPage />} />
          <Route path="/article/:id" element={<ArticleDetailPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register-otp" element={<RegisterOtpPage />} />
        <Route path="/teacher-apply" element={<TeacherApplyPage />} />
        <Route path="/teacher-pending" element={<TeacherPendingPage />} />
        <Route path="/owner-login" element={<OwnerLoginPage />} />
        <Route path="/owner-otp" element={<OwnerOtpPage />} />

        <Route element={<RequireRole role="student" />}>
          <Route element={<StudentDashboard />}>
            <Route path="/student" element={<StudentOverviewPage />} />
            <Route path="/student/courses" element={<StudentCoursesPage />} />
            <Route path="/student/courses/:id" element={<StudentCourseDetailPage />} />
            <Route path="/student/assignments" element={<StudentAssignmentsPage />} />
            <Route path="/student/grades" element={<StudentGradesPage />} />
            <Route path="/student/certificates" element={<StudentCertificatesPage />} />
            <Route path="/student/feedback" element={<StudentFeedbackPage />} />
            <Route path="/student/articles" element={<StudentArticlesPage />} />
            <Route path="/student/articles/:id" element={<ArticleDetailPage />} />
            <Route path="/student/chat" element={<ChatPage />} />
            <Route path="/student/account" element={<AccountPage />} />
          </Route>
        </Route>

        <Route element={<RequireRole role="teacher" />}>
          <Route element={<TeacherDashboard />}>
            <Route path="/teacher" element={<TeacherOverviewPage />} />
            <Route path="/teacher/students" element={<TeacherStudentsPage />} />
            <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
            <Route path="/teacher/courses/:id" element={<TeacherCourseDetailPage />} />
            <Route path="/teacher/review" element={<TeacherReviewPage />} />
            <Route path="/teacher/articles" element={<TeacherArticlesPage />} />
            <Route path="/teacher/chat" element={<ChatPage />} />
            <Route path="/teacher/account" element={<AccountPage />} />
          </Route>
        </Route>

        <Route element={<RequireRole role="owner" />}>
          <Route element={<OwnerDashboard />}>
            <Route path="/owner" element={<OwnerOverviewPage />} />
            <Route path="/owner/applications" element={<OwnerApplicationsPage />} />
            <Route path="/owner/teachers" element={<OwnerTeachersPage />} />
            <Route path="/owner/courses" element={<OwnerCoursesPage />} />
            <Route path="/owner/certificates" element={<OwnerCertificatesPage />} />
            <Route path="/owner/admins" element={<OwnerAdminsPage />} />
            <Route path="/owner/messages" element={<ChatPage />} />
            <Route path="/owner/contact" element={<OwnerContactPage />} />
            <Route path="/owner/account" element={<AccountPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Placeholder title="الصفحة غير موجودة" />} />
      </Routes>
    </>
  )
}
