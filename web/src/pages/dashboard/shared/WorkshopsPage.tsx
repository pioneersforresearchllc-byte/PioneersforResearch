import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { buttonClasses } from '@/components/ui/Button'
import { LoadingState } from '@/components/LoadingState'
import {
  cancelSeat,
  canJoinNow,
  JOIN_WINDOW_MIN,
  listMySignups,
  listOpenWorkshops,
  reserveSeat,
  type GroupSession,
  type SignupResult,
} from '@/lib/groupSessions'

function useDateFmt() {
  const { lang } = useLanguage()
  return (iso: string) =>
    new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-ca-gregory' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Riyadh',
    }).format(new Date(iso))
}

function WorkshopCard({
  ws,
  registered,
  onChanged,
}: {
  ws: GroupSession
  registered: boolean
  onChanged: () => void
}) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const fmt = useDateFmt()
  const seatsLeft = Math.max(0, ws.capacity - ws.seats_taken)
  const full = seatsLeft <= 0
  const joinable = registered && canJoinNow(ws)

  const reserve = useMutation({
    mutationFn: () => reserveSeat(ws.id),
    onSuccess: (res: SignupResult) => {
      if (res === 'full') alert(t('workshops.full'))
      onChanged()
    },
  })
  const cancel = useMutation({
    mutationFn: () => cancelSeat(ws.id),
    onSuccess: onChanged,
  })

  return (
    <div className="rounded-xl border border-border-2 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="font-heading text-[15.5px] font-bold text-navy">{ws.title}</div>
        {ws.status === 'live' ? (
          <span className="shrink-0 rounded-full bg-error-bg px-2.5 py-0.5 text-[11px] font-bold text-error">
            ● {t('workshops.live')}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-bg-soft px-2.5 py-0.5 text-[11px] font-semibold text-muted">
            {t('workshops.scheduled')}
          </span>
        )}
      </div>

      {ws.description && <p className="mb-2.5 text-[13px] leading-relaxed text-muted">{ws.description}</p>}

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-navy">
        <span>🗓️ {fmt(ws.scheduled_at)}</span>
        <span>⏱️ {t('workshops.minutes', { n: String(ws.duration_min) })}</span>
        <span className={full && !registered ? 'text-error' : 'text-success'}>
          👥 {t('workshops.seatsLeft', { n: String(seatsLeft), cap: String(ws.capacity) })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {registered ? (
          <>
            <button
              disabled={!joinable}
              onClick={() => navigate(`/group-call/${ws.id}`)}
              className={buttonClasses('gold', 'sm', joinable ? '' : 'cursor-not-allowed opacity-55')}
            >
              {t('workshops.join')}
            </button>
            {!joinable && (
              <span className="text-[11.5px] text-muted">{t('workshops.opensBefore', { n: String(JOIN_WINDOW_MIN) })}</span>
            )}
            <button
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
              className="text-[12px] text-muted underline-offset-2 hover:text-error hover:underline disabled:opacity-50"
            >
              {t('workshops.cancelSeat')}
            </button>
          </>
        ) : full ? (
          <span className="rounded-lg bg-bg-soft px-3.5 py-2 text-[12.5px] font-semibold text-muted">{t('workshops.full')}</span>
        ) : (
          <button
            disabled={reserve.isPending}
            onClick={() => reserve.mutate()}
            className={buttonClasses('primary', 'sm', reserve.isPending ? 'opacity-60' : '')}
          >
            {t('workshops.reserve')}
          </button>
        )}
      </div>
    </div>
  )
}

export function WorkshopsPage() {
  const { t } = useLanguage()
  const qc = useQueryClient()
  const { data: workshops, isLoading } = useQuery({ queryKey: ['workshops-open'], queryFn: listOpenWorkshops, refetchInterval: 60_000 })
  const { data: mine } = useQuery({ queryKey: ['workshops-mine'], queryFn: listMySignups })
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['workshops-open'] })
    void qc.invalidateQueries({ queryKey: ['workshops-mine'] })
  }

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('workshops.title')}</div>
      <div className="mb-5 text-[13.5px] text-muted">{t('workshops.subtitle')}</div>

      {isLoading && <LoadingState />}
      {!isLoading && (workshops ?? []).length === 0 && (
        <div className="rounded-xl border border-dashed border-border-2 bg-bg-soft px-4 py-10 text-center text-[13.5px] text-muted">
          {t('workshops.empty')}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {(workshops ?? []).map((ws) => (
          <WorkshopCard key={ws.id} ws={ws} registered={!!mine?.has(ws.id)} onChanged={refresh} />
        ))}
      </div>
    </div>
  )
}
