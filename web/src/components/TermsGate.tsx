import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { hasAcceptedTerms, recordTermsAcceptance, TERMS_VERSION } from '@/lib/legal'
import { SoftNudge } from '@/components/SoftNudge'

/**
 * Reminds non-owner accounts to accept the current legal documents version.
 * New users already accept at sign-up (RegisterPage), so this mostly fires on a
 * TERMS_VERSION bump or for legacy / Google / institution accounts. To avoid
 * losing people it is a low-key, non-blocking nudge (not a wall and no forced
 * sign-out): clicking "موافق" RECORDS the acceptance (legal evidence), while
 * the copy makes clear that continued use already constitutes acceptance of the
 * update — so the legal protection holds even if the nudge is dismissed.
 */
export function TermsGate() {
  const { profile } = useAuth()
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!applies || isLoading || accepted !== false) return null

  const accept = async () => {
    setBusy(true)
    setError('')
    try {
      await recordTermsAcceptance(profile!.id, 'gate')
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

  return (
    <SoftNudge title={ar ? 'تحديث الشروط والسياسات' : 'Updated terms & policies'}>
      <p className="mb-2 text-[12.5px] leading-6 text-muted">
        {ar
          ? 'حدّثنا الشروط والخصوصية وسياسة الاسترجاع. باستمرارك في استخدام حسابك فإنك توافق على التحديث.'
          : 'We updated our Terms, Privacy and Refund policies. Continuing to use your account means you accept the update.'}
      </p>
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
        {link('/terms', ar ? 'الشروط' : 'Terms')}
        {link('/privacy', ar ? 'الخصوصية' : 'Privacy')}
        {link('/refund', ar ? 'الاسترجاع' : 'Refund')}
      </div>
      {error && <div className="mb-2 rounded-lg bg-error-bg px-3 py-2 text-[12px] text-error">{error}</div>}
      <button
        onClick={() => void accept()}
        disabled={busy}
        className="w-full rounded-xl bg-success py-2.5 text-[14px] font-bold text-white hover:brightness-110 disabled:opacity-50"
      >
        {busy ? '...' : ar ? 'موافق' : 'Agree'}
      </button>
    </SoftNudge>
  )
}
