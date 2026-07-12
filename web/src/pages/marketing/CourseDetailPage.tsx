import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

function formatSar(cents: number) {
  return `${(cents / 100).toLocaleString('ar-SA')} ريال`
}

interface CourseDetail {
  id: string
  title: string
  description: string
  duration_label: string
  price_cents: number
  original_price_cents: number | null
  image_url: string | null
  avg_rating: number
  rating_count: number
}

function useCourseDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['course-detail', id],
    enabled: !!id,
    queryFn: async (): Promise<CourseDetail | null> => {
      const { data: course, error } = await supabase
        .from('courses')
        .select('id, title, description, duration_label, price_cents, original_price_cents, image_url')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      if (!course) return null

      const { data: stats } = await supabase
        .from('course_stats')
        .select('avg_rating, rating_count')
        .eq('course_id', id!)
        .maybeSingle()

      return { ...course, avg_rating: Number(stats?.avg_rating ?? 0), rating_count: stats?.rating_count ?? 0 }
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

export function CourseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session, profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: course, isLoading } = useCourseDetail(id)
  const { data: myRating } = useMyRating(id, profile?.role === 'student' ? profile.id : undefined)
  const [comingSoon, setComingSoon] = useState(false)

  const rate = async (stars: number) => {
    if (!session || profile?.role !== 'student') {
      navigate('/login')
      return
    }
    await supabase.from('course_ratings').upsert({ course_id: id!, student_id: profile.id, stars })
    queryClient.invalidateQueries({ queryKey: ['course-my-rating', id, profile.id] })
    queryClient.invalidateQueries({ queryKey: ['course-detail', id] })
  }

  const subscribe = () => {
    if (!session) {
      navigate('/login', { state: { resumeSubscribeCourseId: id } })
      return
    }
    if (profile?.role === 'teacher') return
    setComingSoon(true)
  }

  if (isLoading) return <div className="px-16 py-20 text-center text-muted">...</div>
  if (!course) {
    return (
      <div className="px-16 py-20 text-center">
        <div className="mb-4 text-muted">لم يتم العثور على هذا البرنامج.</div>
        <Link to="/" className="text-navy no-underline">
          → رجوع للرئيسية
        </Link>
      </div>
    )
  }

  return (
    <div className="px-16 py-20">
      <Link to="/#programs" className="mb-5 inline-block text-[13px] text-muted no-underline">
        → رجوع للبرامج
      </Link>
      <div className="mx-auto max-w-160 rounded-[10px] border border-border bg-white p-9">
        {course.image_url && (
          <img
            src={course.image_url}
            className="mb-5.5 block aspect-[1.8] w-full rounded-lg object-cover"
            alt=""
          />
        )}
        <h2 className="font-heading mb-3.5 text-[26px] font-bold text-navy">{course.title}</h2>
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
            {course.avg_rating.toFixed(1)} ({course.rating_count} تقييم)
          </span>
        </div>
        <p className="mb-6 text-[15.5px] leading-[2] text-muted-2">{course.description}</p>
        <div className="mb-5.5 flex items-center justify-between border-y border-border-2 py-4.5">
          <div className="text-sm font-semibold text-accent">{course.duration_label}</div>
          <div>
            {course.original_price_cents && course.original_price_cents > course.price_cents && (
              <span className="ml-2.5 text-sm text-faint line-through">
                {formatSar(course.original_price_cents)}
              </span>
            )}
            <span className="text-xl font-bold text-navy">{formatSar(course.price_cents)}</span>
          </div>
        </div>
        <div className="mb-5.5 flex gap-1.5" title="قيّم البرنامج">
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
          <button
            onClick={subscribe}
            className="w-full rounded-md bg-navy py-4 text-[15px] font-semibold text-white hover:bg-navy-hover"
          >
            اشتراك ودفع {formatSar(course.price_cents)}
          </button>
        )}
        {comingSoon && (
          <div className="mt-3 text-center text-[13px] text-muted">
            الدفع الإلكتروني قيد التفعيل — سيتوفر قريبًا.
          </div>
        )}
      </div>
    </div>
  )
}
