import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

const TEAM = [
  { name: 'د. سارة العتيبي', role: 'مديرة البرامج الأكاديمية' },
  { name: 'أ. خالد الحربي', role: 'مشرف تدريب الباحثين' },
  { name: 'د. منى القحطاني', role: 'استشارية إحصاء وتحليل بيانات' },
  { name: 'أ. فيصل الزهراني', role: 'منسق المحتوى العلمي' },
]

function formatSar(cents: number) {
  return `${(cents / 100).toLocaleString('ar-SA')} ريال`
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
        .select('id, title, description, duration_label, price_cents, original_price_cents')
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
        .select('id, title, content, image_url, likes_count, author:profiles!articles_author_id_fkey(name), article_comments(count)')
        .order('created_at', { ascending: false })
        .limit(3)
      if (error) throw error
      return (data ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
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
      setContactError('يرجى تعبئة جميع الحقول')
      return
    }
    const { error } = await supabase.from('contact_messages').insert({
      name: contactName.trim(),
      email: contactEmail.trim(),
      message: contactMessage.trim(),
    })
    if (error) {
      setContactError('تعذر إرسال الرسالة، حاول مجددًا')
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
            نُعلّم طلاب اليوم كيف يبنون بحثًا علميًا سليمًا
          </h1>
          <p className="mb-8.5 text-lg leading-[1.9] text-muted">
            من صياغة السؤال البحثي إلى التحليل والنشر — برنامج تدريبي متكامل بإشراف مباشر من مدربين متخصصين.
          </p>
          <div className="flex gap-4">
            <Link
              to={session ? (profile?.role === 'student' ? '/student' : '/register') : '/register'}
              className="rounded-md bg-navy px-7.5 py-3.5 text-[15px] text-white no-underline hover:bg-navy-hover"
            >
              إنشاء حساب طالب
            </Link>
            {!isTeacherSession && (
              <a
                href="#programs"
                className="rounded-md border border-navy px-7.5 py-3.5 text-[15px] text-navy no-underline hover:bg-bg-soft"
              >
                استعرض البرامج
              </a>
            )}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-px border-y border-border bg-border">
        <div className="bg-white px-7 py-8.5 text-center">
          <div className="font-heading text-[34px] font-bold text-navy">{courses?.length ?? 0}</div>
          <div className="mt-1.5 text-[13.5px] text-muted">برامج تدريبية متخصصة</div>
        </div>
        <div className="bg-white px-7 py-8.5 text-center">
          <div className="font-heading text-[34px] font-bold text-navy">4</div>
          <div className="mt-1.5 text-[13.5px] text-muted">مراحل إشراف من الفكرة للنشر</div>
        </div>
        <div className="bg-white px-7 py-8.5 text-center">
          <div className="font-heading text-[34px] font-bold text-navy">1:1</div>
          <div className="mt-1.5 text-[13.5px] text-muted">إشراف فردي من مدرب مختص</div>
        </div>
        <div className="bg-white px-7 py-8.5 text-center">
          <div className="font-heading text-[34px] font-bold text-gold">✓</div>
          <div className="mt-1.5 text-[13.5px] text-muted">شهادة إتمام لكل برنامج</div>
        </div>
      </div>

      {/* ABOUT */}
      <div id="about" className="grid grid-cols-2 items-center gap-15 px-16 py-20">
        <div>
          <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">من نحن</div>
          <h2 className="font-heading mb-5 text-[30px] font-bold">منصة تدريب تأخذك خطوة بخطوة</h2>
          <p className="text-[16.5px] leading-[2] text-muted">
            Pioneers for Research منصة تدريب متخصصة لطلاب الجامعات والدراسات العليا، تغطي رحلة البحث العلمي كاملة:
            صياغة السؤال البحثي، تصميم أدوات جمع البيانات، التحليل الإحصائي، والكتابة الأكاديمية — بإشراف مباشر
            ومتابعة مستمرة حتى إنجاز ورقة بحثية جاهزة للنشر.
          </p>
        </div>
        <div className="rounded-[10px] border border-border bg-bg-soft p-9">
          <div className="font-heading mb-4.5 text-lg font-semibold">فريق العمل</div>
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
            <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">البرامج</div>
            <h2 className="font-heading text-[30px] font-bold">برامجنا التدريبية</h2>
          </div>
          {courses && courses.length > 0 ? (
            <div className="grid grid-cols-3 gap-6.5">
              {courses.map((c) => (
                <div key={c.id} className="rounded-[10px] border border-border bg-white p-7">
                  <h3 className="mb-3 text-lg text-navy">{c.title}</h3>
                  <p className="mb-4 text-[14.5px] leading-[1.9] text-muted">{c.description}</p>
                  <div className="mb-3 flex items-center gap-2">
                    <Stars avg={c.avg_rating} />
                    <span className="text-[12.5px] text-muted">
                      {c.avg_rating.toFixed(1)} ({c.rating_count})
                    </span>
                  </div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-[13px] font-semibold text-accent">{c.duration_label}</div>
                    <div>
                      {c.original_price_cents && c.original_price_cents > c.price_cents && (
                        <span className="ml-2 text-[13px] text-faint line-through">
                          {formatSar(c.original_price_cents)}
                        </span>
                      )}
                      <span className="text-[15px] font-bold text-navy">{formatSar(c.price_cents)}</span>
                    </div>
                  </div>
                  <Link
                    to={`/course/${c.id}`}
                    className="block w-full rounded-md bg-navy py-2.75 text-center text-[13.5px] font-semibold text-white no-underline hover:bg-navy-hover"
                  >
                    اشترك الآن
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-[14.5px] text-faint">لا توجد برامج منشورة بعد.</div>
          )}
        </div>
      )}

      {/* RESOURCES */}
      <div id="resources" className="px-16 py-20">
        <div className="mb-12.5 text-center">
          <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-accent">الموارد</div>
          <h2 className="font-heading text-[30px] font-bold">مقالات وموارد</h2>
        </div>
        {articles && articles.length > 0 ? (
          <div className="grid grid-cols-3 gap-6.5">
            {articles.map((a) => (
              <div key={a.id} className="flex flex-col rounded-[10px] border border-border p-6.5">
                {a.image_url && (
                  <img src={a.image_url} className="mb-4 block aspect-[1.8] w-full rounded-lg object-cover" alt="" />
                )}
                <div className="mb-2.5 text-[12.5px] font-semibold text-accent">بقلم {a.author_name}</div>
                <h3 className="mb-2.5 text-[16.5px] leading-[1.6] text-navy">{a.title}</h3>
                <p className="mb-4 flex-1 text-[13.5px] leading-[1.8] text-muted">{a.content.slice(0, 140)}</p>
                <div className="flex items-center justify-between">
                  <Link
                    to={`/article/${a.id}`}
                    className="rounded-md border border-navy px-4 py-1.75 text-[13px] text-navy no-underline hover:bg-bg-soft"
                  >
                    قراءة المقال
                  </Link>
                  <div className="flex gap-2.5 text-xs text-muted">
                    <span>{a.likes_count} إعجاب</span>
                    <span>{a.comments_count} تعليق</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-[14.5px] text-faint">لا توجد مقالات منشورة بعد.</div>
        )}
      </div>

      {/* CONTACT */}
      <div id="contact" className="bg-navy px-16 py-20 text-white">
        <div className="mx-auto max-w-130">
          <div className="mb-9 text-center">
            <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-gold">تواصل معنا</div>
            <h2 className="font-heading text-[28px] font-bold">لديك سؤال؟ راسلنا</h2>
          </div>
          {contactSubmitted ? (
            <div className="rounded-lg border border-white/20 bg-white/8 p-6 text-center text-[15px]">
              تم إرسال رسالتك، سنعاود التواصل خلال يومي عمل.
            </div>
          ) : (
            <form onSubmit={submitContact} className="flex flex-col gap-3.5">
              <input
                type="text"
                placeholder="الاسم"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="rounded-md border border-white/30 bg-white/5 px-4 py-3.25 text-[14.5px] text-white placeholder:text-white/60"
              />
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="rounded-md border border-white/30 bg-white/5 px-4 py-3.25 text-[14.5px] text-white placeholder:text-white/60"
              />
              <textarea
                placeholder="رسالتك"
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
                إرسال
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
