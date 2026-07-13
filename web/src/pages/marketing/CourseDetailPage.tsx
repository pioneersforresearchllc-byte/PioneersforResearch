import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { enrollFree } from '@/lib/courses'
import { useLanguage } from '@/lib/i18n'

function formatSar(cents: number, t: ReturnType<typeof useLanguage>['t']) {
  if (cents === 0) return t('course.free')
  return `${(cents / 100).toLocaleString('ar-SA')} ${t('course.currency')}`
}

interface CourseDetail {
  id: string
  title: string
  description: string
  title_en: string | null
  description_en: string | null
  duration_label: string
  price_cents: number
  original_price_cents: number | null
  image_url: string | null
  capacity: number | null
  avg_rating: number
  rating_count: number
  enrolledCount: number
}

function useCourseDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['course-detail', id],
    enabled: !!id,
    queryFn: async (): Promise<CourseDetail | null> => {
      const { data: course, error } = await supabase
        .from('courses')
        .select(
          'id, title, description, title_en, description_en, duration_label, price_cents, original_price_cents, image_url, capacity',
        )
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      if (!course) return null

      const [{ data: stats }, { count: enrolledCount }] = await Promise.all([
        supabase.from('course_stats').select('avg_rating, rating_count').eq('course_id', id!).maybeSingle(),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('course_id', id!),
      ])

      return {
        ...course,
        avg_rating: Number(stats?.avg_rating ?? 0),
        rating_count: stats?.rating_count ?? 0,
        enrolledCount: enrolledCount ?? 0,
      }
    },
  })
}

function useMyRating(courseId: string | undefined, studentId: string | undefined) {
  return useQuery({
    queryKey: ['course-my-rating', courseId, studentId],
    enabled: !!courseId && !!studentId,
    queryFn: async (): Promise<number> => {
      const { data } = await supabase
        .from('course_ratings')
        .select('stars')
        .eq('course_id', courseId!)
        .eq('student_id', studentId!)
        .maybeSingle()
      return data?.stars ?? 0
    },
  })
}

function useMyEnrollment(courseId: string | undefined, studentId: string | undefined) {
  return useQuery({
    queryKey: ['course-my-enrollment', courseId, studentId],
    enabled: !!courseId && !!studentId,
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId!)
        .eq('student_id', studentId!)
        .maybeSingle()
      return !!data
    },
  })
}

export function CourseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session, profile } = useAuth()
  const { t, lang } = useLanguage()
  const queryClient = useQueryClient()
  const { data: course, isLoading } = useCourseDetail(id)
  const { data: myRating } = useMyRating(id, profile?.role === 'student' ? profile.id : undefined)
  const { data: alreadyEnrolled } = useMyEnrollment(id, profile?.role === 'student' ? profile.id : undefined)
  const [comingSoon, setComingSoon] = useState(false)
  const [enrollBusy, setEnrollBusy] = useState(false)
  const [enrollError, setEnrollError] = useState('')

  const rate = async (stars: number) => {
    if (!session || profile?.role !== 'student') {
      navigate('/login')
      return
    }
    await supabase.from('course_ratings').upsert({ course_id: id!, student_id: profile.id, stars })
    queryClient.invalidateQueries({ queryKey: ['course-my-rating', id, profile.id] })
    queryClient.invalidateQueries({ queryKey: ['course-detail', id] })
  }

  const isFull = !!course && course.capacity != null && course.enrolledCount >= course.capacity

  const subscribe = async () => {
    if (!session) {
      navigate('/login', { state: { resumeSubscribeCourseId: id } })
      return
    }
    if (profile?.role !== 'student' || !course) return

    if (course.price_cents === 0) {
      if (isFull) return
      setEnrollBusy(true)
      setEnrollError('')
      try {
        await enrollFree(course.id, profile.id)
        await queryClient.invalidateQueries({ queryKey: ['course-my-enrollment', id, profile.id] })
        await queryClient.invalidateQueries({ queryKey: ['course-detail', id] })
      } catch (e) {
        setEnrollError(e instanceof Error ? e.message : t('course.enrollError'))
      } finally {
        setEnrollBusy(false)
      }
      return
    }

    setComingSoon(true)
  }

  if (isLoading) return <div className="px-4 py-12 text-center text-muted md:px-16 md:py-20">...</div>
  if (!course) {
    return (
      <div className="px-4 py-12 text-center md:px-16 md:py-20">
        <div className="mb-4 text-muted">{t('course.notFound')}</div>
        <Link to="/" className="text-navy no-underline">
          {t('course.backHome')}
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-12 md:px-16 md:py-20">
      <Link to="/#programs" className="mb-5 inline-block text-[13px] text-muted no-underline">
        {t('course.back')}
      </Link>
      <div className="mx-auto max-w-160 rounded-[10px] border border-border bg-white p-5 md:p-9">
        {course.image_url && (
          <img
            src={course.image_url}
            className="mb-5.5 block aspect-[1.8] w-full rounded-lg object-cover"
            alt=""
          />
        )}
        <h2 className="font-heading mb-3.5 text-[26px] font-bold text-navy">
          {lang === 'en' ? course.title_en || course.title : course.title}
        </h2>
        <div className="mb-4.5 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`text-[17px] ${n <= Math.round(course.avg_rating) ? 'text-gold' : 'text-border'}`}
            >
              ★
            </span>
          ))}
          <span className="text-[13px] text-muted">
            {course.avg_rating.toFixed(1)} ({t('course.ratingCount', { count: String(course.rating_count) })})
          </span>
        </div>
        <p className="mb-6 text-[15.5px] leading-[2] text-muted-2">
          {lang === 'en' ? course.description_en || course.description : course.description}
        </p>
        <div className="mb-5.5 flex flex-wrap items-center justify-between gap-2 border-y border-border-2 py-4.5">
          <div className="text-sm font-semibold text-accent">{course.duration_label}</div>
          <div className="flex flex-wrap items-center gap-3">
            {course.capacity != null && (
              <span className="text-[12.5px] text-muted">
                {t('course.seatsLeft', { count: String(Math.max(course.capacity - course.enrolledCount, 0)) })}
              </span>
            )}
            {course.original_price_cents && course.original_price_cents > course.price_cents && (
              <span className="ml-2.5 text-sm text-faint line-through">
                {formatSar(course.original_price_cents, t)}
              </span>
            )}
            <span className="text-xl font-bold text-navy">{formatSar(course.price_cents, t)}</span>
          </div>
        </div>
        <div className="mb-5.5 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              onClick={() => void rate(n)}
              className={`cursor-pointer text-xl ${n <= (myRating ?? 0) ? 'text-gold' : 'text-border'}`}
            >
              ★
            </span>
          ))}
        </div>
        {profile?.role !== 'teacher' && (
          <>
            {alreadyEnrolled ? (
              <Link
                to="/student/courses"
                className="block w-full rounded-md bg-success py-4 text-center text-[15px] font-semibold text-white no-underline hover:opacity-90"
              >
                {t('course.alreadyEnrolled')}
              </Link>
            ) : (
              <button
                onClick={() => void subscribe()}
                disabled={enrollBusy || isFull}
                className="w-full rounded-md bg-navy py-4 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
              >
                {isFull
                  ? t('course.full')
                  : course.price_cents === 0
                    ? enrollBusy
                      ? t('course.enrolling')
                      : t('course.enrollFree')
                    : t('course.subscribeAndPay', { price: formatSar(course.price_cents, t) })}
              </button>
            )}
          </>
        )}
        {enrollError && <div className="mt-3 text-center text-[13px] text-error">{enrollError}</div>}
        {comingSoon && (
          <div className="mt-3 text-center text-[13px] text-muted">{t('course.paymentComingSoon')}</div>
        )}
      </div>
    </div>
  )
}
