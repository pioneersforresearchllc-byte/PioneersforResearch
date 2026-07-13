import { Link } from 'react-router-dom'
import { AuthCard } from '@/components/AuthCard'
import { useLanguage } from '@/lib/i18n'

export function TeacherPendingPage() {
  const { t } = useLanguage()
  return (
    <AuthCard width={440}>
      <div className="text-center">
        <div className="mb-4 text-4xl">⏳</div>
        <div className="font-heading mb-3 text-xl font-bold text-navy">{t('teacherPending.title')}</div>
        <p className="mb-6.5 text-[14.5px] leading-8 text-muted">{t('teacherPending.body')}</p>
        <Link
          to="/"
          className="inline-block rounded-md bg-navy px-7 py-3 text-[14.5px] text-white no-underline hover:bg-navy-hover"
        >
          {t('teacherPending.backHome')}
        </Link>
      </div>
    </AuthCard>
  )
}
