import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { fetchSiteContent, resolveWhatsapp, useContentText } from '@/lib/content'
import { listPublicTestimonials } from '@/lib/testimonials'
import { listTeamMembers } from '@/lib/team'
import { Reveal } from '@/components/Reveal'
import { CountUp } from '@/components/ui/motion'
import { buttonClasses } from '@/components/ui/Button'

type L = 'ar' | 'en'
const pick = <T,>(lang: L, ar: T, en: T) => (lang === 'ar' ? ar : en)

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-11 max-w-2xl text-center">
      <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">{eyebrow}</div>
      <h2 className="font-heading text-2xl font-bold text-navy md:text-[30px]">{title}</h2>
      {sub && <p className="mt-3 text-[15px] leading-8 text-muted">{sub}</p>}
    </div>
  )
}

const Icon = ({ d, size = 26 }: { d: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
)

// ── 1. Trust badges ──────────────────────────────────────────────────────
export function TrustBadges() {
  const { lang } = useLanguage()
  const items = [
    { icon: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>, ar: 'سرية تامة لبياناتك وبحثك', en: 'Full confidentiality' },
    { icon: <><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></>, ar: 'تعديلات ضمن نطاق طلبك', en: 'Revisions within scope' },
    { icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>, ar: 'مختصون في البحث الصحي', en: 'Health-research specialists' },
    { icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>, ar: 'خطة زمنية متفق عليها', en: 'Agreed timeline' },
  ]
  return (
    <div className="border-b border-border bg-white px-4 py-6 md:px-16">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((it, i) => (
          <Reveal key={i} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/12 text-accent">
              <Icon d={it.icon} size={22} />
            </span>
            <span className="text-[13.5px] font-semibold leading-6 text-navy md:text-[14.5px]">{pick(lang, it.ar, it.en)}</span>
          </Reveal>
        ))}
      </div>
    </div>
  )
}

// ── 2. How it works ──────────────────────────────────────────────────────
export function HowItWorks() {
  const { lang } = useLanguage()
  const steps = [
    { ar: ['أرسل طلبك', 'اختر الخدمة وأخبرنا بتخصصك ومرحلتك وموعد تسليمك.'], en: ['Send your request', 'Pick a service and tell us your field, stage and deadline.'] },
    { ar: ['استلم عرض السعر', 'نراجع طلبك ونرسل لك عرضًا مفصّلًا وخطة زمنية خلال وقت قصير.'], en: ['Get your quote', 'We review it and send a tailored quote and timeline quickly.'] },
    { ar: ['نبدأ العمل معك', 'يتابعك مختص خطوة بخطوة، وتتابع تقدّم طلبك من لوحتك.'], en: ['We start together', 'A specialist works with you step by step; track progress in your dashboard.'] },
    { ar: ['استلم وراجع', 'تستلم العمل في الموعد المتفق عليه مع شرح، وتطلب تعديلاتك ضمن النطاق.'], en: ['Receive & review', 'Get the work on the agreed date with explanations, and request in-scope revisions.'] },
  ]
  return (
    <div id="how" className="bg-bg-soft px-4 py-12 md:px-16 md:py-20">
      <SectionHead
        eyebrow={pick(lang, 'كيف نعمل', 'HOW IT WORKS')}
        title={pick(lang, 'أربع خطوات من الفكرة إلى التسليم', 'Four steps from idea to delivery')}
      />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="absolute inset-x-[12%] top-9 hidden h-0.5 bg-gradient-to-l from-gold/0 via-gold/50 to-gold/0 lg:block" aria-hidden="true" />
        {steps.map((s, i) => {
          const [h, p] = pick(lang, s.ar, s.en)
          return (
            <Reveal key={i} className="relative rounded-2xl border border-border bg-white p-6 text-center shadow-[0_10px_30px_-18px_rgba(11,31,58,0.35)]">
              <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-navy to-[#14335c] font-heading text-[26px] font-bold text-gold shadow-[0_10px_22px_-10px_rgba(11,31,58,0.7)]">
                {i + 1}
              </div>
              <h3 className="mb-2 text-[17px] font-bold text-navy">{h}</h3>
              <p className="text-[14px] leading-7 text-muted">{p}</p>
            </Reveal>
          )
        })}
      </div>
      <div className="mt-10 text-center">
        <Link to="/quote" className={buttonClasses('primary', 'lg')}>
          {pick(lang, 'اطلب عرض سعر الآن', 'Get a quote now')} <span aria-hidden>←</span>
        </Link>
      </div>
    </div>
  )
}

// ── 3. Achievement numbers (owner-entered in the content editor; hidden until set) ──
export function ProofNumbers() {
  const { lang } = useLanguage()
  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  // Numbers aren't language-specific: use whichever language field the owner filled.
  const ct = (key: string) => (content?.[key]?.[lang] || content?.[key]?.ar || content?.[key]?.en || '').trim()
  const stats = [
    { value: ct('home.proof.students'), label: pick(lang, 'طالب وباحث استفاد', 'students & researchers served') },
    { value: ct('home.proof.projects'), label: pick(lang, 'بحث ومشروع منجز', 'projects completed') },
    { value: ct('home.proof.specialties'), label: pick(lang, 'تخصص صحي', 'health specialties') },
    { value: ct('home.proof.satisfaction'), label: pick(lang, 'نسبة رضا العملاء', 'customer satisfaction') },
  ].filter((s) => s.value.trim())
  if (stats.length === 0) return null
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-navy via-[#10284a] to-[#14335c] px-4 py-12 text-white md:px-16 md:py-16">
      <div className="pointer-events-none absolute -top-20 h-72 w-72 rounded-full bg-gold/20 blur-[90px] ltr:right-0 rtl:left-0" />
      <div className={`relative mx-auto grid max-w-5xl gap-8 text-center ${stats.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : (['grid-cols-1', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3'][stats.length])}`}>
        {stats.map((s, i) => {
          const m = s.value.match(/^([^\d]*)(\d+)(.*)$/)
          return (
            <Reveal key={i}>
              <div className="font-heading text-[34px] font-bold text-gold md:text-[44px]">
                {m ? (
                  <>
                    {m[1]}
                    <CountUp to={Number(m[2])} />
                    {m[3]}
                  </>
                ) : (
                  s.value
                )}
              </div>
              <div className="mt-1 text-[14px] text-white/75">{s.label}</div>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}

// ── 4. Testimonials (approved only) ──────────────────────────────────────
export function Stars({ n, size = 16 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5 text-gold" aria-label={`${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= n ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
        </svg>
      ))}
    </span>
  )
}

export function TestimonialsSection() {
  const { lang } = useLanguage()
  const { data } = useQuery({ queryKey: ['testimonials-public'], queryFn: listPublicTestimonials })
  if (!data || data.length === 0) return null
  const avg = data.reduce((a, t) => a + t.stars, 0) / data.length
  return (
    <div id="reviews" className="px-4 py-12 md:px-16 md:py-20">
      <SectionHead
        eyebrow={pick(lang, 'آراء عملائنا', 'REVIEWS')}
        title={pick(lang, 'ماذا يقول طلابنا', 'What our students say')}
        sub={pick(lang, `متوسط التقييم ${avg.toFixed(1)} من 5 — من ${data.length} تقييم`, `Average ${avg.toFixed(1)} / 5 from ${data.length} reviews`)}
      />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {data.slice(0, 9).map((t) => (
          <Reveal key={t.id} className="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-[0_10px_30px_-20px_rgba(11,31,58,0.35)]">
            <Stars n={t.stars} />
            <p className="my-4 flex-1 text-[14.5px] leading-8 text-navy/85">“{t.body}”</p>
            <div className="flex items-center gap-3 border-t border-border pt-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-[15px] font-bold text-gold">{t.name.trim().charAt(0)}</span>
              <span className="flex flex-col">
                <span className="text-[14px] font-semibold text-navy">{t.name}</span>
                {t.subtitle && <span className="text-[12.5px] text-muted">{t.subtitle}</span>}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}

// ── 5. Expert team (real members only — hidden when none are added) ───────
export function ExpertTeam() {
  const { lang } = useLanguage()
  const ct = useContentText()
  const { data } = useQuery({ queryKey: ['team-members'], queryFn: listTeamMembers })
  if (!data || data.length === 0) return null
  return (
    <div id="team" className="bg-bg-soft px-4 py-12 md:px-16 md:py-20">
      <SectionHead eyebrow={pick(lang, 'فريق الخبراء', 'OUR EXPERTS')} title={ct('home.about.teamTitle')} />
      <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-5">
        {data.map((m) => {
          const title = (lang === 'ar' ? m.title_ar : m.title_en) || m.title_ar || ''
          const bio = (lang === 'ar' ? m.bio_ar : m.bio_en) || ''
          return (
            <Reveal key={m.id} className="group w-full max-w-[300px] overflow-hidden rounded-2xl border border-border bg-white text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-20px_rgba(11,31,58,0.45)]">
              <div className="relative h-56 overflow-hidden bg-gradient-to-br from-navy to-[#1f4a7a]">
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <span className="flex h-full items-center justify-center font-heading text-[64px] font-bold text-gold/90">{m.name.trim().charAt(0)}</span>
                )}
              </div>
              <div className="p-5">
                <div className="text-[16px] font-bold text-navy">{m.name}</div>
                {title && <div className="mt-1 text-[13px] font-semibold text-accent">{title}</div>}
                {bio && <p className="mt-2.5 text-[13px] leading-6 text-muted">{bio}</p>}
              </div>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}

// ── 6. Free consultation call-to-action ──────────────────────────────────
export function ConsultCta() {
  const { lang } = useLanguage()
  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const booking = (content?.['home.consult.bookingUrl']?.en || content?.['home.consult.bookingUrl']?.ar || '').trim()
  const wa = resolveWhatsapp(content)
  const waText = encodeURIComponent(pick(lang, 'مرحبًا، أرغب في حجز استشارة مجانية لمدة 15 دقيقة بخصوص بحثي.', 'Hello, I would like to book a free 15-minute consultation about my research.'))
  const href = booking ? booking : wa ? `https://wa.me/${wa}?text=${waText}` : '/contact'
  const external = href.startsWith('http')
  return (
    <div className="px-4 py-10 md:px-16">
      <Reveal className="relative mx-auto flex max-w-5xl flex-col items-center gap-5 overflow-hidden rounded-3xl bg-gradient-to-l from-[#c9a24b] to-[#e8c474] px-6 py-9 text-center md:flex-row md:justify-between md:px-12 md:text-start">
        <div className="pointer-events-none absolute -bottom-16 h-56 w-56 rounded-full bg-white/25 blur-3xl ltr:right-10 rtl:left-10" />
        <div className="relative">
          <div className="font-heading text-[22px] font-bold text-navy md:text-[26px]">{pick(lang, 'غير متأكد من أين تبدأ؟', 'Not sure where to start?')}</div>
          <p className="mt-1.5 text-[15px] text-navy/80">{pick(lang, 'احجز استشارة مجانية لمدة 15 دقيقة، ونرسم معك خطة بحثك.', 'Book a free 15-minute consultation and we’ll map out your research plan.')}</p>
        </div>
        {external ? (
          <a href={href} target="_blank" rel="noreferrer" className="relative shrink-0 rounded-full bg-navy px-8 py-3.5 text-[15px] font-bold text-white no-underline shadow-[0_12px_28px_-12px_rgba(11,31,58,0.8)] transition-transform hover:-translate-y-0.5">
            {pick(lang, 'احجز استشارتك المجانية', 'Book your free consultation')}
          </a>
        ) : (
          <Link to={href} className="relative shrink-0 rounded-full bg-navy px-8 py-3.5 text-[15px] font-bold text-white no-underline shadow-[0_12px_28px_-12px_rgba(11,31,58,0.8)] transition-transform hover:-translate-y-0.5">
            {pick(lang, 'احجز استشارتك المجانية', 'Book your free consultation')}
          </Link>
        )}
      </Reveal>
    </div>
  )
}

// ── 7. FAQ (+ FAQPage structured data for search engines) ────────────────
const FAQ: { ar: [string, string]; en: [string, string] }[] = [
  { ar: ['لماذا لا تظهر الأسعار على الموقع؟', 'لأن كل طلب يختلف في حجمه وتخصصه وموعد تسليمه. أرسل تفاصيل طلبك عبر «اطلب عرض سعر» أو واتساب، ونرسل لك عرضًا مفصّلًا يناسب عملك تحديدًا.'], en: ['Why aren’t prices shown?', 'Every request differs in size, field and deadline. Send your details via “Get a quote” or WhatsApp and we’ll send a quote tailored to your work.'] },
  { ar: ['هل بياناتي وبحثي في أمان؟', 'نعم. نتعامل مع ملفاتك وبياناتك بسرية تامة، ولا نشاركها مع أي طرف خارج فريق العمل المكلّف بطلبك، وفق سياسة الخصوصية ونظام حماية البيانات الشخصية.'], en: ['Is my data safe?', 'Yes. Your files and data are handled confidentially and shared only with the team working on your request, per our Privacy Policy and the PDPL.'] },
  { ar: ['كم يستغرق تنفيذ الطلب؟', 'يعتمد على نوع الخدمة وحجمها. نتفق معك على خطة زمنية واضحة قبل البدء، ونلتزم بها ما دامت المواد المطلوبة منك تصلنا في وقتها.'], en: ['How long does it take?', 'It depends on the service and scope. We agree a clear timeline before starting and keep to it as long as the materials we need from you arrive on time.'] },
  { ar: ['هل يمكن طلب تعديلات؟', 'نعم، التعديلات ضمن نطاق الطلب المتفق عليه متاحة خلال المدة المحددة في الشروط. أي متطلبات جديدة خارج النطاق تُسعَّر بعرض منفصل.'], en: ['Can I request revisions?', 'Yes — revisions within the agreed scope are available for the period set in our Terms. New requirements outside the scope are quoted separately.'] },
  { ar: ['هل الخدمة تتعارض مع النزاهة الأكاديمية؟', 'خدماتنا تدريبية وإرشادية واستشارية: نشرح ونوجّه ونراجع ونحلّل معك. وتبقى مسؤولية الالتزام بأنظمة جامعتك وطريقة استخدامك للمخرجات عليك.'], en: ['Does this conflict with academic integrity?', 'Our services are training, mentoring and consulting: we explain, guide, review and analyse with you. You remain responsible for following your institution’s rules and how you use the outputs.'] },
  { ar: ['ما طرق الدفع؟ وهل يمكن الاسترجاع؟', 'يتم الدفع إلكترونيًا أو بالتحويل البنكي بعد قبول عرض السعر. ولأن خدماتنا مخصّصة لكل عميل وتبدأ فور الدفع، فلا يوجد استرجاع بعد الدفع — التفاصيل في سياسة الاسترجاع.'], en: ['How do I pay? Are refunds possible?', 'Payment is online or by bank transfer after you accept the quote. Because services are customised and start upon payment, there are no refunds after payment — see our Refund Policy.'] },
  { ar: ['هل تقدّمون شهادات للدورات؟', 'نعم، تحصل على شهادة إتمام لكل دورة، ويمكن لأي جهة التحقق منها عبر رابط التحقق على موقعنا.'], en: ['Do courses include certificates?', 'Yes, you receive a completion certificate that anyone can verify through the verification link on our site.'] },
]

export function FaqSection() {
  const { lang } = useLanguage()
  const [open, setOpen] = useState<number | null>(0)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f[lang][0], acceptedAnswer: { '@type': 'Answer', text: f[lang][1] } })),
  }
  return (
    <div id="faq" className="px-4 py-12 md:px-16 md:py-20">
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <SectionHead eyebrow={pick(lang, 'الأسئلة الشائعة', 'FAQ')} title={pick(lang, 'إجابات لأكثر ما يُسأل عنه', 'Answers to common questions')} />
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        {FAQ.map((f, i) => {
          const [q, a] = f[lang]
          const isOpen = open === i
          return (
            <div key={i} className={`overflow-hidden rounded-2xl border bg-white transition-colors ${isOpen ? 'border-navy/30' : 'border-border'}`}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-[15px] font-semibold text-navy"
              >
                {q}
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-soft text-[18px] transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>+</span>
              </button>
              <div className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-[14.5px] leading-8 text-muted">{a}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
