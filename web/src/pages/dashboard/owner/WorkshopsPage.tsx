import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { listActiveTeachers } from '@/lib/courses'
import { LoadingState } from '@/components/LoadingState'
import {
  createWorkshop,
  deleteWorkshop,
  listAllWorkshops,
  listWorkshopSignups,
  updateWorkshop,
  type GroupSession,
  type GroupSessionStatus,
} from '@/lib/groupSessions'

const field = 'w-full rounded-md border border-border px-3 py-2 text-[13.5px]'

// A datetime-local value (local wall clock) → ISO instant, anchored to Saudi
// time (UTC+3, no DST) so the stored instant matches what the admin typed.
function localToIso(local: string): string {
  return new Date(`${local}:00+03:00`).toISOString()
}
function CreateForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useLanguage()
  const { data: teachers } = useQuery({ queryKey: ['active-teachers'], queryFn: listActiveTeachers })
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [when, setWhen] = useState('')
  const [duration, setDuration] = useState('60')
  const [capacity, setCapacity] = useState('15')
  const [hostId, setHostId] = useState('')

  const create = useMutation({
    mutationFn: () =>
      createWorkshop({
        title: title.trim(),
        description: description.trim() || null,
        scheduled_at: localToIso(when),
        duration_min: Math.max(10, Number(duration) || 60),
        capacity: Math.max(2, Number(capacity) || 15),
        host_id: hostId || null,
      }),
    onSuccess: () => {
      setTitle('')
      setDescription('')
      setWhen('')
      setDuration('60')
      setCapacity('15')
      setHostId('')
      onCreated()
    },
  })

  const valid = title.trim() && when

  return (
    <div className="rounded-xl border border-border-2 bg-bg-soft p-4">
      <div className="mb-3 text-[14px] font-bold text-navy">{t('ownerWorkshops.create')}</div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('ownerWorkshops.titlePh')} className={`${field} sm:col-span-2`} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={t('ownerWorkshops.descPh')} className={`${field} resize-y sm:col-span-2`} />
        <label className="text-[12px] text-muted">
          {t('ownerWorkshops.when')}
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="text-[12px] text-muted">
          {t('ownerWorkshops.host')}
          <select value={hostId} onChange={(e) => setHostId(e.target.value)} className={`${field} mt-1`}>
            <option value="">{t('ownerWorkshops.hostOwner')}</option>
            {(teachers ?? []).map((tt) => (
              <option key={tt.id} value={tt.id}>
                {tt.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12px] text-muted">
          {t('ownerWorkshops.duration')}
          <input type="number" min={10} value={duration} onChange={(e) => setDuration(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="text-[12px] text-muted">
          {t('ownerWorkshops.capacity')}
          <input type="number" min={2} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={`${field} mt-1`} />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          disabled={!valid || create.isPending}
          onClick={() => create.mutate()}
          className="rounded-md bg-navy px-5 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {t('ownerWorkshops.createBtn')}
        </button>
      </div>
    </div>
  )
}

function Roster({ sessionId }: { sessionId: string }) {
  const { t } = useLanguage()
  const { data, isLoading } = useQuery({ queryKey: ['workshop-signups', sessionId], queryFn: () => listWorkshopSignups(sessionId) })
  if (isLoading) return <div className="px-1 py-2 text-[12px] text-muted">…</div>
  const rows = data ?? []
  const joined = rows.filter((r) => r.joined_at).length
  return (
    <div className="mt-2 rounded-lg bg-bg-soft p-3 text-[12.5px]">
      <div className="mb-1 font-semibold text-navy">
        {t('ownerWorkshops.rosterCount', { reserved: String(rows.length), joined: String(joined) })}
      </div>
      {rows.length === 0 && <div className="text-muted">{t('ownerWorkshops.noSignups')}</div>}
      <div className="flex flex-col gap-0.5">
        {rows.map((r) => (
          <div key={r.user_id} className="flex items-center justify-between gap-2 text-navy" dir="ltr">
            <span className="truncate">{r.user_id}</span>
            <span className={r.joined_at ? 'text-success' : 'text-muted'}>{r.joined_at ? '✓' : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WorkshopRow({ ws, onChanged }: { ws: GroupSession; onChanged: () => void }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const setStatus = useMutation({
    mutationFn: (status: GroupSessionStatus) => updateWorkshop(ws.id, { status }),
    onSuccess: onChanged,
  })
  const remove = useMutation({ mutationFn: () => deleteWorkshop(ws.id), onSuccess: onChanged })
  const fmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh' }).format(new Date(ws.scheduled_at))

  return (
    <div className="rounded-lg border border-border-2 bg-white p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[14px] font-bold text-navy">{ws.title}</div>
          <div className="text-[12px] text-muted" dir="ltr">
            {fmt} · {ws.duration_min}m · {ws.seats_taken}/{ws.capacity} · {ws.status}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {ws.status !== 'ended' && ws.status !== 'cancelled' && (
            <button
              onClick={() => navigate(`/group-call/${ws.id}`)}
              className="rounded-md bg-navy px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-navy-hover"
            >
              {t('ownerWorkshops.joinHost')}
            </button>
          )}
          {ws.status !== 'live' && (
            <button onClick={() => setStatus.mutate('live')} className="rounded-md border border-success px-2.5 py-1 text-[11.5px] font-semibold text-success hover:bg-success-bg">
              {t('ownerWorkshops.goLive')}
            </button>
          )}
          {ws.status !== 'ended' && (
            <button onClick={() => setStatus.mutate('ended')} className="rounded-md border border-border px-2.5 py-1 text-[11.5px] text-navy hover:bg-bg-soft">
              {t('ownerWorkshops.end')}
            </button>
          )}
          <button onClick={() => setOpen((v) => !v)} className="rounded-md border border-border px-2.5 py-1 text-[11.5px] text-navy hover:bg-bg-soft">
            {t('ownerWorkshops.roster')}
          </button>
          <button
            onClick={() => confirm(t('ownerWorkshops.confirmDelete')) && remove.mutate()}
            className="rounded-md border border-error px-2.5 py-1 text-[11.5px] text-error hover:bg-error-bg"
          >
            {t('dash.delete')}
          </button>
        </div>
      </div>
      {open && <Roster sessionId={ws.id} />}
    </div>
  )
}

export function OwnerWorkshopsPage() {
  const { t } = useLanguage()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['workshops-all'], queryFn: listAllWorkshops })
  const refresh = () => void qc.invalidateQueries({ queryKey: ['workshops-all'] })

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('ownerWorkshops.title')}</div>
      <div className="mb-5 text-[13.5px] text-muted">{t('ownerWorkshops.subtitle')}</div>

      <CreateForm onCreated={refresh} />

      <div className="mt-5 flex flex-col gap-2.5">
        {isLoading && <LoadingState />}
        {!isLoading && (data ?? []).length === 0 && <div className="text-[13px] text-muted">{t('ownerWorkshops.none')}</div>}
        {(data ?? []).map((ws) => (
          <WorkshopRow key={ws.id} ws={ws} onChanged={refresh} />
        ))}
      </div>
    </div>
  )
}
