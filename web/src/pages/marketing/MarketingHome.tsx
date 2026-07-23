import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { useContentText } from '@/lib/content'
import { listServices, type Service } from '@/lib/services'
import { listTeamMembers } from '@/lib/team'

type TeamEntry = { name: string; role: string; bio: string }

// Team comes from the admin-managed table; until the owner adds members, we
// fall back to the original four so the section is never empty.
function useTeam(lang: 'ar' | 'en', t: (key: 'team.sara.role' | 'team.khalid.role' | 'team.mona.role' | 'team.faisal.role') => string): TeamEntry[] {
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

function formatSar(cents: number, t: ReturnType<typeof useLanguage>['t']) {
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

interface CourseCard {
  id: string
  title: string
  description: string
  title_en: string | null
  description_en: string | null
  duration_label: string
  price_cents: number
  original_price_cents: number | null
  kind: 'course' | 'program'
  avg_rating: number
  rating_count: number
}

function useCourses() {
  return useQuery({
    queryKey: ['marketing-courses'],
    queryFn: async (): Promise<CourseCard[]> => {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('id, title, description, title_en, description_en, duration_label, price_cents, original_price_cents, kind')
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
function OfferingSection({
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
            <div key={c.id} className="rounded-[10px] border border-border bg-white p-7">
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
                  {c.original_price_cents && c.original_price_cents > c.price_cents && (
                    <span className="ml-2 text-[13px] text-faint line-through">
                      {formatSar(c.original_price_cents, t)}
                    </span>
                  )}
                  <span className="text-[15px] font-bold text-navy">{formatSar(c.price_cents, t)}</span>
                </div>
              </div>
              <Link
                to={`/course/${c.id}`}
                className="block w-full rounded-md bg-navy py-2.75 text-center text-[13.5px] font-semibold text-white no-underline hover:bg-navy-hover"
              >
                {ctaLabel}
              </Link>
            </div>
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
function ServicesSection() {
  const { t, lang } = useLanguage()
  const ct = useContentText()
  const { data: services } = useQuery({ queryKey: ['marketing-services'], queryFn: listServices })

  const fromPrice = (s: Service) => {
    const prices = s.packages.filter((p) => !p.is_custom && p.price_cents != null).map((p) => p.price_cents!)
    return prices.length > 0 ? Math.min(...prices) : null
  }

  return (
    <div id="services" className="px-4 py-12 md:px-16 md:py-20">
      <div className="mb-12.5 text-center">
        <h2 className="font-heading text-2xl font-bold md:text-[30px]">{ct('home.services.title')}</h2>
      </div>
      {services && services.length > 0 ? (
        <div className="grid grid-cols-1 gap-6.5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const min = fromPrice(s)
            return (
              <div key={s.id} className="flex flex-col rounded-[10px] border border-border bg-white p-7">
                <h3 className="mb-3 text-lg text-navy">{lang === 'en' ? s.title_en || s.title : s.title}</h3>
                <p className="mb-4 flex-1 text-[14.5px] leading-[1.9] text-muted">
                  {lang === 'en' ? s.description_en || s.description : s.description}
                </p>
                {min != null && (
                  <div className="mb-4 text-[13px] text-muted">
                    {t('home.services.from')}{' '}
                    <span className="text-[15px] font-bold text-navy">
                      {(min / 100).toLocaleString('ar-SA')} {t('course.currency')}
                    </span>
                  </div>
                )}
                <Link
                  to={`/service/${s.slug}`}
                  className="block w-full rounded-md bg-navy py-2.75 text-center text-[13.5px] font-semibold text-white no-underline hover:bg-navy-hover"
                >
                  {t('home.services.cta')}
                </Link>
              </div>
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
  const { session, profile } = useAuth()
  const { t, lang } = useLanguage()
  const ct = useContentText()
  const TEAM = useTeam(lang, t)
  const { data: courses } = useCourses()
  const { data: articles } = useArticlePreviews()
  const isTeacherSession = profile?.role === 'teacher'

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
      <div className="relative overflow-hidden px-4 pb-12 pt-14 md:px-16 md:pb-17.5 md:pt-22.5">
        <div className="absolute -left-10 top-10 hidden h-0.5 w-85 rotate-[-18deg] bg-navy opacity-15 md:block" />
        <div className="absolute left-67.5 top-3.5 hidden h-2.5 w-2.5 rounded-full bg-gold md:block" />
        <div className="relative max-w-165">
          <div className="mb-4 text-[13px] font-semibold tracking-[2px] text-accent">
            TRAIN · RESEARCH · PUBLISH
          </div>
          <h1 className="font-heading mb-5.5 text-[28px] font-bold leading-[1.4] text-navy md:text-[46px]">
            {ct('home.hero.title')}
          </h1>
          <p className="mb-8.5 text-base leading-[1.9] text-muted md:text-lg">{ct('home.hero.subtitle')}</p>
          <div className="flex flex-wrap gap-4">
                        <Link
              to={
                session
                  ? profile?.role === 'teacher'
                    ? '/teacher'
                    : profile?.role === 'owner'
                      ? '/owner'
                      : profile?.role === 'institution'
                        ? '/institution'
                        : '/student'
                  : '/login'
              }
              className="rounded-md bg-navy px-7.5 py-3.5 text-[15px] text-white no-underline hover:bg-navy-hover"
            >
              {session ? t('nav.backToDashboard') : t('nav.login')}
            </Link>
            {!isTeacherSession && (
              <a
                href="#courses"
                className="rounded-md border border-navy px-7.5 py-3.5 text-[15px] text-navy no-underline hover:bg-bg-soft"
              >
                {ct('home.hero.browsePrograms')}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-px border-y border-border bg-border md:grid-cols-4">
        <div className="bg-white px-4 py-6 text-center md:px-7 md:py-8.5">
          <div className="font-heading text-[26px] font-bold text-navy md:text-[34px]">{courses?.length ?? 0}</div>
          <div className="mt-1.5 text-[13.5px] text-muted">{ct('home.stats.programs')}</div>
        </div>
        <div className="bg-white px-4 py-6 text-center md:px-7 md:py-8.5">
          <div className="font-heading text-[26px] font-bold text-navy md:text-[34px]">4</div>
          <div className="mt-1.5 text-[13.5px] text-muted">{ct('home.stats.stages')}</div>
        </div>
        <div className="bg-white px-4 py-6 text-center md:px-7 md:py-8.5">
          <div className="font-heading text-[26px] font-bold text-navy md:text-[34px]">1:1</div>
          <div className="mt-1.5 text-[13.5px] text-muted">{ct('home.stats.oneToOne')}</div>
        </div>
        <div className="bg-white px-4 py-6 text-center md:px-7 md:py-8.5">
          <div className="font-heading text-[26px] font-bold text-gold md:text-[34px]">✓</div>
          <div className="mt-1.5 text-[13.5px] text-muted">{ct('home.stats.certificate')}</div>
        </div>
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

      {/* SERVICES */}
      {!isTeacherSession && <ServicesSection />}

      {/* RESOURCES */}
      <div id="resources" className="px-4 py-12 md:px-16 md:py-20">
        <div className="mb-12.5 text-center">
          <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">{ct('home.resources.eyebrow')}</div>
          <h2 className="font-heading text-2xl font-bold md:text-[30px]">{ct('home.resources.title')}</h2>
        </div>
        {articles && articles.length > 0 ? (
          <div className="grid grid-cols-1 gap-6.5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <div key={a.id} className="flex flex-col rounded-[10px] border border-border p-6.5">
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
                  <Link
                    to={`/article/${a.id}`}
                    className="rounded-md border border-navy px-4 py-1.75 text-[13px] text-navy no-underline hover:bg-bg-soft"
                  >
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

      {/* CONTACT */}
      <div id="contact" className="bg-navy px-4 py-12 text-white md:px-16 md:py-20">
        <div className="mx-auto max-w-130">
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
