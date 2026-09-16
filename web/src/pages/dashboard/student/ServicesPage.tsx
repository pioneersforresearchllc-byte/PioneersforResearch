import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { getServicesActivity, listMyServiceWorkspaces } from '@/lib/serviceWorkspace'
import { ServiceWorkspace } from '@/components/ServiceWorkspace'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-success/10 text-success',
  in_progress: 'bg-accent/10 text-accent',
  done: 'bg-success/10 text-success',
}

export function StudentServicesPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const { data, isLoading } = useQuery({
    queryKey: ['my-service-workspaces', profile?.id],
    queryFn: () => listMyServiceWorkspaces(profile!.id),
    enabled: !!profile?.id,
  })
  const [openId, setOpenId] = useState<string | null>(null)

  const items = data ?? []
  const { data: activity } = useQuery({
    queryKey: ['my-service-activity', items.map((s) => s.id).join(',')],
    queryFn: () => getServicesActivity(items.map((s) => s.id)),
    enabled: items.length > 0,
  })

  return (
    <div>
      <div className="mb-1 font-heading text-xl font-bold text-navy">{t('tab.myServices')}</div>
      <p className="mb-5 text-[13px] text-muted">{t('myServices.subtitle')}</p>

      {isLoading && <LoadingState />}
      {data && items.length === 0 && <EmptyState title={t('myServices.empty')} />}

      <div className="flex flex-col gap-3">
        {items.map((s) => {
          const isOpen = openId === s.id
          return (
            <div key={s.id} className="overflow-hidden rounded-xl border border-border bg-white">
              <button
                onClick={() => setOpenId(isOpen ? null : s.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-start hover:bg-bg-soft"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-[15px] font-bold text-navy">{s.serviceTitle}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[s.status] ?? 'bg-bg-soft text-muted'}`}>
                      {t(`myRequests.status.${s.status}` as 'myRequests.status.paid')}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-[12.5px] text-muted">
                    {s.subject}
                    {s.teacherName && <span className="text-faint"> · {t('myServices.mentor')}: {s.teacherName}</span>}
                  </div>
                  {activity?.[s.id] && (activity[s.id].sessions > 0 || activity[s.id].tasks > 0) && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {activity[s.id].sessions > 0 && (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                          📅 {activity[s.id].sessions} {t('workspace.sessions')}
                        </span>
                      )}
                      {activity[s.id].tasks > 0 && (
                        <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[11px] font-medium text-navy">
                          ✓ {activity[s.id].tasks} {t('workspace.tasks')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className={`shrink-0 text-[13px] text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}>‹</span>
              </button>

              {isOpen && (
                <div className="border-t border-border-2 bg-bg-soft/40 p-4">
                  <ServiceWorkspace requestId={s.id} manage={false} isStudent />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
