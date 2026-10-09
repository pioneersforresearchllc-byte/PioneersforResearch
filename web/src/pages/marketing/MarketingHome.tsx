import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { fetchSiteContent, useContentText } from '@/lib/content'
import { detailsFor, sdText } from '@/lib/serviceDetails'
import { CheckItem, DetailsDialog, lines } from '@/components/DetailsDialog'
import { listServices, type Service } from '@/lib/services'
import { listTeamMembers } from '@/lib/team'
import { Reveal } from '@/components/Reveal'
import { leadSourceLine } from '@/lib/attribution'
import {
  ConsultCta,
  ExpertTeam,
  FaqSection,
  HowItWorks,
  ProofNumbers,
  TestimonialsSection,
  TrustBadges,
  HeroTrustLine,
  HeroVisual,
} from '@/components/home/HomeExtras'
import { SiteComments } from '@/components/SiteComments'
import { AudienceSection } from '@/components/AudienceSection'
import { buttonClasses } from '@/components/ui/Button'
import { Magnetic } from '@/components/ui/motion'
import { GatedPrice } from '@/components/GatedPrice'

type TeamEntry = { name: string; role: string; bio: string }

// Team comes from the admin-managed table; empty until the owner adds members
// (callers hide the team block then).
export function useTeam(lang: 'ar' | 'en', t: (key: 'team.sara.role' | 'team.khalid.role' | 'team.mona.role' | 'team.faisal.role') => string): TeamEntry[] {
  const { data } = useQuery({ queryKey: ['team-members'], queryFn: listTeamMembers })
  if (data && data.length > 0) {
    return data.map((m) => ({
      name: m.name,
      role: (lang === 'ar' ? m.title_ar : m.title_en) ?? '',
      bio: (lang === 'ar' ? m.bio_ar : m.bio_en) ?? '',
    }))
  }
  // No placeholder people: showing invented names would mislead visitors.
  void t
  return []
}

export function formatSar(cents: number, t: ReturnType<typeof useLanguage>['t']) {
  if (cents === 0) return t('course.free')
  return <GatedPrice cents={cents} />
}

function Stars({ avg }: { avg: number }) {
  const rounded = Math.round(avg)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`text-[15px] ${n <= rounded ? 'text-gold' : 'text-border'}`}>
          ★
        </span>
      ))}
    </div>
  )
}

export interface CourseCard {
  id: string
  title: string
  description: string
  title_en: string | null
  description_en: string | null
  duration_label: string
  price_cents: number
  original_price_cents: number | null
  kind: 'course' | 'program'
  code_only: boolean
  image_url: string | null
  avg_rating: number
  rating_count: number
}

export function useCourses() {
  return useQuery({
    queryKey: ['marketing-courses'],
    queryFn: async (): Promise<CourseCard[]> => {
      const { data: courses, error } = await supabase
        .from('courses')
        // select('*') (not an explicit column list) so a not-yet-migrated
        // `code_only` column can never break this query on the live site — it's
        // simply absent (→ treated as a normal priced course) until 0045 runs.
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      if (!courses?.length) return []

      const { data: stats } = await supabase
        .from('course_stats')
        .select('course_id, avg_rating, rating_count')
        .in(
          'course_id',
          courses.map((c) => c.id),
        )
      const statsById = new Map((stats ?? []).map((s) => [s.course_id, s]))

      return courses.map((c) => ({
        ...c,
        avg_rating: Number(statsById.get(c.id)?.avg_rating ?? 0),
        rating_count: statsById.get(c.id)?.rating_count ?? 0,
      }))
    },
  })
}

interface ArticlePreview {
  id: string
  title: string
  content: string
  title_en: string | null
  content_en: string | null
  image_url: string | null
  likes_count: number
  comments_count: number
  author_name: string
}

function useArticlePreviews() {
  return useQuery({
    queryKey: ['marketing-articles'],
    queryFn: async (): Promise<ArticlePreview[]> => {
      const { data, error } = await supabase
        .from('articles')
        .select(
          'id, title, content, title_en, content_en, image_url, likes_count, author:profiles!articles_author_id_fkey(name), article_comments(count)',
        )
        .order('created_at', { ascending: false })
        .limit(3)
      if (error) throw error
      return (data ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        title_en: a.title_en,
        content_en: a.content_en,
        image_url: a.image_url,
        likes_count: a.likes_count,
        author_name: (a.author as unknown as { name: string } | null)?.name ?? '',
        comments_count: (a.article_comments as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
      }))
    },
  })
}

// Shared card grid for the two public offering sections (courses and
// programs) — both are the same underlying row type, only labelled and
// filtered differently.
export function OfferingSection({
  id,
  eyebrow,
  title,
  empty,
  ctaLabel,
  items,
  soft,
}: {
  id: string
  eyebrow?: string
  title: string
  empty: string
  ctaLabel: string
  items: CourseCard[]
  soft?: boolean
}) {
  const { t, lang } = useLanguage()
  return (
    <div id={id} className={`px-4 py-12 md:px-16 md:py-20 ${soft ? 'bg-bg-soft' : ''}`}>
      <div className="mb-12.5 text-center">
        {eyebrow && <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">{eyebrow}</div>}
        <h2 className="font-heading text-2xl font-bold md:text-[30px]">{title}</h2>
      </div>
      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-6.5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Reveal
              key={c.id}
              className="group flex flex-col overflow-hidden rounded-[14px] border border-border bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-navy hover:shadow-[0_18px_40px_rgba(11,31,58,0.14)]"
            >
              {c.image_url ? (
                <img src={c.image_url} className="aspect-[1.9] w-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
              ) : (
                <div className="flex aspect-[1.9] w-full items-center justify-center bg-gradient-to-br from-navy via-[#14335c] to-[#1c4577] text-[38px] transition-transform duration-500 group-hover:scale-105">
                  {c.kind === 'program' ? '🎓' : '📘'}
                </div>
              )}
              <div className="flex flex-1 flex-col p-7">
              <h3 className="mb-3 text-lg text-navy">{lang === 'en' ? c.title_en || c.title : c.title}</h3>
              <p className="mb-4 text-[14.5px] leading-[1.9] text-muted">
                {lang === 'en' ? c.description_en || c.description : c.description}
              </p>
              <div className="mb-3 flex items-center gap-2">
                <Stars avg={c.avg_rating} />
                <span className="text-[12.5px] text-muted">
                  {c.avg_rating.toFixed(1)} ({t('course.ratingCount', { count: String(c.rating_count) })})
                </span>
              </div>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-[13px] font-semibold text-accent">{c.duration_label}</div>
                <div>
                  {c.code_only ? (
                    <span className="rounded-full bg-navy/10 px-2.5 py-1 text-[12px] font-semibold text-navy">
                      {t('course.codeOnlyBadge')}
                    </span>
                  ) : (
                    <>
                      {c.original_price_cents && c.original_price_cents > c.price_cents && (
                        <span className="ml-2 text-[13px] text-faint line-through">
                          {formatSar(c.original_price_cents, t)}
                        </span>
                      )}
                      <span className="text-[15px] font-bold text-navy">{formatSar(c.price_cents, t)}</span>
                    </>
                  )}
                </div>
              </div>
              <Link to={`/course/${c.id}`} className={buttonClasses('primary', 'md', 'mt-auto w-full')}>
                {ctaLabel}
                <span aria-hidden className="transition-transform duration-200 group-hover:-translate-x-1 rtl:group-hover:translate-x-1">←</span>
              </Link>
              </div>
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="text-center text-[14.5px] text-faint">{empty}</div>
      )}
    </div>
  )
}

// Paid services (data analysis, proposals…). Same card structure as the
// institution packages: numbered navy header, who-it's-for line, first scope
// items, price box, and a "Details" window (owner-editable content, see
// lib/serviceDetails) plus the request button to the service's own page.
export function ServicesSection() {
  const { t, lang } = useLanguage()
  const ar = lang === 'ar'
  const tx = (a: string, e: string) => (ar ? a : e)
  const ct = useContentText()
  const { data: services } = useQuery({ queryKey: ['marketing-services'], queryFn: listServices })
  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const [openId, setOpenId] = useState<string | null>(null)

  // Fixed-price packages give a "from" price; otherwise the service's own
  // direct price is shown (with a struck-through original when discounted).
  const priceInfo = (s: Service) => {
    const prices = s.packages.filter((p) => !p.is_custom && p.price_cents != null).map((p) => p.price_cents!)
    if (prices.length > 0) return { from: true, price: Math.min(...prices), original: null as number | null }
    if (s.price_cents != null) return { from: false, price: s.price_cents, original: s.original_price_cents }
    return null
  }
  // JSX, not a template string: formatSar renders the Riyal symbol as an element.
  const priceLabel = (s: Service) => {
    const from = detailsFor(content, s)?.price_from
    if (from)
      return (
        <>
          {t('home.services.from')} {formatSar(from * 100, t)}
        </>
      )
    const info = s.hide_price ? null : priceInfo(s)
    if (!info) return t('home.services.onRequest')
    return (
      <>
        {info.from ? `${t('home.services.from')} ` : ''}
        {formatSar(info.price, t)}
      </>
    )
  }

  const list = services ?? []
  const openIndex = list.findIndex((s) => s.id === openId)
  const open = openIndex >= 0 ? list[openIndex] : null
  const openDetails = open ? detailsFor(content, open) : null

  return (
    <div id="services" className="px-4 py-12 md:px-16 md:py-20">
      <div className="mb-12.5 text-center">
        <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">{t('home.services.eyebrow')}</div>
        <h2 className="font-heading text-2xl font-bold md:text-[30px]">{ct('home.services.title')}</h2>
      </div>
      {list.length > 0 ? (
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s, i) => {
            const info = s.hide_price ? null : priceInfo(s)
            const discounted = info && info.original != null && info.original > info.price
            const pct = discounted ? Math.round((1 - info!.price / info!.original!) * 100) : 0
            const d = detailsFor(content, s)
            const duration = d ? sdText(d, 'duration', ar) : ''
            const audience = d ? sdText(d, 'audience', ar) : ''
            const scope = d ? lines(sdText(d, 'features', ar)).slice(0, 4) : []
            return (
              <Reveal
                key={s.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_10px_30px_-22px_rgba(11,31,58,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-navy/40 hover:shadow-[0_18px_40px_-20px_rgba(11,31,58,0.4)]"
              >
                {/* Formal header (no image — service images carried Arabic-only text). */}
                <div className="bg-navy px-5 pb-4 pt-5 text-white">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-heading text-[13px] font-bold tracking-[2px] text-gold" dir="ltr">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {discounted && <span className="rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-navy">−{pct}%</span>}
                  </div>
                  <h3 className="font-heading text-[18px] font-bold leading-snug">{ar ? s.title : s.title_en || s.title}</h3>
                  {duration && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-white/75">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                      {duration}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {d ? (
                    <>
                      {audience && <p className="mb-4 border-b border-border pb-4 text-[13.5px] leading-7 text-muted">{audience}</p>}
                      <ul className="mb-5 flex flex-1 flex-col gap-2.5">
                        {scope.map((f) => (
                          <CheckItem key={f}>{f}</CheckItem>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="mb-4 line-clamp-4 flex-1 text-[14px] leading-7 text-muted">{ar ? s.description : s.description_en || s.description}</p>
                  )}
                  <div className="mb-4 rounded-xl bg-bg-soft px-4 py-3 text-center">
                    {d?.price_from ? (
                      <>
                        <div className="text-[11.5px] text-muted">{t('home.services.from')}</div>
                        <div className="font-heading text-[18px] font-bold text-navy">{formatSar(d.price_from * 100, t)}</div>
                      </>
                    ) : info ? (
                      <>
                        <div className="text-[11.5px] text-muted">{info.from ? t('home.services.from') : tx('السعر', 'Price')}</div>
                        <div className="flex items-baseline justify-center gap-2">
                          {discounted && <span className="text-[13px] text-faint line-through">{formatSar(info.original!, t)}</span>}
                          <span className="font-heading text-[18px] font-bold text-navy">{formatSar(info.price, t)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[11.5px] text-muted">{tx('التسعير', 'Pricing')}</div>
                        <div className="text-[14.5px] font-bold text-navy">{t('home.services.onRequest')}</div>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {d ? (
                      <button
                        type="button"
                        onClick={() => setOpenId(s.id)}
                        className="rounded-lg border border-navy py-2.5 text-center text-[14px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
                      >
                        {tx('تفاصيل الخدمة', 'Service details')}
                      </button>
                    ) : (
                      <Link
                        to={`/quote?service=${encodeURIComponent(s.slug)}`}
                        className="rounded-lg border border-navy py-2.5 text-center text-[14px] font-bold text-navy no-underline transition-colors hover:bg-navy hover:text-white"
                      >
                        {tx('اطلب عرض سعر', 'Request a quote')}
                      </Link>
                    )}
                    <Link
                      to={`/service/${s.slug}`}
                      className="rounded-lg bg-navy py-2.5 text-center text-[14px] font-bold text-white no-underline transition-colors hover:bg-navy-hover"
                    >
                      {t('home.services.cta')}
                    </Link>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      ) : (
        <div className="text-center text-[14.5px] text-faint">{t('home.services.empty')}</div>
      )}
      {open && openDetails && (
        <DetailsDialog
          index={openIndex}
          title={ar ? open.title : open.title_en || open.title}
          subtitle={sdText(openDetails, 'audience', ar)}
          facts={[
            { k: tx('المدة', 'Duration'), v: sdText(openDetails, 'duration', ar) },
            { k: tx('طريقة التقديم', 'Delivery'), v: sdText(openDetails, 'format', ar) },
            { k: tx('التسعير', 'Pricing'), v: priceLabel(open) },
          ]}
          overviewLabel={tx('نبذة عن الخدمة', 'OVERVIEW')}
          description={sdText(openDetails, 'overview', ar) || (ar ? open.description : open.description_en || open.description)}
          blocks={[
            { icon: '📚', title: tx('ما تشمله الخدمة', 'What’s included'), text: sdText(openDetails, 'features', ar) },
            { icon: '📦', title: tx('المخرجات والتسليمات', 'Deliverables'), text: sdText(openDetails, 'deliverables', ar) },
            { icon: '🤝', title: tx('التزاماتنا', 'Our commitments'), text: sdText(openDetails, 'our_commitments', ar), tone: 'navy' },
            { icon: '🎓', title: tx('التزاماتك', 'Your commitments'), text: sdText(openDetails, 'client_commitments', ar), tone: 'navy' },
            { icon: '📄', title: tx('الشروط والأحكام', 'Terms & conditions'), text: sdText(openDetails, 'terms', ar), tone: 'gold', wide: true },
          ]}
          footerText={tx('نرسل لك عرض سعر وخطة زمنية تناسب طلبك قبل البدء.', 'We send you a quote and timeline for your request before starting.')}
          cta={{ label: tx('اطلب هذه الخدمة', 'Request this service'), to: `/service/${open.slug}` }}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}

export function MarketingHome() {
  const { profile, session } = useAuth()
  const { t, lang } = useLanguage()
  const ct = useContentText()
  const { data: courses } = useCourses()
  const { data: articles } = useArticlePreviews()
  const isTeacherSession = profile?.role === 'teacher'

  // Hero mouse-parallax: nudge the background orbs opposite/with the cursor.
  const orb1 = useRef<HTMLDivElement>(null)
  const orb2 = useRef<HTMLDivElement>(null)
  const onHeroMove = (e: React.MouseEvent) => {
    if (!window.matchMedia('(pointer:fine)').matches) return
    const r = e.currentTarget.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width - 0.5
    const ny = (e.clientY - r.top) / r.height - 0.5
    if (orb1.current) orb1.current.style.transform = `translate3d(${nx * 34}px, ${ny * 34}px, 0)`
    if (orb2.current) orb2.current.style.transform = `translate3d(${nx * -26}px, ${ny * -26}px, 0)`
  }
  const resetHero = () => {
    if (orb1.current) orb1.current.style.transform = ''
    if (orb2.current) orb2.current.style.transform = ''
  }

  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactError, setContactError] = useState('')
  const [contactSubmitted, setContactSubmitted] = useState(false)

  const submitContact = async (e: FormEvent) => {
    e.preventDefault()
    setContactError('')
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactError(t('home.contact.error'))
      return
    }
    const { error } = await supabase.from('contact_messages').insert({
      name: contactName.trim(),
      email: contactEmail.trim(),
      message: `${contactMessage.trim()}\n\n${leadSourceLine(lang)}`,
    })
    if (error) {
      setContactError(t('home.contact.errorSubmit'))
      return
    }
    setContactSubmitted(true)
  }

  return (
    <div>
      {/* HERO */}
      <div
        onMouseMove={onHeroMove}
        onMouseLeave={resetHero}
        className="relative overflow-hidden bg-gradient-to-b from-[#e9eef5] via-bg-soft/50 to-white px-4 pb-12 pt-14 md:px-16 md:pb-17.5 md:pt-22.5"
      >
        {/* Animated depth: soft gradient orbs that drift with the cursor. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div ref={orb1} className="absolute -top-32 transition-transform duration-300 ease-out ltr:-right-24 rtl:-left-24">
            <div className="animate-gradient h-[26rem] w-[26rem] rounded-full bg-gradient-to-br from-gold/25 via-gold/10 to-transparent blur-3xl" />
          </div>
          <div ref={orb2} className="absolute bottom-[-6rem] transition-transform duration-300 ease-out ltr:left-[-4rem] rtl:right-[-4rem]">
            <div className="animate-float h-72 w-72 rounded-full bg-gradient-to-tr from-navy/12 to-gold/10 blur-3xl" />
          </div>
        </div>
        <div className="absolute -left-10 top-10 hidden h-0.5 w-85 rotate-[-18deg] bg-navy opacity-15 md:block" />
        <div className="animate-float absolute left-67.5 top-3.5 hidden h-2.5 w-2.5 rounded-full bg-gold md:block" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <Reveal className="relative max-w-165">
          <div className="mb-4 text-[13px] font-semibold tracking-[2px] text-accent">
            TRAIN · RESEARCH · PUBLISH
          </div>
          <h1 className="font-heading mb-5.5 text-[28px] font-bold leading-[1.4] text-navy md:text-[46px]">
            {ct('home.hero.title')}
          </h1>
          <p className="mb-8 text-base leading-[1.9] text-muted md:text-lg">{ct('home.hero.subtitle')}</p>
          <div className="flex flex-wrap items-center gap-3.5">
            {!session && (
              <Magnetic>
                <Link to="/register" className={buttonClasses('primary', 'lg')}>
                  {t('nav.register')}
                </Link>
              </Magnetic>
            )}
            <Magnetic>
              <a href="#services" className={buttonClasses(session ? 'primary' : 'outline', 'lg')}>
                {t('home.hero.browse')}
                <span aria-hidden>←</span>
              </a>
            </Magnetic>
            <Magnetic>
              <Link to="/quote" className={buttonClasses('gold', 'lg')}>
                {t('quote.cta')}
              </Link>
            </Magnetic>
          </div>
          <HeroTrustLine />
        </Reveal>
        <HeroVisual />
        </div>
      </div>

      {/* TRUST BADGES */}
      <TrustBadges />

      {/* ABOUT */}
      <div id="about" className="px-4 py-12 md:px-16 md:py-20">
        <Reveal className="mx-auto max-w-3xl text-center">
          <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">{ct('home.about.eyebrow')}</div>
          <h2 className="font-heading mb-5 text-2xl font-bold md:text-[30px]">{ct('home.about.title')}</h2>
          <p className="text-[16.5px] leading-[2] text-muted">{ct('home.about.body')}</p>
        </Reveal>
      </div>

      {/* EXPERT TEAM — real members only */}
      <ExpertTeam />

      {/* WHO WE SERVE — individuals & institutions */}
      {!isTeacherSession && <AudienceSection />}

      {/* SERVICES — shown first (before courses) */}
      {!isTeacherSession && <ServicesSection />}

      {/* HOW IT WORKS */}
      {!isTeacherSession && <HowItWorks />}

      {/* ACHIEVEMENT NUMBERS (owner-entered) + TESTIMONIALS */}
      <ProofNumbers />
      <TestimonialsSection />

      {/* FREE CONSULTATION */}
      {!isTeacherSession && <ConsultCta />}

      {/* COURSES */}
      {!isTeacherSession && (
        <OfferingSection
          id="courses"
          soft
          eyebrow={ct('home.courses.eyebrow')}
          title={ct('home.courses.title')}
          empty={t('home.courses.empty')}
          ctaLabel={t('home.courses.subscribe')}
          items={(courses ?? []).filter((c) => c.kind === 'course')}
        />
      )}

      {/* RESOURCES */}
      <div id="resources" className="px-4 py-12 md:px-16 md:py-20">
        <div className="mb-12.5 text-center">
          <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">{ct('home.resources.eyebrow')}</div>
          <h2 className="font-heading text-2xl font-bold md:text-[30px]">{ct('home.resources.title')}</h2>
        </div>
        {articles && articles.length > 0 ? (
          <div className="grid grid-cols-1 gap-6.5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <div
                key={a.id}
                className="flex flex-col rounded-[10px] border border-border p-6.5 transition-all duration-200 hover:-translate-y-1 hover:border-navy hover:shadow-[0_14px_32px_rgba(11,31,58,0.12)]"
              >
                {a.image_url && (
                  <img src={a.image_url} className="mb-4 block aspect-[1.8] w-full rounded-lg object-cover" alt="" />
                )}
                <div className="mb-2.5 text-[12.5px] font-semibold text-accent">
                  {t('home.byAuthor', { name: a.author_name })}
                </div>
                <h3 className="mb-2.5 text-[16.5px] leading-[1.6] text-navy">
                  {lang === 'en' ? a.title_en || a.title : a.title}
                </h3>
                <p className="mb-4 flex-1 text-[13.5px] leading-[1.8] text-muted">
                  {(lang === 'en' ? a.content_en || a.content : a.content).slice(0, 140)}
                </p>
                <div className="flex items-center justify-between">
                  <Link to={`/article/${a.id}`} className={buttonClasses('outline', 'sm')}>
                    {t('home.resources.readArticle')}
                  </Link>
                  <div className="flex gap-2.5 text-xs text-muted">
                    <span>
                      {a.likes_count} {t('home.resources.likes')}
                    </span>
                    <span>
                      {a.comments_count} {t('home.resources.comments')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-[14.5px] text-faint">{t('home.resources.empty')}</div>
        )}
      </div>

      {/* FAQ */}
      <FaqSection />

      {/* COMMUNITY / PUBLIC COMMENTS WALL */}
      <SiteComments />

      {/* CONTACT */}
      <div id="contact" className="relative overflow-hidden bg-[#0a1c34] px-4 py-12 text-white md:px-16 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0d2748] via-[#0a1c34] to-[#050e1a]" />
        <div className="pointer-events-none absolute -top-24 h-80 w-80 rounded-full bg-gold/15 blur-[90px] ltr:right-[-4rem] rtl:left-[-4rem]" />
        <div className="pointer-events-none absolute bottom-[-8rem] h-96 w-96 rounded-full bg-[#1a3f6e]/50 blur-[110px] ltr:left-[-5rem] rtl:right-[-5rem]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative mx-auto max-w-130">
          <div className="mb-9 text-center">
            <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-gold">{ct('home.contact.eyebrow')}</div>
            <h2 className="font-heading text-2xl font-bold md:text-[28px]">{ct('home.contact.title')}</h2>
          </div>
          {contactSubmitted ? (
            <div className="rounded-lg border border-white/20 bg-white/8 p-6 text-center text-[15px]">
              {t('home.contact.success')}
            </div>
          ) : (
            <form onSubmit={submitContact} className="flex flex-col gap-3.5">
              <input
                type="text"
                placeholder={t('home.contact.namePh')}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="rounded-md border border-white/30 bg-white/5 px-4 py-3.25 text-[14.5px] text-white placeholder:text-white/60"
              />
              <input
                type="email"
                placeholder={t('home.contact.emailPh')}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="rounded-md border border-white/30 bg-white/5 px-4 py-3.25 text-[14.5px] text-white placeholder:text-white/60"
              />
              <textarea
                placeholder={t('home.contact.messagePh')}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={4}
                className="resize-y rounded-md border border-white/30 bg-white/5 px-4 py-3.25 text-[14.5px] text-white placeholder:text-white/60"
              />
              {contactError && <div className="text-[13.5px] text-[#e8b4ac]">{contactError}</div>}
              <button
                type="submit"
                className="rounded-md bg-gold py-3.25 text-[15px] font-semibold text-navy hover:bg-gold-light"
              >
                {t('home.contact.send')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
