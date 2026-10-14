import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { getMarketingConsent, setMarketingConsent } from '@/lib/legal'

/**
 * Separate, optional marketing consent (never bundled with the Terms): offers
 * and news are only sent to users whose latest recorded choice is opt-in.
 */
function useMarketingConsent(userId: string | undefined) {
  const queryClient = useQueryClient()
  const key = ['marketing-consent', userId]
  const query = useQuery({ queryKey: key, enabled: !!userId, queryFn: () => getMarketingConsent(userId!), staleTime: Infinity })
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const choose = async (optIn: boolean) => {
    if (!userId) return
    setBusy(true)
    setFailed(false)
    try {
      await setMarketingConsent(userId, optIn)
      queryClient.setQueryData(key, optIn)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return { value: query.data, isLoading: query.isLoading, choose, busy, failed }
}

/** One-time, non-blocking dashboard banner shown until the user makes a marketing choice. */
export function MarketingPrompt() {
  const { profile } = useAuth()
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const applies = !!profile && profile.role !== 'owner'
  const { value, isLoading, choose, busy, failed } = useMarketingConsent(applies ? profile!.id : undefined)
  if (!applies || isLoading || value !== null) return null
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gold/40 bg-gold/[0.07] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-[13px] leading-6 text-navy">
        <span className="font-semibold">{ar ? 'هل تودّ استلام عروضنا وأخبار الدورات الجديدة؟' : 'Would you like to receive our offers and news of new courses?'}</span>{' '}
        <span className="text-muted">
          {ar
            ? 'عبر البريد أو واتساب — اختياري تمامًا، ويمكنك تغييره لاحقًا من «حسابي».'
            : 'By email or WhatsApp — entirely optional; change it any time in your account.'}
        </span>
        {failed && <div className="text-[12px] text-error">{ar ? 'تعذّر الحفظ، حاول مجددًا.' : 'Could not save, try again.'}</div>}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          disabled={busy}
          onClick={() => void choose(true)}
          className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {ar ? 'نعم، أرغب' : 'Yes, please'}
        </button>
        <button
          disabled={busy}
          onClick={() => void choose(false)}
          className="rounded-md border border-border bg-white px-4 py-2 text-[12.5px] font-semibold text-muted-2 hover:border-navy disabled:opacity-50"
        >
          {ar ? 'لا، شكرًا' : 'No, thanks'}
        </button>
      </div>
    </div>
  )
}

/** Account-page toggle to give or withdraw marketing consent. */
export function MarketingCard({ userId }: { userId: string }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const { value, choose, busy, failed } = useMarketingConsent(userId)
  if (value === undefined) return null // migration 0074 pending
  return (
    <div className="rounded-xl border border-border bg-white p-5 md:p-6">
      <div className="mb-1 text-[14px] font-semibold text-navy">{ar ? 'الرسائل التسويقية' : 'Marketing messages'}</div>
      <p className="mb-3 text-[12.5px] leading-6 text-muted">
        {ar
          ? 'العروض وأخبار الدورات عبر البريد أو واتساب. رسائل طلباتك وحسابك تصلك دائمًا بغض النظر عن هذا الخيار.'
          : 'Offers and course news by email or WhatsApp. Messages about your requests and account always reach you regardless.'}
      </p>
      <label className="flex items-center gap-2.5 text-[13px] text-navy">
        <input type="checkbox" checked={value === true} disabled={busy} onChange={(e) => void choose(e.target.checked)} className="h-4 w-4" />
        {ar ? 'أوافق على استلام الرسائل التسويقية' : 'I agree to receive marketing messages'}
      </label>
      {failed && <div className="mt-2 text-[12px] text-error">{ar ? 'تعذّر الحفظ' : 'Could not save'}</div>}
    </div>
  )
}

/**
 * Explicit no-refund / immediate-performance acknowledgement shown next to
 * every pay button. The caller records it (recordConsent 'payment_no_refund')
 * right before starting the payment.
 */
export function PaymentAck({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  return (
    <label className="flex items-start gap-2.5 text-[12.5px] leading-6 text-navy">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
      <span>
        {ar ? 'أوافق على البدء الفوري في تنفيذ الخدمة، وأعلم أن المبالغ المدفوعة غير قابلة للاسترداد إلا في الحالات الواردة في ' : 'I agree to the immediate start of the service and understand that payments are non-refundable except in the cases set out in the '}
        <Link to="/refund" target="_blank" className="font-semibold text-navy underline underline-offset-2">
          {ar ? 'سياسة الاسترجاع والإلغاء' : 'Refund & Cancellation Policy'}
        </Link>
        {ar ? '.' : '.'}
      </span>
    </label>
  )
}

/** Terms + sensitive-data confirmation on a service request form (visitors included). */
export function RequestConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const a = (to: string, label: string) => (
    <Link to={to} target="_blank" className="font-semibold text-navy underline underline-offset-2">
      {label}
    </Link>
  )
  return (
    <label className="flex items-start gap-2.5 text-[12.5px] leading-6 text-muted">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
      <span>
        {ar ? 'أوافق على ' : 'I agree to the '}
        {a('/terms', ar ? 'الشروط والأحكام' : 'Terms & Conditions')}
        {ar ? ' و' : ' and '}
        {a('/privacy', ar ? 'سياسة الخصوصية' : 'Privacy Policy')}
        {ar
          ? '، وأقرّ بأن أي بيانات صحية أو بيانات مشاركين في ملفاتي مجهولة الهوية أو لديّ الموافقات الأخلاقية اللازمة لها، وأوافق صراحةً على معالجتها لتنفيذ طلبي.'
          : ', and confirm that any health or participant data in my files is de-identified or covered by the required ethical approvals, and I explicitly consent to its processing for my request.'}
      </span>
    </label>
  )
}
