import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { getMyPhone, normalizePhone, savePhone } from '@/lib/phone'
import { PhoneField } from '@/components/PhoneField'

/**
 * Students and teachers must have a contact phone. Accounts created before the
 * phone field existed (or via Google, or whose save failed) get this one-time
 * prompt in their dashboard. It stays hidden while migration 0072 is pending
 * (getMyPhone → undefined) so the dashboard never gets blocked by it.
 */
export function PhoneGate() {
  const { profile, signOut } = useAuth()
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
  const [country, setCountry] = useState('966')
  const [number, setNumber] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!applies || isLoading || phone !== null) return null

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

  return createPortal(
    <div dir={ar ? 'rtl' : 'ltr'} className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a1c34]/60 p-4 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-[22px]">📱</div>
        <div className="mb-1.5 font-heading text-[19px] font-bold text-navy">{ar ? 'أضف رقم جوالك' : 'Add your mobile number'}</div>
        <p className="mb-4 text-[13.5px] leading-7 text-muted">
          {ar
            ? 'نحتاج رقمك (واتساب) للتواصل معك بخصوص طلباتك ودوراتك. يظهر لإدارة المنصة فقط.'
            : 'We need your (WhatsApp) number to reach you about your requests and courses. Only the platform admin can see it.'}
        </p>
        <PhoneField country={country} number={number} onCountry={setCountry} onNumber={setNumber} />
        {error && <div className="mt-2 rounded-lg bg-error-bg px-3 py-2 text-[12.5px] text-error">{error}</div>}
        <button
          onClick={() => void submit()}
          disabled={busy || !number.trim()}
          className="mt-4 w-full rounded-xl bg-navy py-3 text-[15px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {busy ? '...' : ar ? 'حفظ والمتابعة' : 'Save & continue'}
        </button>
        <button onClick={() => void signOut()} className="mt-3 w-full text-center text-[12.5px] text-muted hover:text-navy">
          {ar ? 'تسجيل الخروج' : 'Sign out'}
        </button>
      </div>
    </div>,
    document.body,
  )
}
