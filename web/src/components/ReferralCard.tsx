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
      `أنصحك بمنصة الرواد للبحوث الصحية — دورات وإشراف وخدمات بحثية. سجّل من رابطي: ${link}`,
      `I recommend Pioneers Health Research — courses, mentoring and research services. Sign up with my link: ${link}`,
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
          <div className="text-[16px] font-bold text-navy">🎁 {tx('ادعُ زميلك واحصل على مكافأة', 'Invite a colleague, get a reward')}</div>
          <div className="mt-1 text-[13px] leading-6 text-muted">
            {tx('شارك رابطك الخاص؛ عند تسجيل زميلك وطلبه خدمة، نتواصل معك بمكافأتك.', 'Share your link; when a colleague signs up and orders, we’ll contact you with your reward.')}
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
