import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import {
  isPaidPhase,
  listAssignedRequests,
  signRequestFile,
  updateRequestStatus,
  type RequestStatus,
  type ServiceRequestRow,
} from '@/lib/services'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { ServiceWorkspace } from '@/components/ServiceWorkspace'
import { DeliverablesBox } from '@/components/DeliverablesBox'
import { STAGE_STYLES as STATUS_STYLES, stageLabel } from '@/lib/requestStages'
import { listMyPayouts, type MyPayout } from '@/lib/experts'
import { Price } from '@/components/Riyal'


function Field({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === '' || value === undefined) return null
  return (
    <div>
      <span className="text-muted">{label}: </span>
      <span className="text-navy">{value}</span>
    </div>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '؟'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function TeacherAssignedRequestsPage() {
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const { data: requests, isLoading } = useQuery({
    queryKey: ['assigned-requests', profile?.id],
    enabled: !!profile,
    queryFn: () => listAssignedRequests(profile!.id),
  })

  const [actionError, setActionError] = useState('')
  const { data: payouts } = useQuery({
    queryKey: ['my-payouts', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyPayouts(profile!.id),
  })

  const setStatus = async (id: string, status: RequestStatus) => {
    setActionError('')
    try {
      await updateRequestStatus(id, status)
    } catch {
      setActionError(
        lang === 'ar'
          ? 'تعذّر تحديث حالة الطلب — حاول مرة أخرى، وإن تكرر تواصل مع الإدارة.'
          : 'Could not update the request — try again or contact the admin.',
      )
    }
    void queryClient.invalidateQueries({ queryKey: ['assigned-requests', profile?.id] })
  }

  const openFile = async (path: string) => {
    const url = await signRequestFile(path)
    if (url) window.open(url, '_blank')
  }

  const statusLabel = (s: RequestStatus) => stageLabel(s, lang)

  const list = requests ?? []
  const filtered = query.trim()
    ? list.filter((r) => r.full_name?.toLowerCase().includes(query.trim().toLowerCase()))
    : list
  const selected = list.find((r) => r.id === selectedId) ?? null

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('assignedRequests.title')}</div>
      <div className="mb-5 text-[13.5px] text-muted">{t('assignedRequests.subtitle')}</div>

      <div className="mb-4 rounded-lg border border-gold/40 bg-gold/[0.07] px-3.5 py-2.5 text-[12.5px] leading-6 text-navy">
        {lang === 'ar'
          ? '🔒 كل التواصل مع العملاء يتم داخل المنصة فقط (المحادثة والحصص والملفات). أرقام الجوال والإيميلات والروابط الخارجية تُحجب تلقائيًا، وأي تواصل خارجها مخالف لاتفاقية العمل.'
          : '🔒 All contact with clients stays on the platform (chat, sessions, files). Phone numbers, emails and outside links are hidden automatically; contact outside it breaches your agreement.'}
      </div>
      {actionError && <div className="mb-3 rounded-lg bg-error-bg px-3.5 py-2.5 text-[13px] text-error">{actionError}</div>}

      {isLoading && <LoadingState />}
      {requests && list.length === 0 && <EmptyState title={t('assignedRequests.empty')} />}

      {list.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[310px_1fr]">
          {/* Master: subscribed students */}
          <div className={selected ? 'hidden lg:block' : ''}>
            <div className="mb-2.5 text-[12.5px] font-bold uppercase tracking-wide text-faint">
              {t('assignedRequests.students')} · {list.length}
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('assignedRequests.searchPh')}
              className="mb-3 w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] outline-none focus:border-navy"
            />
            <div className="flex flex-col gap-2">
              {filtered.map((r) => {
                const active = r.id === selectedId
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-start transition-all ${
                      active ? 'border-navy bg-navy/[0.04] shadow-sm' : 'border-border bg-white hover:border-navy/40 hover:bg-bg-soft'
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-[#14335c] text-[13px] font-bold text-white">
                      {initials(r.full_name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-navy">{r.full_name}</span>
                      <span className="block truncate text-[12px] text-muted">{r.serviceTitle}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${STATUS_STYLES[r.status]}`}>
                      {statusLabel(r.status)}
                    </span>
                  </button>
                )
              })}
              {filtered.length === 0 && <div className="py-6 text-center text-[13px] text-faint">{t('assignedRequests.noMatch')}</div>}
            </div>
          </div>

          {/* Detail: the selected student's separate area */}
          <div className={selected ? '' : 'hidden lg:block'}>
            {selected ? (
              <StudentDetail
                r={selected}
                t={t}
                statusLabel={statusLabel}
                onBack={() => setSelectedId(null)}
                onStatus={setStatus}
                onOpenFile={openFile}
                payout={payouts?.find((p) => p.request_id === selected.id) ?? null}
              />
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-white p-8 text-center text-[13.5px] text-faint">
                {t('assignedRequests.selectPrompt')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type TFn = ReturnType<typeof useLanguage>['t']

function StudentDetail({
  r,
  t,
  statusLabel,
  onBack,
  onStatus,
  onOpenFile,
  payout,
}: {
  r: ServiceRequestRow
  t: TFn
  statusLabel: (s: RequestStatus) => string
  onBack: () => void
  onStatus: (id: string, s: RequestStatus) => void
  onOpenFile: (path: string) => void
  payout: MyPayout | null
}) {
  const { lang } = useLanguage()
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <button onClick={onBack} className="mb-3 text-[12.5px] font-semibold text-accent hover:underline lg:hidden">
        {t('assignedRequests.backToList')}
      </button>

      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[16px] font-bold text-navy">{r.full_name}</div>
          <div className="text-[13px] text-muted">
            {r.serviceTitle}
            {r.packageTitle ? ` · ${r.packageTitle}` : ''}
          </div>
          <div className="mt-0.5 text-[12.5px] text-faint">{r.subject}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${STATUS_STYLES[r.status]}`}>
          {statusLabel(r.status)}
        </span>
      </div>

      {payout && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-gold/[0.08] px-3 py-2 text-[13px] text-navy">
          <span>💼 {lang === 'ar' ? 'مستحقاتك من هذا الطلب:' : 'Your payout:'}</span>
          <Price cents={payout.amount_cents} locale={lang === 'ar' ? 'ar-SA' : 'en-US'} className="font-bold" />
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${payout.paid_at ? 'bg-success-bg text-success' : 'bg-gold/20 text-accent'}`}>
            {payout.paid_at ? (lang === 'ar' ? 'تم الصرف' : 'Paid') : lang === 'ar' ? 'تُصرف بعد اكتمال الطلب' : 'Paid after completion'}
          </span>
        </div>
      )}

      <div className="mb-3 grid grid-cols-1 gap-1.5 text-[13px] sm:grid-cols-2">
        <Field label={t('adminRequests.deliveryBy')} value={r.delivery_date} />
        <Field label={t('service.language')} value={r.language} />
        <Field label={t('service.slides')} value={r.quantity} />
        <Field label={t('service.purpose')} value={r.purpose} />
        <Field label={t('service.audience')} value={r.target_audience} />
        <Field label={t('service.colors')} value={r.brand_colors} />
        {r.details?.software && <Field label={t('service.software')} value={r.details.software} />}
      </div>

      {r.custom_answers && r.custom_answers.length > 0 && (
        <div className="mb-3 flex flex-col gap-1.5 rounded-md bg-bg-soft p-3 text-[13px]">
          {r.custom_answers.map((a, i) => (
            <div key={i}>
              <span className="font-semibold text-muted">{a.label}: </span>
              {a.type === 'file' ? (
                <button onClick={() => onOpenFile(a.value)} className="text-navy underline underline-offset-2">
                  {a.fileName || t('adminRequests.openFile')}
                </button>
              ) : (
                <span className="whitespace-pre-wrap text-navy">{a.value}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {r.content_text && (
        <div className="mb-3 whitespace-pre-wrap rounded-md bg-bg-soft p-3 text-[13px] leading-7 text-muted-2">{r.content_text}</div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {r.content_file_url && (
          <button onClick={() => onOpenFile(r.content_file_url!)} className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy hover:border-navy">
            {t('adminRequests.openFile')}
          </button>
        )}
        {r.reference_file_url && (
          <button onClick={() => onOpenFile(r.reference_file_url!)} className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy hover:border-navy">
            {t('service.referenceFile')}
          </button>
        )}
        {r.reference_url && (
          <a href={r.reference_url} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy no-underline hover:border-navy">
            {t('service.referenceUrl')}
          </a>
        )}
      </div>

      {r.status === 'paid' && (
        <button onClick={() => onStatus(r.id, 'in_progress')} className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover">
          {t('assignedRequests.start')}
        </button>
      )}
      {r.status === 'in_progress' && (
        // With an agreed price the student still owes the final payment, so the
        // work goes to "awaiting final payment" (files stay locked) — not done.
        <button
          onClick={() => onStatus(r.id, r.agreed_price_cents != null ? 'awaiting_final' : 'done')}
          className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy-hover"
        >
          {t('assignedRequests.markDone')}
        </button>
      )}
      {(r.status === 'pending' || r.status === 'negotiating' || r.status === 'awaiting_deposit' || r.status === 'awaiting_payment') && (
        <div className="text-[12.5px] text-muted">{t('assignedRequests.waitingPayment')}</div>
      )}

      {isPaidPhase(r.status) && (
        <div className="mt-4 border-t border-border-2 pt-4">
          {r.deposit_percent !== undefined && <DeliverablesBox requestId={r.id} manage locked={false} />}
          <ServiceWorkspace requestId={r.id} manage isStudent={false} />
        </div>
      )}
    </div>
  )
}
