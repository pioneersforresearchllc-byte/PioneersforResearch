import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { hasAcceptedTerms, recordTermsAcceptance, TERMS_VERSION } from '@/lib/legal'

/**
 * Every non-owner account must accept the current legal documents version.
 * Covers accounts created before consent was recorded, Google / institution /
 * teacher signups, and everyone again after TERMS_VERSION is bumped.
 * Stays hidden while migration 0073 is pending (hasAcceptedTerms → undefined).
 * Sits above PhoneGate (z-70 vs z-60) so terms come first.
 */
export function TermsGate() {
  const { profile, signOut } = useAuth()
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const queryClient = useQueryClient()
  const applies = !!profile && profile.role !== 'owner'
  const { data: accepted, isLoading } = useQuery({
    queryKey: ['terms-accepted', profile?.id, TERMS_VERSION],
    enabled: applies,
    queryFn: () => hasAcceptedTerms(profile!.id),
    staleTime: Infinity,
  })
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!applies || isLoading || accepted !== false) return null

  const accept = async () => {
    setBusy(true)
    setError('')
    try {
      await recordTermsAcceptance(profile!.id)
      queryClient.setQueryData(['terms-accepted', profile!.id, TERMS_VERSION], true)
    } catch {
      setError(ar ? 'تعذّر حفظ الموافقة، حاول مجددًا.' : 'Could not save your acceptance, please try again.')
    } finally {
      setBusy(false)
    }
  }

  const link = (to: string, label: string) => (
    <a href={to} target="_blank" rel="noreferrer" className="font-semibold text-navy underline underline-offset-2">
      {label}
    </a>
  )

  return createPortal(
    <div dir={ar ? 'rtl' : 'ltr'} className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0a1c34]/65 p-4 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy/5 text-[22px]">📄</div>
        <div className="mb-1.5 font-heading text-[19px] font-bold text-navy">
          {ar ? 'تحديث الشروط والسياسات' : 'Updated terms & policies'}
        </div>
        <p className="mb-4 text-[13.5px] leading-7 text-muted">
          {ar
            ? 'حدّثنا الشروط والأحكام وسياسة الخصوصية وسياسة الاسترجاع والإلغاء. يرجى الاطلاع عليها والموافقة للمتابعة في استخدام حسابك.'
            : 'We have updated our Terms & Conditions, Privacy Policy and Refund & Cancellation Policy. Please review and accept them to continue using your account.'}
        </p>
        <div className="mb-4 flex flex-col gap-1.5 rounded-xl bg-bg-soft px-4 py-3 text-[13.5px]">
          {link('/terms', ar ? '← الشروط والأحكام' : 'Terms & Conditions →')}
          {link('/privacy', ar ? '← سياسة الخصوصية' : 'Privacy Policy →')}
          {link('/refund', ar ? '← سياسة الاسترجاع والإلغاء' : 'Refund & Cancellation Policy →')}
        </div>
        <label className="flex items-start gap-2.5 text-[13px] leading-6 text-navy">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
          <span>
            {ar
              ? 'قرأت الشروط والأحكام وسياسة الخصوصية وسياسة الاسترجاع والإلغاء، وأوافق عليها.'
              : 'I have read and agree to the Terms & Conditions, Privacy Policy and Refund & Cancellation Policy.'}
          </span>
        </label>
        {error && <div className="mt-2 rounded-lg bg-error-bg px-3 py-2 text-[12.5px] text-error">{error}</div>}
        <button
          onClick={() => void accept()}
          disabled={!checked || busy}
          className="mt-4 w-full rounded-xl bg-navy py-3 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {busy ? '...' : ar ? 'أوافق وأتابع' : 'Accept & continue'}
        </button>
        <button onClick={() => void signOut()} className="mt-3 w-full text-center text-[12.5px] text-muted hover:text-navy">
          {ar ? 'لا أوافق — تسجيل الخروج' : 'I do not agree — sign out'}
        </button>
      </div>
    </div>,
    document.body,
  )
}
