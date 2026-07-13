import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'

function useTeam(t: (key: 'team.sara.role' | 'team.khalid.role' | 'team.mona.role' | 'team.faisal.role') => string) {
  return [
    { name: 'د. سارة العتيبي', role: t('team.sara.role') },
    { name: 'أ. خالد الحربي', role: t('team.khalid.role') },
    { name: 'د. منى القحطاني', role: t('team.mona.role') },
    { name: 'أ. فيصل الزهراني', role: t('team.faisal.role') },
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
  avg_rating: number
  rating_count: number
}

function useCourses() {
  return useQuery({
    queryKey: ['marketing-courses'],
    queryFn: async (): Promise<CourseCard[]> => {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('id, title, description, title_en, description_en, duration_label, price_cents, original_price_cents')
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

export function MarketingHome() {
  const { session, profile } = useAuth()
  const { t, lang } = useLanguage()
  const TEAM = useTeam(t)
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
      <div className="relative overflow-hidden px-16 pb-17.5 pt-22.5">
        <div className="absolute -left-10 top-10 h-0.5 w-85 rotate-[-18deg] bg-navy opacity-15" />
        <div className="absolute left-67.5 top-3.5 h-2.5 w-2.5 rounded-full bg-gold" />
        <div className="relative max-w-165">
          <div className="mb-4 text-[13px] font-semibold tracking-[2px] text-accent">
            TRAIN · RESEARCH · PUBLISH
          </div>
          <h1 className="font-heading mb-5.5 text-[46px] font-bold leading-[1.4] text-navy">
            {t('home.hero.title')}
          </h1>
          <p className="mb-8.5 text-lg leading-[1.9] text-muted">{t('home.hero.subtitle')}</p>
          <div className="flex gap-4">
            <Link
              to={session ? (profile?.role === 'student' ? '/student' : '/register') : '/register'}
              className="rounded-md bg-navy px-7.5 py-3.5 text-[15px] text-white no-underline hover:bg-navy-hover"
            >
              {t('home.hero.createAccount')}
            </Link>
            {!isTeacherSession && (
              <a
                href="#programs"
                className="rounded-md border border-navy px-7.5 py-3.5 text-[15px] text-navy no-underline hover:bg-bg-soft"
              >
                {t('home.hero.browsePrograms')}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-px border-y border-border bg-border">
        <div className="bg-white px-7 py-8.5 text-center">
          <div className="font-heading text-[34px] font-bold text-navy">{courses?.length ?? 0}</div>
          <div className="mt-1.5 text-[13.5px] text-muted">{t('home.stats.programs')}</div>
        </div>
        <div className="bg-white px-7 py-8.5 text-center">
          <div className="font-heading text-[34px] font-bold text-navy">4</div>
          <div className="mt-1.5 text-[13.5px] text-muted">{t('home.stats.stages')}</div>
        </div>
        <div className="bg-white px-7 py-8.5 text-center">
          <div className="font-heading text-[34px] font-bold text-navy">1:1</div>
          <div className="mt-1.5 text-[13.5px] text-muted">{t('home.stats.oneToOne')}</div>
        </div>
        <div className="bg-white px-7 py-8.5 text-center">
          <div className="font-heading text-[34px] font-bold text-gold">✓</div>
          <div className="mt-1.5 text-[13.5px] text-muted">{t('home.stats.certificate')}</div>
        </div>
      </div>

      {/* ABOUT */}
      <div id="about" className="grid grid-cols-2 items-center gap-15 px-16 py-20">
        <div>
          <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">{t('home.about.eyebrow')}</div>
          <h2 className="font-heading mb-5 text-[30px] font-bold">{t('home.about.title')}</h2>
          <p className="text-[16.5px] leading-[2] text-muted">{t('home.about.body')}</p>
        </div>
        <div className="rounded-[10px] border border-border bg-bg-soft p-9">
          <div className="font-heading mb-4.5 text-lg font-semibold">{t('home.about.teamTitle')}</div>
          {TEAM.map((member) => (
            <div key={member.name} className="flex justify-between border-b border-border py-3">
              <span className="text-[15px] font-medium">{member.name}</span>
              <span className="text-[13.5px] text-muted">{member.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PROGRAMS */}
      {!isTeacherSession && (
        <div id="programs" className="bg-bg-soft px-16 py-20">
          <div className="mb-12.5 text-center">
            <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">{t('home.programs.eyebrow')}</div>
            <h2 className="font-heading text-[30px] font-bold">{t('home.programs.title')}</h2>
          </div>
          {courses && courses.length > 0 ? (
            <div className="grid grid-cols-3 gap-6.5">
              {courses.map((c) => (
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
                    {t('home.programs.subscribe')}
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-[14.5px] text-faint">{t('home.programs.empty')}</div>
          )}
        </div>
      )}

      {/* RESOURCES */}
      <div id="resources" className="px-16 py-20">
        <div className="mb-12.5 text-center">
          <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">{t('home.resources.eyebrow')}</div>
          <h2 className="font-heading text-[30px] font-bold">{t('home.resources.title')}</h2>
        </div>
        {articles && articles.length > 0 ? (
          <div className="grid grid-cols-3 gap-6.5">
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
      <div id="contact" className="bg-navy px-16 py-20 text-white">
        <div className="mx-auto max-w-130">
          <div className="mb-9 text-center">
            <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-gold">{t('home.contact.eyebrow')}</div>
            <h2 className="font-heading text-[28px] font-bold">{t('home.contact.title')}</h2>
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
