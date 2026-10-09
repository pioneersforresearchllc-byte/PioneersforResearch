import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { countMyReferrals, referralLink } from '@/lib/referral'

/** "Invite a colleague" — personal link; the team rewards successful referrals. */
export function ReferralCard() {
  const { profile } = useAuth()
  const { lang } = useLanguage()
  const tx = (a: string, e: string) => (lang === 'ar' ? a : e)
  const [copied, setCopied] = useState(false)
  const { data: count } = useQuery({
    queryKey: ['my-referrals', profile?.id],
    enabled: !!profile,
    queryFn: () => countMyReferrals(profile!.id),
  })
  if (!profile) return null
  const link = referralLink(profile.username)
  const share = encodeURIComponent(
    tx(
      `أنصحك بمنصة الرواد للبحوث الصحية، فيها دورات وإشراف وخدمات بحثية. سجّل من رابطي واحصل على خصم 5% عند تسجيلك في دورة: ${link}`,
      `I recommend Pioneers Health Research: courses, mentoring and research services. Sign up with my link and get 5% off when you enrol in a course: ${link}`,
    ),
  )
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked: the link is still visible to copy by hand
    }
  }
  return (
    <div className="mb-6 rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[16px] font-bold text-navy">🎁 {tx('ادعُ زميلك: خصم 10% لك و5% له', 'Invite a colleague: 10% off for you, 5% for them')}</div>
          <div className="mt-1 text-[13px] leading-6 text-muted">
            {tx(
              'شارك رابطك. عندما يسجّل زميلك من الرابط في دورة ويدفع الدفعة المقدمة، تحصل على خصم 10% ويحصل هو على 5%. الحد الأقصى 20% لكل طرف.',
              'Share your link. When a colleague signs up through it, enrols in a course and pays the down payment, you get 10% off and they get 5%. Up to 20% for each party.',
            )}{' '}
            <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-gold">
              {tx('الشروط', 'Terms')}
            </a>
          </div>
        </div>
        {typeof count === 'number' && count > 0 && (
          <span className="rounded-full bg-gold/15 px-3 py-1 text-[12.5px] font-bold text-accent">
            {tx(`سجّل عن طريقك: ${count}`, `Joined via you: ${count}`)}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code dir="ltr" className="min-w-0 flex-1 truncate rounded-lg bg-bg-soft px-3 py-2.5 text-[12.5px] text-navy">
          {link}
        </code>
        <button type="button" onClick={() => void copy()} className="rounded-lg bg-navy px-4 py-2.5 text-[13px] font-semibold text-white">
          {copied ? tx('تم النسخ ✓', 'Copied ✓') : tx('نسخ الرابط', 'Copy link')}
        </button>
        <a
          href={`https://wa.me/?text=${share}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-[#1fa855] px-4 py-2.5 text-[13px] font-semibold text-white no-underline"
        >
          {tx('شارك واتساب', 'Share on WhatsApp')}
        </a>
      </div>
    </div>
  )
}
