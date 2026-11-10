import { Link } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n'
import { useQuery } from '@tanstack/react-query'
import { fetchSiteContent, useContentText } from '@/lib/content'
import { resolveMission, resolveSlogan, resolveVision } from '@/lib/visionMission'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { PageHero } from '@/components/PageHero'
import { Reveal } from '@/components/Reveal'
import { ExpertTeam, HowItWorks, TrustBadges } from '@/components/home/HomeExtras'

export function AboutPage() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const ct = useContentText()
  useDocumentMeta(
    'نبذة عنا | Pioneers Consulting for Training and Research',
    'تعرّف على منصة بيونيرز للأبحاث الصحية: رؤيتنا في تدريب وإشراف الباحثين، وفريقنا المتخصص.',
  )

  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const pillars = [
    { icon: '🔭', h: ar ? 'رؤيتنا' : 'Our vision', p: resolveVision(content, lang) },
    { icon: '🎯', h: ar ? 'رسالتنا' : 'Our mission', p: resolveMission(content, lang) },
    {
      icon: '🤝',
      h: ar ? 'قيمنا' : 'Our values',
      p: ar
        ? 'النزاهة العلمية، والسرية، والالتزام بالمواعيد، والشفافية مع كل عميل.'
        : 'Scientific integrity, confidentiality, punctuality, and transparency with every client.',
    },
  ]
  const slogan = resolveSlogan(content, lang)

  const credentials = ar
    ? [
        ['الكيان القانوني', 'شركة بايونيرز هيلث ريسيرتش كونسالتينج (ذات مسؤولية محدودة)'],
        ['ترخيص وزارة الاستثمار', '24926274626'],
        ['الرقم الموحّد للمنشأة', '7055175363'],
        ['المقر', 'جدة، المملكة العربية السعودية'],
      ]
    : [
        ['Legal entity', 'Pioneers Health Research Consulting (LLC)'],
        ['Ministry of Investment license', '24926274626'],
        ['Unified establishment no.', '7055175363'],
        ['Headquarters', 'Jeddah, Saudi Arabia'],
      ]

  return (
    <div>
      <PageHero eyebrow={ct('home.about.eyebrow')} title={ct('home.about.title')} />

      <div className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16">
        <Reveal>
          <p className="mx-auto mb-12 max-w-3xl text-center text-[16.5px] leading-[2.1] text-muted-2">{ct('home.about.body')}</p>
        </Reveal>

        <div className="mb-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {pillars.map((p) => (
            <Reveal key={p.h} className="rounded-2xl border border-border bg-white p-6 text-center shadow-[0_10px_30px_-20px_rgba(11,31,58,0.35)]">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-[26px]">{p.icon}</div>
              <h3 className="mb-2 text-[17px] font-bold text-navy">{p.h}</h3>
              <p className="text-[14px] leading-7 text-muted">{p.p}</p>
            </Reveal>
          ))}
        </div>
        <div className="-mt-8 mb-14 text-center">
          <span className="inline-block rounded-full bg-gold/15 px-5 py-2 font-heading text-[16px] font-bold text-navy">{slogan}</span>
        </div>

        {/* Official credentials */}
        <Reveal className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-[#14335c] p-7 text-white md:p-9">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c9a24b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <div>
              <div className="font-heading text-[20px] font-bold">{ar ? 'جهة رسمية مرخّصة' : 'An officially licensed company'}</div>
              <div className="text-[13px] text-white/65">{ar ? 'تعمل وفق أنظمة المملكة العربية السعودية' : 'Operating under the laws of Saudi Arabia'}</div>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {credentials.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/[0.06] px-4 py-3">
                <dt className="text-[12px] text-white/55">{k}</dt>
                <dd className="mt-0.5 text-[14.5px] font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      <TrustBadges />
      <ExpertTeam />
      <HowItWorks />

      <div className="px-4 py-14 text-center md:px-16">
        <h2 className="font-heading mb-3 text-[24px] font-bold text-navy md:text-[28px]">{ar ? 'جاهز تبدأ بحثك معنا؟' : 'Ready to start your research with us?'}</h2>
        <p className="mb-6 text-[15px] text-muted">{ar ? 'أرسل تفاصيل طلبك ونرسل لك عرضًا وخطة تناسبك.' : 'Send your request details and we’ll send a tailored quote and plan.'}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/quote" className="rounded-full bg-gold px-7 py-3 text-[15px] font-bold text-navy no-underline">
            {ar ? 'اطلب عرض سعر' : 'Get a quote'}
          </Link>
          <Link to="/services" className="rounded-full border border-navy px-7 py-3 text-[15px] font-bold text-navy no-underline">
            {ar ? 'تصفّح الخدمات' : 'Browse services'}
          </Link>
        </div>
      </div>
    </div>
  )
}
