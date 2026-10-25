import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { listActiveTeachers } from '@/lib/courses'
import { LoadingState } from '@/components/LoadingState'
import {
  createWorkshop,
  deleteWorkshop,
  inviteToWorkshop,
  listAllWorkshops,
  listWorkshopSignups,
  removeFromWorkshop,
  updateWorkshop,
  type GroupSession,
  type GroupSessionStatus,
  type PersonOption,
} from '@/lib/groupSessions'
import { InvitePicker } from '@/components/InvitePicker'

const field = 'w-full rounded-md border border-border px-3 py-2 text-[13.5px]'

// A datetime-local value (local wall clock) → ISO instant, anchored to Saudi
// time (UTC+3, no DST) so the stored instant matches what the admin typed.
function localToIso(local: string): string {
  return new Date(`${local}:00+03:00`).toISOString()
}
// Private workshops need migration 0088 (is_private column + invite RPC).
function privateError(e: unknown, ar: boolean): string {
  const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? '')
  if (/is_private|invite_to_group_session|PGRST20[24]/i.test(msg + ((e as { code?: string })?.code ?? ''))) {
    return ar
      ? 'الورش الخاصة تحتاج تشغيل ملف الترحيل 0088_private_workshops.sql في Supabase أولًا.'
      : 'Private workshops need migration 0088_private_workshops.sql run in Supabase first.'
  }
  return msg || (ar ? 'تعذّر الحفظ' : 'Save failed')
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const { t, lang } = useLanguage()
  const ar = lang === 'ar'
  const { data: teachers } = useQuery({ queryKey: ['active-teachers'], queryFn: listActiveTeachers })
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [when, setWhen] = useState('')
  const [duration, setDuration] = useState('60')
  const [capacity, setCapacity] = useState('15')
  const [hostId, setHostId] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [invitees, setInvitees] = useState<PersonOption[]>([])

  const create = useMutation({
    mutationFn: async () => {
      const id = await createWorkshop({
        title: title.trim(),
        description: description.trim() || null,
        scheduled_at: localToIso(when),
        duration_min: Math.max(10, Number(duration) || 60),
        // Private: the invite RPC raises capacity to fit everyone invited.
        capacity: isPrivate ? Math.max(2, invitees.length) : Math.max(2, Number(capacity) || 15),
        host_id: hostId || null,
        // Only sent when private, so public creation still works pre-0088.
        ...(isPrivate ? { is_private: true } : {}),
      })
      if (isPrivate) await inviteToWorkshop(id, invitees.map((p) => p.id))
    },
    onSuccess: () => {
      setTitle('')
      setDescription('')
      setWhen('')
      setDuration('60')
      setCapacity('15')
      setHostId('')
      setIsPrivate(false)
      setInvitees([])
      onCreated()
    },
  })

  const valid = title.trim() && when && (!isPrivate || invitees.length > 0)

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
        {!isPrivate && (
          <label className="text-[12px] text-muted">
            {t('ownerWorkshops.capacity')}
            <input type="number" min={2} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={`${field} mt-1`} />
          </label>
        )}
      </div>

      {/* Who can see & join */}
      <div className="mt-3.5">
        <div className="mb-1.5 text-[12px] font-semibold text-navy">{ar ? 'من يرى الورشة ويدخلها؟' : 'Who can see and join?'}</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { v: false, title: ar ? 'عامة' : 'Public', hint: ar ? 'كل أصحاب الحسابات يرونها ويحجزون مقعدًا' : 'Every account sees it and can reserve a seat' },
            { v: true, title: ar ? '🔒 خاصة' : '🔒 Private', hint: ar ? 'فقط من تختارهم يرونها ويدخلونها' : 'Only the people you pick see and join it' },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => setIsPrivate(o.v)}
              className={`rounded-lg border p-3 text-start transition-colors ${
                isPrivate === o.v ? 'border-navy bg-white ring-1 ring-navy' : 'border-border bg-white/60 hover:border-navy'
              }`}
            >
              <div className="text-[13.5px] font-bold text-navy">{o.title}</div>
              <div className="mt-0.5 text-[11.5px] text-muted">{o.hint}</div>
            </button>
          ))}
        </div>
        {isPrivate && (
          <div className="mt-2.5 rounded-lg border border-border bg-white p-3">
            <InvitePicker
              selected={invitees}
              onAdd={(people) => setInvitees((cur) => [...cur, ...people.filter((p) => !cur.some((c) => c.id === p.id))])}
              onRemove={(id) => setInvitees((cur) => cur.filter((p) => p.id !== id))}
            />
            <div className="mt-2 text-[11.5px] text-muted">
              {ar
                ? 'يُسجَّل المدعوون تلقائيًا ويصلهم إشعار، ولا تظهر الورشة لغيرهم.'
                : 'Invitees are registered automatically and notified; nobody else sees the workshop.'}
            </div>
          </div>
        )}
      </div>

      {create.error && <div className="mt-2 text-[12.5px] text-error">{privateError(create.error, ar)}</div>}
      <div className="mt-3 flex items-center justify-end gap-3">
        {isPrivate && invitees.length === 0 && (
          <span className="text-[12px] text-muted">{ar ? 'أضف مدعوًا واحدًا على الأقل' : 'Add at least one invitee'}</span>
        )}
        <button
          disabled={!valid || create.isPending}
          onClick={() => create.mutate()}
          className="rounded-md bg-navy px-5 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {create.isPending ? '…' : t('ownerWorkshops.createBtn')}
        </button>
      </div>
    </div>
  )
}

function Roster({ ws, onChanged }: { ws: GroupSession; onChanged: () => void }) {
  const { t, lang } = useLanguage()
  const ar = lang === 'ar'
  const qc = useQueryClient()
  const sessionId = ws.id
  const { data, isLoading } = useQuery({ queryKey: ['workshop-signups', sessionId], queryFn: () => listWorkshopSignups(sessionId) })
  const [adding, setAdding] = useState(false)
  const [pending, setPending] = useState<PersonOption[]>([])
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['workshop-signups', sessionId] })
    onChanged()
  }
  const invite = useMutation({
    mutationFn: () => inviteToWorkshop(sessionId, pending.map((p) => p.id)),
    onSuccess: () => {
      setPending([])
      setAdding(false)
      refresh()
    },
  })
  const remove = useMutation({ mutationFn: (userId: string) => removeFromWorkshop(sessionId, userId), onSuccess: refresh })

  if (isLoading) return <div className="px-1 py-2 text-[12px] text-muted">…</div>
  const rows = data ?? []
  const joined = rows.filter((r) => r.joined_at).length
  return (
    <div className="mt-2 rounded-lg bg-bg-soft p-3 text-[12.5px]">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-navy">
          {ws.is_private
            ? ar
              ? `المدعوون: ${rows.length} · دخل منهم: ${joined}`
              : `Invited: ${rows.length} · joined: ${joined}`
            : t('ownerWorkshops.rosterCount', { reserved: String(rows.length), joined: String(joined) })}
        </div>
        {ws.is_private && !adding && (
          <button onClick={() => setAdding(true)} className="rounded-md bg-navy px-3 py-1 text-[11.5px] font-semibold text-white hover:bg-navy-hover">
            {ar ? '+ إضافة مدعوين' : '+ Invite more'}
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-3 rounded-lg border border-border bg-white p-3">
          <InvitePicker
            selected={pending}
            exclude={new Set(rows.map((r) => r.user_id))}
            onAdd={(people) => setPending((cur) => [...cur, ...people.filter((p) => !cur.some((c) => c.id === p.id))])}
            onRemove={(id) => setPending((cur) => cur.filter((p) => p.id !== id))}
          />
          {invite.error && <div className="mt-2 text-error">{privateError(invite.error, ar)}</div>}
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={() => invite.mutate()}
              disabled={pending.length === 0 || invite.isPending}
              className="rounded-md bg-navy px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
            >
              {invite.isPending ? '…' : ar ? `دعوة (${pending.length})` : `Invite (${pending.length})`}
            </button>
            <button
              onClick={() => {
                setAdding(false)
                setPending([])
              }}
              className="rounded-md border border-border bg-white px-3 py-1.5 text-[12px] text-navy"
            >
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 && <div className="text-muted">{t('ownerWorkshops.noSignups')}</div>}
      <div className="flex flex-col divide-y divide-border-2">
        {rows.map((r) => (
          <div key={r.user_id} className="flex items-center justify-between gap-2 py-1.5 text-navy">
            <span className="min-w-0">
              <span className="block truncate font-semibold">{r.name || r.user_id}</span>
              {r.username && (
                <span className="block truncate text-[11px] text-muted" dir="ltr">
                  @{r.username}
                </span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className={`text-[11.5px] ${r.joined_at ? 'text-success' : 'text-muted'}`}>
                {r.joined_at ? (ar ? '✓ دخل' : '✓ joined') : ar ? 'لم يدخل' : 'not joined'}
              </span>
              <button
                onClick={() => confirm(ar ? `إزالة ${r.name || ''} من الورشة؟` : `Remove ${r.name || ''} from this workshop?`) && remove.mutate(r.user_id)}
                className="rounded px-1.5 text-[11.5px] text-error/80 hover:bg-error-bg hover:text-error"
              >
                {ar ? 'إزالة' : 'Remove'}
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WorkshopRow({ ws, onChanged }: { ws: GroupSession; onChanged: () => void }) {
  const { t, lang } = useLanguage()
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
          <div className="flex items-center gap-2 text-[14px] font-bold text-navy">
            {ws.title}
            {ws.is_private && (
              <span className="rounded-full bg-navy/[0.08] px-2 py-0.5 text-[10.5px] font-bold text-navy">🔒 {lang === 'ar' ? 'خاصة' : 'Private'}</span>
            )}
          </div>
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
            {ws.is_private ? (lang === 'ar' ? 'المدعوون' : 'Invitees') : t('ownerWorkshops.roster')}
          </button>
          <button
            onClick={() => confirm(t('ownerWorkshops.confirmDelete')) && remove.mutate()}
            className="rounded-md border border-error px-2.5 py-1 text-[11.5px] text-error hover:bg-error-bg"
          >
            {t('dash.delete')}
          </button>
        </div>
      </div>
      {open && <Roster ws={ws} onChanged={onChanged} />}
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
