import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import {
  acceptConsultantAgreement,
  CONSULTANT_AGREEMENT,
  CONSULTANT_AGREEMENT_VERSION,
  consultantAgreementHash,
  hasAcceptedConsultantAgreement,
} from '@/lib/consultantAgreement'
import { LegalDoc } from '@/pages/marketing/LegalPages'

/**
 * Consultants & trainers (role 'teacher') must accept the current Consultant &
 * Trainer Agreement before using their dashboard — and the database refuses to
 * assign them a request until they do (migration 0079). Hidden while 0079 is
 * pending. Sits just under TermsGate (z-70) so the platform terms come first.
 */
export function ConsultantAgreementGate() {
  const { profile, signOut } = useAuth()
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const queryClient = useQueryClient()
  // Active trainers and applicants under review (pending page); not rejected ones.
  const applies = !!profile && profile.role === 'teacher' && profile.status !== 'rejected'
  const key = ['consultant-agreement', profile?.id, CONSULTANT_AGREEMENT_VERSION]
  const { data: accepted, isLoading } = useQuery({
    queryKey: key,
    enabled: applies,
    queryFn: () => hasAcceptedConsultantAgreement(profile!.id),
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
      await acceptConsultantAgreement(profile!.id)
      queryClient.setQueryData(key, true)
    } catch {
      setError(ar ? 'تعذّر حفظ الموافقة، حاول مجددًا.' : 'Could not save your acceptance, please try again.')
    } finally {
      setBusy(false)
    }
  }

  const effective = {
    ar: `الإصدار ${CONSULTANT_AGREEMENT_VERSION}`,
    en: `Version ${CONSULTANT_AGREEMENT_VERSION}`,
  }

  return createPortal(
    <div dir={ar ? 'rtl' : 'ltr'} className="fixed inset-0 z-[68] flex items-center justify-center bg-[#0a1c34]/65 p-3 backdrop-blur-[2px] md:p-6">
      <div role="dialog" aria-modal="true" className="flex max-h-full w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-border px-5 py-4 md:px-6">
          <div className="font-heading text-[18px] font-bold text-navy">
            {ar ? 'اتفاقية المدرّب' : 'Trainer Agreement'}
          </div>
          <p className="mt-1 text-[12.5px] leading-6 text-muted">
            {ar
              ? 'قبل أن نُسند إليك أي طلب أو برنامج، يرجى قراءة الاتفاقية كاملة والموافقة عليها. تُحفظ موافقتك مع تاريخها ووقتها.'
              : 'Before we assign you any request or program, please read the full agreement and accept it. Your acceptance is recorded with its date and time.'}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <LegalDoc
            doc={CONSULTANT_AGREEMENT[lang]}
            lang={lang}
            version={effective}
            hashKey={['consultant-agreement-hash', CONSULTANT_AGREEMENT_VERSION]}
            hashFn={consultantAgreementHash}
            embedded
          />
        </div>
        <div className="border-t border-border px-5 py-4 md:px-6">
          <label className="flex items-start gap-2.5 text-[13px] leading-6 text-navy">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
            <span>
              {ar
                ? 'قرأت اتفاقية المدرّب كاملة، وأوافق عليها وألتزم بها، بما فيها التواصل داخل المنصة فقط، وعدم الاستقطاب والتعويض الاتفاقي، والسرية وحماية البيانات.'
                : 'I have read the full Trainer Agreement and agree to be bound by it, including on-platform communication only, non-solicitation and liquidated damages, and confidentiality and data protection.'}
            </span>
          </label>
          {error && <div className="mt-2 rounded-lg bg-error-bg px-3 py-2 text-[12.5px] text-error">{error}</div>}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
            <button
              onClick={() => void accept()}
              disabled={!checked || busy}
              className="rounded-xl bg-navy px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
            >
              {busy ? '...' : ar ? 'أوافق وأتابع' : 'I agree & continue'}
            </button>
            <button onClick={() => void signOut()} className="px-3 py-2 text-[12.5px] text-muted hover:text-navy">
              {ar ? 'لا أوافق — تسجيل الخروج' : 'I do not agree — sign out'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
