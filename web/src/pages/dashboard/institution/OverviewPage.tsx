import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import type { translations } from '@/lib/translations'

type Key = keyof typeof translations

const CARDS: { to: string; titleKey: Key; descKey: Key }[] = [
  { to: '/institution/consultations', titleKey: 'tab.instConsult', descKey: 'inst.consultCardDesc' },
  { to: '/institution/team', titleKey: 'tab.instTeam', descKey: 'inst.teamCardDesc' },
  { to: '/institution/account', titleKey: 'tab.myAccount', descKey: 'inst.accountCardDesc' },
]

export function InstitutionOverviewPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">
        {t('inst.welcome', { name: profile?.name ?? '' })}
      </div>
      <div className="mb-6 text-[14px] leading-7 text-muted">{t('inst.intro')}</div>

      <div className="mb-3 text-[14px] font-semibold text-navy">{t('inst.quickActions')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group rounded-xl border border-border bg-white p-5 no-underline transition-colors hover:border-navy"
          >
            <div className="mb-1.5 text-[15.5px] font-semibold text-navy">{t(c.titleKey)}</div>
            <div className="text-[13px] leading-6 text-muted">{t(c.descKey)}</div>
            <div className="mt-3 text-[13px] font-semibold text-gold group-hover:text-gold-hover">→</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
