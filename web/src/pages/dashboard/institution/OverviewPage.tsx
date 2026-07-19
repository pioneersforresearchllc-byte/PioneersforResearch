import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'

export function InstitutionOverviewPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">
        {t('inst.welcome', { name: profile?.name ?? '' })}
      </div>
      <div className="rounded-xl border border-border bg-white p-6 text-[14px] leading-7 text-muted">
        {t('inst.overviewSoon')}
      </div>
    </div>
  )
}
