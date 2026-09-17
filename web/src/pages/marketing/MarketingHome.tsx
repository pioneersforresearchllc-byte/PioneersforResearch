import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { useContentText } from '@/lib/content'
import { listServices, type Service } from '@/lib/services'
import { listTeamMembers } from '@/lib/team'
import { Reveal } from '@/components/Reveal'
import { SiteComments } from '@/components/SiteComments'
import { AudienceSection } from '@/components/AudienceSection'
import { buttonClasses } from '@/components/ui/Button'
import { CountUp, Magnetic } from '@/components/ui/motion'

type TeamEntry = { name: string; role: string; bio: string }

// Team comes from the admin-managed table; until the owner adds members, we
// fall back to the original four so the section is never empty.
export function useTeam(lang: 'ar' | 'en', t: (key: 'team.sara.role' | 'team.khalid.role' | 'team.mona.role' | 'team.faisal.role') => string): TeamEntry[] {
  const { data } = useQuery({ queryKey: ['team-members'], queryFn: listTeamMembers })
  if (data && data.length > 0) {
    return data.map((m) => ({
      name: m.name,
      role: (lang === 'ar' ? m.title_ar : m.title_en) ?? '',
      bio: (lang === 'ar' ? m.bio_ar : m.bio_en) ?? '',
    }))
  }
  return [
    { name: 'د. سارة العتيبي', role: t('team.sara.role'), bio: '' },
    { name: 'أ. خالد الحربي', role: t('team.khalid.role'), bio: '' },
    { name: 'د. منى القحطاني', role: t('team.mona.role'), bio: '' },
    { name: 'أ. فيصل الزهراني', role: t('team.faisal.role'), bio: '' },
  ]
}

export function formatSar(cents: number, t: ReturnType<typeof useLanguage>['t']) {
  if (cents === 0) return t('course.free')
  return `${(cents / 100).toLocaleString('ar-SA')} ${t('course.currency')}`
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

// Paid services (presentation design, data analysis…). Each card shows the
// cheapest fixed-price package as a "from" price and links to the service's
// own page, where the visitor picks a package and fills the request brief.
export function ServicesSection() {
  const { t, lang } = useLanguage()
  const ct = useContentText()
  const { data: services } = useQuery({ queryKey: ['marketing-services'], queryFn: listServices })

  // Fixed-price packages give a "from" price; otherwise the service's own
  // direct price is shown (with a struck-through original when discounted).
  const priceInfo = (s: Service) => {
    const prices = s.packages.filter((p) => !p.is_custom && p.price_cents != null).map((p) => p.price_cents!)
    if (prices.length > 0) return { from: true, price: Math.min(...prices), original: null as number | null }
    if (s.price_cents != null) return { from: false, price: s.price_cents, original: s.original_price_cents }
    return null
  }

  return (
    <div id="services" className="px-4 py-12 md:px-16 md:py-20">
      <div className="mb-12.5 text-center">
        <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">{t('home.services.eyebrow')}</div>
        <h2 className="font-heading text-2xl font-bold md:text-[30px]">{ct('home.services.title')}</h2>
      </div>
      {services && services.length > 0 ? (
        <div className="grid grid-cols-1 gap-6.5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const info = priceInfo(s)
            const discounted = info && info.original != null && info.original > info.price
            const pct = discounted ? Math.round((1 - info!.price / info!.original!) * 100) : 0
            return (
              <Reveal
                key={s.id}
                className="group flex flex-col overflow-hidden rounded-[14px] border border-border bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-navy hover:shadow-[0_18px_40px_rgba(11,31,58,0.14)]"
              >
                <div className="relative">
                  {s.image_url ? (
                    <img src={s.image_url} className="aspect-[1.9] w-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
                  ) : (
                    <div className="flex aspect-[1.9] w-full items-center justify-center bg-gradient-to-br from-[#14335c] to-[#1f8a5b] text-[38px] transition-transform duration-500 group-hover:scale-105">
                      🧩
                    </div>
                  )}
                  {discounted && (
                    <span className="absolute end-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                      −{pct}%
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-7">
                  <h3 className="mb-3 text-lg font-semibold text-navy">{lang === 'en' ? s.title_en || s.title : s.title}</h3>
                  <p className="mb-4 flex-1 text-[14.5px] leading-[1.9] text-muted">
                    {lang === 'en' ? s.description_en || s.description : s.description}
                  </p>
                  {info && (
                    <div className="mb-4 flex items-baseline gap-2">
                      {info.from && <span className="text-[12.5px] text-muted">{t('home.services.from')}</span>}
                      {discounted && <span className="text-[13px] text-faint line-through">{formatSar(info.original!, t)}</span>}
                      <span className="text-[17px] font-bold text-navy">{formatSar(info.price, t)}</span>
                    </div>
                  )}
                  <Link
                    to={`/service/${s.slug}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-2.75 text-center text-[13.5px] font-semibold text-white no-underline transition-colors hover:bg-navy-hover"
                  >
                    {t('home.services.cta')}
                    <span className="transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">←</span>
                  </Link>
                </div>
              </Reveal>
            )
          })}
        </div>
      ) : (
        <div className="text-center text-[14.5px] text-faint">{t('home.services.empty')}</div>
      )}
    </div>
  )
}

export function MarketingHome() {
  const { profile, session } = useAuth()
  const { t, lang } = useLanguage()
  const ct = useContentText()
  const TEAM = useTeam(lang, t)
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
      message: contactMessage.trim(),
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
          </div>
        </Reveal>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-px border-y border-border bg-border md:grid-cols-4">
        {[
          { icon: '📚', value: String(courses?.length ?? 0), label: ct('home.stats.programs'), gold: false },
          { icon: '🧭', value: '4', label: ct('home.stats.stages'), gold: false },
          { icon: '🧑‍🏫', value: '1:1', label: ct('home.stats.oneToOne'), gold: false },
          { icon: '🏅', value: '✓', label: ct('home.stats.certificate'), gold: true },
        ].map((s, i) => (
          <div key={i} className="bg-white px-4 py-6 text-center transition-colors hover:bg-bg-soft md:px-7 md:py-8.5">
            <div className="mb-1.5 text-[20px] md:text-[24px]">{s.icon}</div>
            <div className={`font-heading text-[26px] font-bold md:text-[34px] ${s.gold ? 'text-gold' : 'text-navy'}`}>
              {/^\d+$/.test(s.value) ? <CountUp to={Number(s.value)} /> : s.value}
            </div>
            <div className="mt-1.5 text-[13.5px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ABOUT */}
      <div id="about" className="grid grid-cols-1 items-center gap-8 px-4 py-12 md:grid-cols-2 md:gap-15 md:px-16 md:py-20">
        <div>
          <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">{ct('home.about.eyebrow')}</div>
          <h2 className="font-heading mb-5 text-2xl font-bold md:text-[30px]">{ct('home.about.title')}</h2>
          <p className="text-[16.5px] leading-[2] text-muted">{ct('home.about.body')}</p>
        </div>
        <div className="rounded-[10px] border border-border bg-bg-soft p-6 md:p-9">
          <div className="font-heading mb-4.5 text-lg font-semibold">{ct('home.about.teamTitle')}</div>
          {TEAM.map((member, i) => (
            <div key={`${member.name}-${i}`} className="border-b border-border py-3 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="break-words text-[15px] font-medium">{member.name}</span>
                <span className="break-words text-[13.5px] text-muted">{member.role}</span>
              </div>
              {member.bio && <p className="mt-1 break-words text-[12.5px] leading-6 text-muted">{member.bio}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* WHO WE SERVE — individuals & institutions */}
      {!isTeacherSession && <AudienceSection />}

      {/* SERVICES — shown first (before courses) */}
      {!isTeacherSession && <ServicesSection />}

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
