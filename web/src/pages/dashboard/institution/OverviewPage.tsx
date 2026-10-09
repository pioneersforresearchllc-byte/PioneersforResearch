import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyConsultations } from '@/lib/institutions'
import type { translations } from '@/lib/translations'

type Key = keyof typeof translations

const CARDS: { to: string; titleKey: Key; descKey: Key; icon: string }[] = [
  { to: '/institution/trainees', titleKey: 'tab.instTrainees', descKey: 'inst.traineesCardDesc', icon: '📊' },
  { to: '/institution/consultations', titleKey: 'tab.instConsult', descKey: 'inst.consultCardDesc', icon: '📋' },
  { to: '/institution/team', titleKey: 'tab.instTeam', descKey: 'inst.teamCardDesc', icon: '👥' },
  { to: '/institution/account', titleKey: 'tab.myAccount', descKey: 'inst.accountCardDesc', icon: '⚙️' },
]

export function InstitutionOverviewPage() {
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const ar = lang === 'ar'
  const { data: consultations } = useQuery({ queryKey: ['my-consultations'], queryFn: listMyConsultations })

  const by = (s: string) => (consultations ?? []).filter((c) => c.status === s).length
  const awaitingPayment = by('awaiting_payment')
  const stats = [
    { label: ar ? 'قيد المراجعة' : 'Under review', value: by('pending'), color: 'text-accent' },
    { label: ar ? 'بانتظار الدفع' : 'Awaiting payment', value: awaitingPayment, color: 'text-gold' },
    { label: ar ? 'قيد التنفيذ' : 'In progress', value: by('in_progress'), color: 'text-navy' },
    { label: ar ? 'مكتملة' : 'Completed', value: by('done'), color: 'text-success' },
  ]

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('inst.welcome', { name: profile?.name ?? '' })}</div>
      <div className="mb-6 text-[14px] leading-7 text-muted">{t('inst.intro')}</div>

      {awaitingPayment > 0 && (
        <Link
          to="/institution/consultations"
          className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-gold bg-gold/10 px-5 py-4 no-underline"
        >
          <span className="text-[14.5px] font-semibold text-navy">
            💳 {ar ? `لديكم ${awaitingPayment} استشارة جاهزة للدفع لبدء التنفيذ` : `${awaitingPayment} consultation(s) ready for payment to start`}
          </span>
          <span className="shrink-0 rounded-lg bg-navy px-4 py-2 text-[13px] font-semibold text-white">{ar ? 'عرض' : 'View'}</span>
        </Link>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to="/institution/consultations" className="rounded-xl border border-border bg-white p-4 text-center no-underline hover:border-navy">
            <div className={`font-heading text-[26px] font-bold ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-[12.5px] text-muted">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="mb-3 text-[14px] font-semibold text-navy">{t('inst.quickActions')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group rounded-xl border border-border bg-white p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-navy"
          >
            <div className="mb-2 text-[22px]">{c.icon}</div>
            <div className="mb-1.5 text-[15.5px] font-semibold text-navy">{t(c.titleKey)}</div>
            <div className="text-[13px] leading-6 text-muted">{t(c.descKey)}</div>
            <div className="mt-3 text-[13px] font-semibold text-gold group-hover:text-gold-hover">{ar ? '←' : '→'}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
