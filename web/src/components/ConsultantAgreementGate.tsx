import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import {
  acceptConsultantAgreement,
  CONSULTANT_AGREEMENT_VERSION,
  hasAcceptedConsultantAgreement,
} from '@/lib/consultantAgreement'

/**
 * Trainers (role 'teacher') must accept the current Trainer Agreement before a
 * request can be assigned to them — the database enforces that server-side
 * (migration 0079/0081). The UI is deliberately low-key: a small card in the
 * bottom corner rather than a blocking full-screen wall of text. Enforceability
 * is preserved by keeping a "view the agreement" link (the full text stays one
 * click away) and recording the version + document hash on acceptance.
 */
export function ConsultantAgreementGate() {
  const { profile } = useAuth()
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const queryClient = useQueryClient()
  const applies = !!profile && profile.role === 'teacher' && profile.status !== 'rejected'
  const key = ['consultant-agreement', profile?.id, CONSULTANT_AGREEMENT_VERSION]
  const { data: accepted, isLoading } = useQuery({
    queryKey: key,
    enabled: applies,
    queryFn: () => hasAcceptedConsultantAgreement(profile!.id),
    staleTime: Infinity,
  })
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState('')

  if (!applies || isLoading || accepted !== false || dismissed) return null

  const accept = async () => {
    setBusy(true)
    setError('')
    try {
      await acceptConsultantAgreement(profile!.id)
      queryClient.setQueryData(key, true)
    } catch {
      setError(ar ? 'تعذّر الحفظ، حاول مجددًا.' : "Couldn't save, try again.")
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div dir={ar ? 'rtl' : 'ltr'} className="fixed bottom-4 right-4 z-[60] w-[min(92vw,20rem)]">
      <div className="rounded-xl border border-border bg-white p-3.5 shadow-[0_12px_30px_-8px_rgba(11,31,58,0.35)]">
        <div className="text-[13px] font-bold text-navy">{ar ? 'اتفاقية المدرّب' : 'Trainer Agreement'}</div>
        <p className="mt-1 text-[11.5px] leading-5 text-muted">
          {ar
            ? 'الموافقة مطلوبة لاستلام الطلبات. بالموافقة تُقرّ باطّلاعك على الاتفاقية وقبولك لها.'
            : 'Required before requests can be assigned to you. By agreeing you acknowledge you have reviewed and accept it.'}
        </p>
        <a
          href="/consultant-agreement"
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-[11.5px] font-semibold text-accent no-underline hover:underline"
        >
          {ar ? 'عرض الاتفاقية' : 'View agreement'}
        </a>
        {error && <div className="mt-2 text-[11px] text-error">{error}</div>}
        <div className="mt-2.5 flex items-center justify-end gap-3">
          <button onClick={() => setDismissed(true)} className="text-[11.5px] text-faint hover:text-muted">
            {ar ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={() => void accept()}
            disabled={busy}
            className="rounded-lg bg-success px-4 py-1.75 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? '...' : ar ? 'موافق' : 'Agree'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
