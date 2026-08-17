import { Link } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n'
import { Reveal } from '@/components/Reveal'

/** Illustration: an individual researcher / graduate. */
function IndividualsArt() {
  return (
    <svg viewBox="0 0 160 160" className="h-28 w-28" role="img" aria-hidden="true">
      <rect width="160" height="160" rx="26" fill="#eef3f8" />
      <path d="M40 130 a40 40 0 0 1 80 0 Z" fill="#14335c" />
      <circle cx="80" cy="84" r="26" fill="#1c4577" />
      <polygon points="80,42 126,60 80,78 34,60" fill="#0b1f3a" />
      <circle cx="80" cy="60" r="4.5" fill="#c9a24b" />
      <path d="M118 62 v18" stroke="#c9a24b" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="118" cy="84" r="4.5" fill="#c9a24b" />
      <circle cx="80" cy="82" r="10" fill="#3cd496" opacity="0.9" />
    </svg>
  )
}

/** Illustration: an institution / university building. */
function InstitutionsArt() {
  return (
    <svg viewBox="0 0 160 160" className="h-28 w-28" role="img" aria-hidden="true">
      <rect width="160" height="160" rx="26" fill="#eef3f8" />
      <rect x="77" y="22" width="4" height="16" fill="#c9a24b" />
      <polygon points="81,22 98,28 81,34" fill="#c9a24b" />
      <polygon points="80,38 132,66 28,66" fill="#0b1f3a" />
      <rect x="32" y="66" width="96" height="11" rx="2" fill="#14335c" />
      <g fill="#1c4577">
        <rect x="42" y="80" width="13" height="40" rx="1.5" />
        <rect x="64" y="80" width="13" height="40" rx="1.5" />
        <rect x="86" y="80" width="13" height="40" rx="1.5" />
        <rect x="108" y="80" width="13" height="40" rx="1.5" />
      </g>
      <rect x="30" y="122" width="100" height="12" rx="2" fill="#0b1f3a" />
      <rect x="30" y="122" width="100" height="4" fill="#3cd496" opacity="0.85" />
    </svg>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] leading-7 text-muted-2">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
      <span>{children}</span>
    </li>
  )
}

export function AudienceSection() {
  const { t } = useLanguage()

  const cards = [
    {
      art: <IndividualsArt />,
      title: t('audience.individuals.title'),
      desc: t('audience.individuals.desc'),
      bullets: [t('audience.individuals.b1'), t('audience.individuals.b2'), t('audience.individuals.b3')],
      cta: t('audience.individuals.cta'),
      to: '/register',
    },
    {
      art: <InstitutionsArt />,
      title: t('audience.institutions.title'),
      desc: t('audience.institutions.desc'),
      bullets: [t('audience.institutions.b1'), t('audience.institutions.b2'), t('audience.institutions.b3')],
      cta: t('audience.institutions.cta'),
      to: '/register-institution',
    },
  ]

  return (
    <div id="audience" className="bg-bg-soft px-4 py-12 md:px-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-3 text-center text-[13px] font-semibold tracking-[2px] text-accent">
            {t('audience.eyebrow')}
          </div>
          <h2 className="font-heading mb-3 text-center text-2xl font-bold text-navy md:text-[30px]">
            {t('audience.title')}
          </h2>
          <p className="mx-auto mb-11 max-w-2xl text-center text-[15px] leading-8 text-muted">
            {t('audience.subtitle')}
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {cards.map((c) => (
            <div
              key={c.to}
              className="flex flex-col rounded-2xl border border-border bg-white p-7 transition-all duration-200 hover:-translate-y-1 hover:border-navy hover:shadow-[0_16px_36px_rgba(11,31,58,0.12)]"
            >
              <div className="mb-4 flex items-center gap-4">
                {c.art}
                <div>
                  <h3 className="font-heading text-xl font-bold text-navy">{c.title}</h3>
                  <p className="mt-1 text-[13.5px] leading-6 text-muted">{c.desc}</p>
                </div>
              </div>
              <ul className="mb-6 flex flex-1 flex-col gap-2">
                {c.bullets.map((b, i) => (
                  <Bullet key={i}>{b}</Bullet>
                ))}
              </ul>
              <Link
                to={c.to}
                className="rounded-md bg-navy py-3 text-center text-[14px] font-semibold text-white no-underline hover:bg-navy-hover"
              >
                {c.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
