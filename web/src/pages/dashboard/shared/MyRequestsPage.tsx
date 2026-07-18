import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyServiceRequests, markMyRequestsSeen, startServiceCheckout, type RequestStatus } from '@/lib/services'

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

  const pay = async (id: string) => {
    setPayingId(id)
    setError('')
    try {
      const url = await startServiceCheckout(id)
      window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : t('myRequests.payError'))
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
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gold/10 p-3.5">
                <div className="text-[14px] text-navy">
                  {t('myRequests.amountDue')}:{' '}
                  <span className="font-bold">
                    {(r.final_price_cents / 100).toLocaleString('ar-SA')} {t('course.currency')}
                  </span>
                </div>
                <button
                  onClick={() => void pay(r.id)}
                  disabled={payingId === r.id}
                  className="rounded-md bg-navy px-5 py-2.25 text-[13.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
                >
                  {payingId === r.id ? '...' : t('myRequests.payNow')}
                </button>
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
