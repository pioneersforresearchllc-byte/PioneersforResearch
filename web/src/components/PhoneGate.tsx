import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { getMyPhone, normalizePhone, savePhone } from '@/lib/phone'
import { hasAcceptedTerms, TERMS_VERSION } from '@/lib/legal'
import { PhoneField } from '@/components/PhoneField'
import { SoftNudge } from '@/components/SoftNudge'

/**
 * Asks students and teachers for a contact (WhatsApp) number — but as a gentle,
 * non-blocking nudge, not a wall: it slides up after a few seconds and can be
 * dismissed (it comes back later). The dashboard is never blocked on it, so we
 * don't lose people over an optional field. Hidden while migration 0072 is
 * pending (getMyPhone → undefined), and gone for good once a number is saved.
 */
export function PhoneGate() {
  const { profile } = useAuth()
  const { lang, t } = useLanguage()
  const ar = lang === 'ar'
  const queryClient = useQueryClient()
  const applies = !!profile && (profile.role === 'student' || profile.role === 'teacher')
  const { data: phone, isLoading } = useQuery({
    queryKey: ['my-phone', profile?.id],
    enabled: applies,
    queryFn: () => getMyPhone(profile!.id),
    staleTime: Infinity,
  })
  // Let the terms nudge go first so the two never overlap in the corner.
  const { data: termsAccepted } = useQuery({
    queryKey: ['terms-accepted', profile?.id, TERMS_VERSION],
    enabled: applies,
    queryFn: () => hasAcceptedTerms(profile!.id),
    staleTime: Infinity,
  })
  const [country, setCountry] = useState('966')
  const [number, setNumber] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!applies || isLoading || phone !== null || termsAccepted === false) return null

  const submit = async () => {
    setError('')
    const digits = normalizePhone(country, number)
    if (!digits) {
      setError(t('phone.invalid'))
      return
    }
    setBusy(true)
    try {
      await savePhone(profile!.id, digits)
      queryClient.setQueryData(['my-phone', profile!.id], digits)
    } catch {
      setError(ar ? 'تعذّر الحفظ، حاول مجددًا.' : 'Could not save, please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SoftNudge title={ar ? 'أضف رقم جوالك (اختياري)' : 'Add your mobile (optional)'}>
      <p className="mb-3 text-[12.5px] leading-6 text-muted">
        {ar
          ? 'لنتواصل معك بخصوص طلباتك ودوراتك عبر واتساب — يظهر للإدارة فقط.'
          : 'So we can reach you about your requests and courses on WhatsApp — visible to the admin only.'}
      </p>
      <PhoneField country={country} number={number} onCountry={setCountry} onNumber={setNumber} />
      {error && <div className="mt-2 rounded-lg bg-error-bg px-3 py-2 text-[12px] text-error">{error}</div>}
      <button
        onClick={() => void submit()}
        disabled={busy || !number.trim()}
        className="mt-3 w-full rounded-xl bg-navy py-2.5 text-[14px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
      >
        {busy ? '...' : ar ? 'حفظ' : 'Save'}
      </button>
    </SoftNudge>
  )
}
