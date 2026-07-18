import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyServiceRequests, markMyRequestsSeen, startServiceCheckout, type RequestStatus } from '@/lib/services'
import { validateDiscount, type DiscountPreview } from '@/lib/discounts'

/**
 * Stripe redirects back to a fixed /my-requests URL, but the page itself
 * lives inside each role's dashboard — so this bounces the user to their
 * own dashboard's copy of it.
 */
export function MyRequestsRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/login" replace />
  const base = profile.role === 'teacher' ? '/teacher' : profile.role === 'owner' ? '/owner' : '/student'
  return <Navigate to={`${base}/requests`} replace />
}

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: 'bg-bg-soft text-muted',
  awaiting_payment: 'bg-gold/15 text-gold',
  paid: 'bg-success/10 text-success',
  in_progress: 'bg-accent/10 text-accent',
  done: 'bg-success/10 text-success',
  cancelled: 'bg-bg-soft text-muted',
}

export function MyRequestsPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [payingId, setPayingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  // Ids that had an unseen development on this page load — highlighted so the
  // requester can spot what changed, even after we clear the flag below.
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set())
  const [promo, setPromo] = useState<Record<string, string>>({})
  const [applied, setApplied] = useState<Record<string, DiscountPreview>>({})
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [codeMsg, setCodeMsg] = useState<Record<string, string>>({})
  const seenCleared = useRef(false)

  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-service-requests', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyServiceRequests(profile!.id),
  })

  // Opening the list counts as seeing every development in it: remember which
  // rows were new (for the highlight), then clear the flags so the tab badge
  // resets. Runs once per mount, after the first successful load.
  useEffect(() => {
    if (!requests || seenCleared.current) return
    seenCleared.current = true
    const unseen = requests.filter((r) => r.student_unseen).map((r) => r.id)
    if (unseen.length === 0) return
    setHighlightIds(new Set(unseen))
    void markMyRequestsSeen().then(() => {
      void queryClient.invalidateQueries({ queryKey: ['my-requests-unseen', profile?.id] })
    })
  }, [requests, queryClient, profile?.id])

  const statusLabel = (s: RequestStatus) =>
    s === 'pending'
      ? t('myRequests.status.pending')
      : s === 'awaiting_payment'
        ? t('myRequests.status.awaiting_payment')
        : s === 'paid'
          ? t('myRequests.status.paid')
          : s === 'in_progress'
            ? t('myRequests.status.in_progress')
            : s === 'done'
              ? t('myRequests.status.done')
              : t('myRequests.status.cancelled')

  const reasonMsg = (reason?: string) =>
    reason === 'new_users_only'
      ? t('checkout.reasonNewUsers')
      : reason === 'first_purchase_only'
        ? t('checkout.reasonFirstPurchase')
        : t('checkout.invalidCode')

  const applyCode = async (id: string) => {
    const code = (promo[id] ?? '').trim()
    if (!code) return
    setCheckingId(id)
    setCodeMsg((m) => ({ ...m, [id]: '' }))
    setApplied((a) => {
      const next = { ...a }
      delete next[id]
      return next
    })
    const res = await validateDiscount({ code, requestId: id })
    setCheckingId(null)
    if (res.valid) setApplied((a) => ({ ...a, [id]: res }))
    else setCodeMsg((m) => ({ ...m, [id]: reasonMsg(res.reason) }))
  }

  const pay = async (id: string) => {
    if ((promo[id] ?? '').trim() && !applied[id]?.valid) {
      setError(t('checkout.verifyFirst'))
      return
    }
    setPayingId(id)
    setError('')
    try {
      const url = await startServiceCheckout(id, promo[id])
      window.location.href = url
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError(msg.includes('invalid_code') ? t('checkout.invalidCode') : msg || t('myRequests.payError'))
      setPayingId(null)
    }
  }

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('myRequests.title')}</div>

      {isLoading && <div className="text-muted">...</div>}
      {requests && requests.length === 0 && <div className="text-muted">{t('myRequests.empty')}</div>}
      {error && <div className="mb-3 text-[13.5px] text-error">{error}</div>}

      <div className="flex flex-col gap-4">
        {(requests ?? []).map((r) => (
          <div
            key={r.id}
            className={`rounded-xl border bg-white p-5 ${
              highlightIds.has(r.id) ? 'border-accent ring-1 ring-accent/30' : 'border-border'
            }`}
          >
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-[15.5px] font-semibold text-navy">{r.subject}</div>
                  {highlightIds.has(r.id) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      {t('myRequests.newUpdate')}
                    </span>
                  )}
                </div>
                <div className="text-[12.5px] text-muted">
                  {r.serviceTitle}
                  {r.packageTitle ? ` · ${r.packageTitle}` : ''}
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${STATUS_STYLES[r.status]}`}>
                {statusLabel(r.status)}
              </span>
            </div>

            <div className="mb-3 text-[12.5px] text-muted">
              {t('adminRequests.deliveryBy')}: {r.delivery_date}
            </div>

            {r.status === 'awaiting_payment' && r.final_price_cents != null && (
              <div className="rounded-lg bg-gold/10 p-3.5">
                <div className="mb-2 text-[14px] text-navy">
                  {t('myRequests.amountDue')}:{' '}
                  {applied[r.id]?.valid ? (
                    <>
                      <span className="text-faint line-through">
                        {((applied[r.id].original_cents ?? 0) / 100).toLocaleString('en-US')} {t('course.currency')}
                      </span>{' '}
                      <span className="font-bold">
                        {((applied[r.id].discounted_cents ?? 0) / 100).toLocaleString('en-US')} {t('course.currency')}
                      </span>{' '}
                      <span className="text-accent">(−{applied[r.id].percent_off}%)</span>
                    </>
                  ) : (
                    <span className="font-bold">
                      {(r.final_price_cents / 100).toLocaleString('en-US')} {t('course.currency')}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={promo[r.id] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase()
                      setPromo((p) => ({ ...p, [r.id]: v }))
                      setApplied((a) => {
                        const n = { ...a }
                        delete n[r.id]
                        return n
                      })
                      setCodeMsg((m) => ({ ...m, [r.id]: '' }))
                    }}
                    placeholder={t('checkout.promoPh')}
                    className="w-40 rounded-md border border-border px-3 py-2 text-[13px]"
                  />
                  <button
                    onClick={() => void applyCode(r.id)}
                    disabled={!(promo[r.id] ?? '').trim() || checkingId === r.id}
                    className="rounded-md border border-navy px-4 py-2 text-[13px] font-semibold text-navy hover:bg-white disabled:opacity-50"
                  >
                    {checkingId === r.id ? t('checkout.checking') : t('checkout.apply')}
                  </button>
                  <button
                    onClick={() => void pay(r.id)}
                    disabled={payingId === r.id}
                    className="rounded-md bg-navy px-5 py-2.25 text-[13.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
                  >
                    {payingId === r.id ? '...' : t('myRequests.payNow')}
                  </button>
                </div>
                {applied[r.id]?.valid && <div className="mt-2 text-[13px] font-semibold text-success">{t('checkout.valid')}</div>}
                {codeMsg[r.id] && <div className="mt-2 text-[13px] text-error">{codeMsg[r.id]}</div>}
              </div>
            )}

            {r.status === 'pending' && <div className="text-[13px] text-muted">{t('myRequests.pendingNote')}</div>}
            {(r.status === 'paid' || r.status === 'in_progress') && (
              <div className="text-[13px] text-muted">{t('myRequests.paidNote')}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
