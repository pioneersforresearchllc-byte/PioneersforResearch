import { useLanguage } from '@/lib/i18n'
import type { RequestStatus } from '@/lib/services'

const STEP_OF: Record<RequestStatus, number> = {
  pending: 0,
  negotiating: 1,
  awaiting_deposit: 2,
  awaiting_payment: 2,
  paid: 3,
  in_progress: 3,
  awaiting_final: 4,
  done: 5,
  cancelled: 0,
}

/** Visual progress: received → agreement → deposit → in work → final payment → delivered. */
export function RequestStepper({ status }: { status: RequestStatus }) {
  const { lang } = useLanguage()
  if (status === 'cancelled') return null
  const steps =
    lang === 'ar'
      ? ['استلمنا طلبك', 'الاتفاق', 'الدفعة المقدمة', 'قيد التنفيذ', 'الدفعة النهائية', 'تم التسليم']
      : ['Received', 'Agreement', 'Deposit', 'In progress', 'Final payment', 'Delivered']
  const current = STEP_OF[status]
  return (
    <ol className="my-4 flex items-start">
      {steps.map((s, i) => {
        const done = i < current || status === 'done'
        const active = i === current && status !== 'done'
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span
                className={`absolute top-3.5 h-0.5 w-full ltr:right-1/2 rtl:left-1/2 ${i <= current ? 'bg-gold' : 'bg-navy/10'}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${
                done ? 'bg-gold text-navy' : active ? 'bg-navy text-white ring-4 ring-navy/15' : 'bg-bg-soft text-muted'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={`mt-1.5 text-[11.5px] leading-4 ${active ? 'font-bold text-navy' : done ? 'text-navy/80' : 'text-muted'}`}>{s}</span>
          </li>
        )
      })}
    </ol>
  )
}
