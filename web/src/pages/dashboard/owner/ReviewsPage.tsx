import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import {
  createTestimonial,
  deleteTestimonial,
  listAllTestimonials,
  setTestimonialApproved,
} from '@/lib/testimonials'
import { listReferrals } from '@/lib/referral'
import { Stars } from '@/components/home/HomeExtras'
import { LoadingState } from '@/components/LoadingState'

/** Owner: approve/hide customer reviews, add reviews received elsewhere, see referrals. */
export function OwnerReviewsPage() {
  const { lang } = useLanguage()
  const tx = (a: string, e: string) => (lang === 'ar' ? a : e)
  const queryClient = useQueryClient()
  const { data: reviews, isLoading, error } = useQuery({ queryKey: ['testimonials-admin'], queryFn: listAllTestimonials })
  const { data: referrals } = useQuery({ queryKey: ['referrals-admin'], queryFn: listReferrals })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['testimonials-admin'] })
    void queryClient.invalidateQueries({ queryKey: ['testimonials-public'] })
  }

  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [stars, setStars] = useState(5)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const add = async () => {
    if (!name.trim() || !body.trim()) return
    setBusy(true)
    try {
      await createTestimonial({ name, subtitle, stars, body, approved: true })
      setName('')
      setSubtitle('')
      setBody('')
      setStars(5)
      refresh()
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full rounded-md border border-border bg-white px-3 py-2 text-[13.5px]'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-heading text-xl font-bold text-navy">{tx('آراء العملاء والإحالات', 'Reviews & referrals')}</div>
        <div className="mt-1 text-[13px] text-muted">
          {tx('الآراء الجديدة تبقى مخفية حتى توافق عليها. المعتمدة تظهر في الصفحة الرئيسية.', 'New reviews stay hidden until you approve them. Approved ones show on the homepage.')}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-gold/10 p-3 text-[13px] text-navy">
          {tx('شغّل ملف قاعدة البيانات 0067 أولًا لتفعيل هذه الصفحة.', 'Run database migration 0067 first to enable this page.')}
        </div>
      )}

      {/* Add a review received elsewhere */}
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="mb-2 text-[14px] font-bold text-navy">{tx('إضافة رأي وصلك (بموافقة صاحبه)', 'Add a review you received (with consent)')}</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tx('الاسم (الأول فقط)', 'Name (first name only)')} className={field} />
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder={tx('التخصص والمرحلة', 'Field & stage')} className={field} />
        </div>
        <div className="my-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => setStars(i)} className={`text-[22px] ${i <= stars ? 'text-gold' : 'text-navy/20'}`}>
              ★
            </button>
          ))}
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={tx('نص الرأي', 'Review text')} className={`${field} resize-y`} />
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy || !name.trim() || !body.trim()}
          className="mt-2 rounded-md bg-navy px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {tx('إضافة ونشر', 'Add & publish')}
        </button>
      </div>

      {/* Review list */}
      <div className="flex flex-col gap-3">
        {isLoading && <LoadingState />}
        {(reviews ?? []).length === 0 && !isLoading && !error && (
          <div className="text-[13px] text-muted">{tx('لا توجد آراء بعد.', 'No reviews yet.')}</div>
        )}
        {(reviews ?? []).map((r) => (
          <div key={r.id} className={`rounded-xl border bg-white p-4 ${r.approved ? 'border-success/40' : 'border-gold/50'}`}>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-navy">{r.name}</span>
                {r.subtitle && <span className="text-[12.5px] text-muted">— {r.subtitle}</span>}
                <Stars n={r.stars} size={14} />
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${r.approved ? 'bg-success/10 text-success' : 'bg-gold/15 text-accent'}`}>
                {r.approved ? tx('منشور', 'Published') : tx('بانتظار الموافقة', 'Pending')}
              </span>
            </div>
            <p className="text-[13.5px] leading-7 text-navy/85">{r.body}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void setTestimonialApproved(r.id, !r.approved).then(refresh)}
                className={`rounded-md px-3.5 py-1.5 text-[12.5px] font-semibold ${r.approved ? 'border border-border text-navy' : 'bg-success text-white'}`}
              >
                {r.approved ? tx('إخفاء', 'Hide') : tx('موافقة ونشر', 'Approve & publish')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(tx('حذف هذا الرأي نهائيًا؟', 'Delete this review permanently?'))) void deleteTestimonial(r.id).then(refresh)
                }}
                className="rounded-md border border-error px-3.5 py-1.5 text-[12.5px] text-error"
              >
                {tx('حذف', 'Delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Referrals */}
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="mb-1 text-[14px] font-bold text-navy">{tx('الإحالات', 'Referrals')}</div>
        <div className="mb-3 text-[12.5px] text-muted">
          {tx('من جاب مين — كافئ أصحاب الإحالات الناجحة بكود خصم من صفحة التخفيضات.', 'Who brought whom — reward successful referrers with a discount code from the Discounts page.')}
        </div>
        {(referrals ?? []).length === 0 ? (
          <div className="text-[13px] text-muted">{tx('لا توجد إحالات بعد.', 'No referrals yet.')}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {(referrals ?? []).map((r) => (
              <div key={r.referrerId} className="rounded-lg bg-bg-soft p-3">
                <div className="text-[13.5px] font-semibold text-navy">
                  {r.referrerName} <span className="text-[12px] font-normal text-muted">@{r.referrerUsername}</span> — {r.referred.length}
                </div>
                <div className="mt-1 text-[12.5px] text-muted">{r.referred.map((p) => p.name).join('، ')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
