import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyTestimonials, submitTestimonial } from '@/lib/testimonials'

/**
 * Asks a customer whose request was delivered for a short review. It is saved
 * hidden; the owner approves it before it appears on the homepage.
 */
export function ReviewPrompt() {
  const { profile } = useAuth()
  const { lang } = useLanguage()
  const tx = (a: string, e: string) => (lang === 'ar' ? a : e)
  const queryClient = useQueryClient()
  const { data: mine } = useQuery({
    queryKey: ['my-testimonials', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyTestimonials(profile!.id),
  })
  const [stars, setStars] = useState(5)
  const [subtitle, setSubtitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!profile || !mine || mine.length > 0 && !done) return null

  if (done) {
    return (
      <div className="mb-5 rounded-xl border border-success/30 bg-success/10 p-4 text-[14px] text-success">
        {tx('شكرًا لك! وصلنا تقييمك وسيظهر بعد المراجعة 🌟', 'Thank you! Your review was received and will appear after review 🌟')}
      </div>
    )
  }

  const send = async () => {
    setError('')
    if (body.trim().length < 10) {
      setError(tx('اكتب رأيك في 10 أحرف على الأقل.', 'Please write at least 10 characters.'))
      return
    }
    setBusy(true)
    try {
      // First name only, as promised in the consent line below.
      await submitTestimonial({ userId: profile.id, name: profile.name.trim().split(/\s+/)[0], subtitle, stars, body })
      setDone(true)
      void queryClient.invalidateQueries({ queryKey: ['my-testimonials', profile.id] })
    } catch {
      setError(tx('تعذر الإرسال، حاول لاحقًا.', 'Could not send, try later.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-5 rounded-2xl border border-gold/40 bg-gradient-to-l from-gold/10 to-white p-5">
      <div className="mb-1 text-[16px] font-bold text-navy">{tx('كيف كانت تجربتك معنا؟', 'How was your experience?')}</div>
      <div className="mb-3 text-[13px] text-muted">{tx('رأيك يساعد طلابًا آخرين على اتخاذ القرار.', 'Your review helps other students decide.')}</div>
      <div className="mb-3 flex gap-1" role="radiogroup" aria-label={tx('التقييم', 'Rating')}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => setStars(i)} aria-label={`${i}`} className="text-gold transition-transform hover:scale-110">
            <svg width="28" height="28" viewBox="0 0 24 24" fill={i <= stars ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
              <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
            </svg>
          </button>
        ))}
      </div>
      <input
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder={tx('تخصصك ومرحلتك (مثال: ماجستير تمريض) — اختياري', 'Your field & stage (e.g. MSc Nursing) — optional')}
        className="mb-2.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-[14px]"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={tx('اكتب رأيك بصراحة…', 'Write your honest review…')}
        className="w-full resize-y rounded-lg border border-border bg-white px-3.5 py-2.5 text-[14px]"
      />
      {error && <div className="mt-2 text-[13px] text-error">{error}</div>}
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[11.5px] text-muted">{tx('بإرسالك توافق على عرض اسمك الأول ورأيك على الموقع.', 'By sending you agree to show your name and review on the site.')}</span>
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy}
          className="shrink-0 rounded-lg bg-navy px-5 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? '...' : tx('أرسل التقييم', 'Send review')}
        </button>
      </div>
    </div>
  )
}
