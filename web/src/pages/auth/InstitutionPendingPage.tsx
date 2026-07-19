import { Link } from 'react-router-dom'
import { AuthCard } from '@/components/AuthCard'
import { useLanguage } from '@/lib/i18n'

export function InstitutionPendingPage() {
  const { t } = useLanguage()
  return (
    <AuthCard>
      <div className="text-center">
        <div className="mb-4 text-4xl">🏢</div>
        <div className="mb-2 font-heading text-xl font-bold text-navy">{t('instPending.title')}</div>
        <div className="mb-6 text-[14px] leading-7 text-muted">{t('instPending.body')}</div>
        <Link
          to="/"
          className="inline-block rounded-md border border-border px-5 py-2.5 text-[14px] text-navy no-underline hover:border-navy"
        >
          {t('instPending.backHome')}
        </Link>
      </div>
    </AuthCard>
  )
}
