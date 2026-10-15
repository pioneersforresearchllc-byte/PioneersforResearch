import { Link, Navigate } from 'react-router-dom'
import { AuthCard } from '@/components/AuthCard'
import { useLanguage } from '@/lib/i18n'
import { useAuth } from '@/context/AuthContext'
import { ConsultantAgreementGate } from '@/components/ConsultantAgreementGate'

export function TeacherPendingPage() {
  const { t, lang } = useLanguage()
  const ar = lang === 'ar'
  const { profile, signOut } = useAuth()

  // Approved in the meantime → straight to the dashboard.
  if (profile?.role === 'teacher' && profile.status === 'active') return <Navigate to="/teacher" replace />

  // Google sign-in lands rejected applicants here too (the password login
  // shows its own message) — don't tell them it's still under review.
  const rejected = profile?.role === 'teacher' && profile.status === 'rejected'

  return (
    <AuthCard width={440}>
      {/* Applicants sign the Trainer Agreement while under review, so they can be assigned as soon as they're approved. */}
      {!rejected && <ConsultantAgreementGate />}
      <div className="text-center">
        <div className="mb-4 text-4xl">{rejected ? '✖' : '⏳'}</div>
        <div className="font-heading mb-3 text-xl font-bold text-navy">{rejected ? t('login.teacherRejected') : t('teacherPending.title')}</div>
        <p className="mb-6.5 text-[14.5px] leading-8 text-muted">
          {rejected
            ? ar
              ? 'شكرًا لاهتمامك بالانضمام. للاستفسار عن القرار تواصل معنا عبر صفحة التواصل.'
              : 'Thank you for your interest. For questions about this decision, reach us through the contact page.'
            : t('teacherPending.body')}
        </p>
        {profile?.name && (
          <p className="-mt-3 mb-5 text-[12.5px] text-faint">
            {ar ? 'الحساب:' : 'Account:'} {profile.name} (@{profile.username})
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Link
            to="/"
            className="inline-block rounded-md bg-navy px-7 py-3 text-[14.5px] text-white no-underline hover:bg-navy-hover"
          >
            {t('teacherPending.backHome')}
          </Link>
          {/* Without this a pending applicant stayed signed in with no way out. */}
          {profile && (
            <button
              onClick={() => void signOut()}
              className="rounded-md border border-border px-6 py-3 text-[14px] text-muted hover:border-navy hover:text-navy"
            >
              {t('shell.signOut')}
            </button>
          )}
        </div>
      </div>
    </AuthCard>
  )
}
