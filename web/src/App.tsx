import { lazy, Suspense, type ComponentType } from 'react'
import { Route, Routes } from 'react-router-dom'
import { MarketingLayout } from '@/layouts/MarketingLayout'
import { RequireRole } from '@/routes/RequireRole'
import { Placeholder } from '@/components/Placeholder'
import { CookieConsent } from '@/components/CookieConsent'
import { FullPageLoader } from '@/components/LogoLoader'
import { SeoSync } from '@/lib/useDocumentMeta'
import { MarketingHome } from '@/pages/marketing/MarketingHome'

// Code splitting: the homepage (where ads and search land) is the only page in
// the main bundle. Every other page — and the whole dashboard layer — is its
// own chunk, fetched on first visit. Suspense boundaries live in
// MarketingLayout / DashboardShell (around <Outlet/>) and around <Routes> below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const page = <M,>(load: () => Promise<M>, name: keyof M) =>
  lazy(() => load().then((m) => ({ default: m[name] as ComponentType<any> })))

// Dashboards (shell + tabs)
const StudentDashboard = page(() => import('@/routes/dashboards'), 'StudentDashboard')
const TeacherDashboard = page(() => import('@/routes/dashboards'), 'TeacherDashboard')
const OwnerDashboard = page(() => import('@/routes/dashboards'), 'OwnerDashboard')
const InstitutionDashboard = page(() => import('@/routes/dashboards'), 'InstitutionDashboard')

// Public pages
const AboutPage = page(() => import('@/pages/marketing/AboutPage'), 'AboutPage')
const MarketingCoursesPage = page(() => import('@/pages/marketing/CoursesPage'), 'MarketingCoursesPage')
const MarketingServicesPage = page(() => import('@/pages/marketing/ServicesPage'), 'MarketingServicesPage')
const InstitutionsPage = page(() => import('@/pages/marketing/InstitutionsPage'), 'InstitutionsPage')
const MarketingContactPage = page(() => import('@/pages/marketing/ContactPage'), 'MarketingContactPage')
const CourseDetailPage = page(() => import('@/pages/marketing/CourseDetailPage'), 'CourseDetailPage')
const ServiceDetailPage = page(() => import('@/pages/marketing/ServiceDetailPage'), 'ServiceDetailPage')
const ArticleDetailPage = page(() => import('@/pages/marketing/ArticleDetailPage'), 'ArticleDetailPage')
const TermsPage = page(() => import('@/pages/marketing/LegalPages'), 'TermsPage')
const PrivacyPage = page(() => import('@/pages/marketing/LegalPages'), 'PrivacyPage')
const RefundPage = page(() => import('@/pages/marketing/LegalPages'), 'RefundPage')
const ConsultantAgreementPage = page(() => import('@/pages/marketing/LegalPages'), 'ConsultantAgreementPage')
const QuotePage = page(() => import('@/pages/marketing/QuotePage'), 'QuotePage')
const VerifyLookupPage = page(() => import('@/pages/marketing/VerifyLookupPage'), 'VerifyLookupPage')
const VerifyCertificatePage = page(() => import('@/pages/marketing/VerifyCertificatePage'), 'VerifyCertificatePage')

// Auth & onboarding
const LoginPage = page(() => import('@/pages/auth/LoginPage'), 'LoginPage')
const ForgotPasswordPage = page(() => import('@/pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage')
const ResetPasswordPage = page(() => import('@/pages/auth/ResetPasswordPage'), 'ResetPasswordPage')
const AuthCallbackPage = page(() => import('@/pages/auth/AuthCallbackPage'), 'AuthCallbackPage')
const CompleteProfilePage = page(() => import('@/pages/auth/CompleteProfilePage'), 'CompleteProfilePage')
const RegisterPage = page(() => import('@/pages/auth/RegisterPage'), 'RegisterPage')
const RegisterOtpPage = page(() => import('@/pages/auth/RegisterOtpPage'), 'RegisterOtpPage')
const TeacherApplyPage = page(() => import('@/pages/auth/TeacherApplyPage'), 'TeacherApplyPage')
const TeacherPendingPage = page(() => import('@/pages/auth/TeacherPendingPage'), 'TeacherPendingPage')
const InstitutionApplyPage = page(() => import('@/pages/auth/InstitutionApplyPage'), 'InstitutionApplyPage')
const InstitutionPendingPage = page(() => import('@/pages/auth/InstitutionPendingPage'), 'InstitutionPendingPage')
const OwnerLoginPage = page(() => import('@/pages/auth/OwnerLoginPage'), 'OwnerLoginPage')
const OwnerOtpPage = page(() => import('@/pages/auth/OwnerOtpPage'), 'OwnerOtpPage')
// Pulls in the (large) Daily video SDK only when a call is opened.
const CallPage = page(() => import('@/pages/call/CallPage'), 'CallPage')

// Shared dashboard pages
const ChatPage = page(() => import('@/pages/dashboard/chat/ChatPage'), 'ChatPage')
const AccountPage = page(() => import('@/pages/dashboard/shared/AccountPage'), 'AccountPage')
const MyRequestsPage = page(() => import('@/pages/dashboard/shared/MyRequestsPage'), 'MyRequestsPage')
const MyRequestsRedirect = page(() => import('@/pages/dashboard/shared/MyRequestsPage'), 'MyRequestsRedirect')
const WorkshopsPage = page(() => import('@/pages/dashboard/shared/WorkshopsPage'), 'WorkshopsPage')

// Student
const StudentOverviewPage = page(() => import('@/pages/dashboard/student/OverviewPage'), 'StudentOverviewPage')
const StudentCoursesPage = page(() => import('@/pages/dashboard/student/CoursesPage'), 'StudentCoursesPage')
const StudentCourseDetailPage = page(() => import('@/pages/dashboard/student/CourseDetailPage'), 'StudentCourseDetailPage')
const StudentAssignmentsPage = page(() => import('@/pages/dashboard/student/AssignmentsPage'), 'StudentAssignmentsPage')
const StudentGradesPage = page(() => import('@/pages/dashboard/student/GradesPage'), 'StudentGradesPage')
const StudentInvoicesPage = page(() => import('@/pages/dashboard/student/InvoicesPage'), 'StudentInvoicesPage')
const StudentServicesPage = page(() => import('@/pages/dashboard/student/ServicesPage'), 'StudentServicesPage')
const StudentBillingPage = page(() => import('@/pages/dashboard/student/BillingPage'), 'StudentBillingPage')
const StudentCertificatesPage = page(() => import('@/pages/dashboard/student/CertificatesPage'), 'StudentCertificatesPage')
const StudentFeedbackPage = page(() => import('@/pages/dashboard/student/FeedbackPage'), 'StudentFeedbackPage')
const StudentArticlesPage = page(() => import('@/pages/dashboard/student/ArticlesPage'), 'StudentArticlesPage')

// Teacher
const TeacherOverviewPage = page(() => import('@/pages/dashboard/teacher/OverviewPage'), 'TeacherOverviewPage')
const TeacherStudentsPage = page(() => import('@/pages/dashboard/teacher/StudentsPage'), 'TeacherStudentsPage')
const TeacherCoursesPage = page(() => import('@/pages/dashboard/teacher/CoursesPage'), 'TeacherCoursesPage')
const TeacherCourseDetailPage = page(() => import('@/pages/dashboard/teacher/CourseDetailPage'), 'TeacherCourseDetailPage')
const TeacherReviewPage = page(() => import('@/pages/dashboard/teacher/ReviewPage'), 'TeacherReviewPage')
const TeacherArticlesPage = page(() => import('@/pages/dashboard/teacher/ArticlesPage'), 'TeacherArticlesPage')
const TeacherAssignedRequestsPage = page(() => import('@/pages/dashboard/teacher/AssignedRequestsPage'), 'TeacherAssignedRequestsPage')

// Owner
const OwnerOverviewPage = page(() => import('@/pages/dashboard/owner/OverviewPage'), 'OwnerOverviewPage')
const OwnerApplicationsPage = page(() => import('@/pages/dashboard/owner/ApplicationsPage'), 'OwnerApplicationsPage')
const OwnerTeachersPage = page(() => import('@/pages/dashboard/owner/TeachersPage'), 'OwnerTeachersPage')
const OwnerCoursesPage = page(() => import('@/pages/dashboard/owner/CoursesPage'), 'OwnerCoursesPage')
const OwnerServicesPage = page(() => import('@/pages/dashboard/owner/ServicesPage'), 'OwnerServicesPage')
const OwnerServiceRequestsPage = page(() => import('@/pages/dashboard/owner/ServiceRequestsPage'), 'OwnerServiceRequestsPage')
const OwnerWorkshopsPage = page(() => import('@/pages/dashboard/owner/WorkshopsPage'), 'OwnerWorkshopsPage')
const OwnerBillingPage = page(() => import('@/pages/dashboard/owner/BillingPage'), 'OwnerBillingPage')
const OwnerInvoicesPage = page(() => import('@/pages/dashboard/owner/InvoicesPage'), 'OwnerInvoicesPage')
const OwnerCertificatesPage = page(() => import('@/pages/dashboard/owner/CertificatesPage'), 'OwnerCertificatesPage')
const OwnerAdminsPage = page(() => import('@/pages/dashboard/owner/AdminsPage'), 'OwnerAdminsPage')
const OwnerAccountsPage = page(() => import('@/pages/dashboard/owner/AccountsPage'), 'OwnerAccountsPage')
const OwnerBroadcastPage = page(() => import('@/pages/dashboard/owner/BroadcastPage'), 'OwnerBroadcastPage')
const OwnerConsentsPage = page(() => import('@/pages/dashboard/owner/ConsentsPage'), 'OwnerConsentsPage')
const OwnerContactPage = page(() => import('@/pages/dashboard/owner/ContactPage'), 'OwnerContactPage')
const OwnerHomeContentPage = page(() => import('@/pages/dashboard/owner/HomeContentPage'), 'OwnerHomeContentPage')
const OwnerReviewsPage = page(() => import('@/pages/dashboard/owner/ReviewsPage'), 'OwnerReviewsPage')
const OwnerProfitPage = page(() => import('@/pages/dashboard/owner/ProfitPage'), 'OwnerProfitPage')
const OwnerArticlesPage = page(() => import('@/pages/dashboard/owner/ArticlesPage'), 'OwnerArticlesPage')
const OwnerDiscountsPage = page(() => import('@/pages/dashboard/owner/DiscountsPage'), 'OwnerDiscountsPage')
const OwnerInstitutionsPage = page(() => import('@/pages/dashboard/owner/InstitutionsPage'), 'OwnerInstitutionsPage')
const OwnerInstitutionConsultationsPage = page(() => import('@/pages/dashboard/owner/InstitutionConsultationsPage'), 'OwnerInstitutionConsultationsPage')

// Institution
const InstitutionOverviewPage = page(() => import('@/pages/dashboard/institution/OverviewPage'), 'InstitutionOverviewPage')
const InstitutionTraineesPage = page(() => import('@/pages/dashboard/institution/TraineesPage'), 'InstitutionTraineesPage')
const InstitutionConsultationsPage = page(() => import('@/pages/dashboard/institution/ConsultationsPage'), 'InstitutionConsultationsPage')
const InstitutionTeamPage = page(() => import('@/pages/dashboard/institution/TeamPage'), 'InstitutionTeamPage')

export default function App() {
  return (
    <>
      <SeoSync />
      <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<MarketingHome />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/courses" element={<MarketingCoursesPage />} />
          <Route path="/services" element={<MarketingServicesPage />} />
          <Route path="/institutions" element={<InstitutionsPage />} />
          <Route path="/contact" element={<MarketingContactPage />} />
          <Route path="/course/:id" element={<CourseDetailPage />} />
          <Route path="/service/:slug" element={<ServiceDetailPage />} />
          <Route path="/article/:id" element={<ArticleDetailPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refund" element={<RefundPage />} />
        <Route path="/consultant-agreement" element={<ConsultantAgreementPage />} />
        <Route path="/quote" element={<QuotePage />} />
        <Route path="/verify" element={<VerifyLookupPage />} />
        </Route>

        <Route path="/verify/:id" element={<VerifyCertificatePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/my-requests" element={<MyRequestsRedirect />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register-otp" element={<RegisterOtpPage />} />
        <Route path="/teacher-apply" element={<TeacherApplyPage />} />
        <Route path="/teacher-pending" element={<TeacherPendingPage />} />
        <Route path="/register-institution" element={<InstitutionApplyPage />} />
        <Route path="/institution-pending" element={<InstitutionPendingPage />} />
        <Route path="/owner-login" element={<OwnerLoginPage />} />
        <Route path="/owner-otp" element={<OwnerOtpPage />} />
        <Route path="/call/:sessionId" element={<CallPage />} />
        <Route path="/group-call/:sessionId" element={<CallPage kind="group" />} />

        <Route element={<RequireRole role="student" />}>
          <Route element={<StudentDashboard />}>
            <Route path="/student" element={<StudentOverviewPage />} />
            <Route path="/student/courses" element={<StudentCoursesPage />} />
            <Route path="/student/courses/:id" element={<StudentCourseDetailPage />} />
            <Route path="/student/assignments" element={<StudentAssignmentsPage />} />
            <Route path="/student/grades" element={<StudentGradesPage />} />
            <Route path="/student/invoices" element={<StudentInvoicesPage />} />
            <Route path="/student/services" element={<StudentServicesPage />} />
            <Route path="/student/workshops" element={<WorkshopsPage />} />
            <Route path="/student/billing" element={<StudentBillingPage />} />
            <Route path="/student/certificates" element={<StudentCertificatesPage />} />
            <Route path="/student/feedback" element={<StudentFeedbackPage />} />
            <Route path="/student/articles" element={<StudentArticlesPage />} />
            <Route path="/student/articles/:id" element={<ArticleDetailPage />} />
            <Route path="/student/requests" element={<MyRequestsPage />} />
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
            <Route path="/teacher/assigned" element={<TeacherAssignedRequestsPage />} />
            <Route path="/teacher/workshops" element={<WorkshopsPage />} />
            <Route path="/teacher/requests" element={<MyRequestsPage />} />
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
            <Route path="/owner/services" element={<OwnerServicesPage />} />
            <Route path="/owner/service-requests" element={<OwnerServiceRequestsPage />} />
            <Route path="/owner/workshops" element={<OwnerWorkshopsPage />} />
            <Route path="/owner/billing" element={<OwnerBillingPage />} />
            <Route path="/owner/invoices" element={<OwnerInvoicesPage />} />
            <Route path="/owner/certificates" element={<OwnerCertificatesPage />} />
            <Route path="/owner/admins" element={<OwnerAdminsPage />} />
            <Route path="/owner/accounts" element={<OwnerAccountsPage />} />
            <Route path="/owner/broadcast" element={<OwnerBroadcastPage />} />
            <Route path="/owner/consents" element={<OwnerConsentsPage />} />
            <Route path="/owner/messages" element={<ChatPage />} />
            <Route path="/owner/contact" element={<OwnerContactPage />} />
            <Route path="/owner/home-content" element={<OwnerHomeContentPage />} />
        <Route path="/owner/reviews" element={<OwnerReviewsPage />} />
        <Route path="/owner/profit" element={<OwnerProfitPage />} />
            <Route path="/owner/articles" element={<OwnerArticlesPage />} />
            <Route path="/owner/discounts" element={<OwnerDiscountsPage />} />
            <Route path="/owner/institutions" element={<OwnerInstitutionsPage />} />
            <Route path="/owner/institution-consultations" element={<OwnerInstitutionConsultationsPage />} />
            <Route path="/owner/account" element={<AccountPage />} />
          </Route>
        </Route>

        <Route element={<RequireRole role="institution" />}>
          <Route element={<InstitutionDashboard />}>
            <Route path="/institution" element={<InstitutionOverviewPage />} />
            <Route path="/institution/trainees" element={<InstitutionTraineesPage />} />
            <Route path="/institution/consultations" element={<InstitutionConsultationsPage />} />
            <Route path="/institution/team" element={<InstitutionTeamPage />} />
            <Route path="/institution/account" element={<AccountPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Placeholder />} />
      </Routes>
      </Suspense>
      <CookieConsent />
    </>
  )
}
