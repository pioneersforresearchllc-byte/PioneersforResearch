import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import {
  addSession,
  addTask,
  deleteSession,
  deleteTask,
  listSessions,
  listTasks,
  setTaskDone,
  sessionPhase,
  sessionStartMs,
  type SessionPhase,
  type ServiceSession,
  type ServiceTask,
} from '@/lib/serviceWorkspace'
import { triggerPush } from '@/lib/push'
import { ServiceChat } from '@/components/ServiceChat'

const field = 'w-full box-border rounded-md border border-border px-3 py-2 text-[13px]'

/** A clock that ticks every 20s so session phases/countdowns stay live without
 * a manual refresh. */
function useNow(intervalMs = 20000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function countdown(ms: number, lang: string): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const d = Math.floor(total / 86400)
  if (lang === 'ar') {
    if (d >= 1) return `${d} يوم`
    if (h >= 1) return `${h} س و ${m} د`
    return `${m} دقيقة`
  }
  if (d >= 1) return `${d}d`
  if (h >= 1) return `${h}h ${m}m`
  return `${m}m`
}

function PhaseChip({ phase, t }: { phase: SessionPhase; t: TFn }) {
  const map: Partial<Record<SessionPhase, { label: string; cls: string; dot?: boolean }>> = {
    upcoming: { label: t('session.upcoming'), cls: 'bg-gold/15 text-accent' },
    joinable: { label: t('session.soon'), cls: 'bg-accent/15 text-accent' },
    live: { label: t('session.live'), cls: 'bg-success/15 text-success', dot: true },
    ended: { label: t('session.ended'), cls: 'bg-bg-soft text-faint' },
  }
  const c = map[phase]
  if (!c) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${c.cls}`}>
      {c.dot && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />}
      {c.label}
    </span>
  )
}

function SessionJoin({
  session,
  phase,
  now,
  manage,
  lang,
  t,
}: {
  session: ServiceSession
  phase: SessionPhase
  now: number
  manage: boolean
  lang: string
  t: TFn
}) {
  const start = sessionStartMs(session)
  const hasLink = !!session.link?.trim()
  const canJoin = (phase === 'joinable' || phase === 'live' || phase === 'no_time') && hasLink

  if (canJoin) {
    return (
      <a
        href={session.link!}
        target="_blank"
        rel="noreferrer"
        className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-[12.5px] font-bold text-white no-underline shadow-sm transition-transform hover:scale-[1.02] hover:opacity-95"
      >
        ▶ {t('workspace.join')}
      </a>
    )
  }

  let msg: string
  if (phase === 'ended') msg = t('session.ended')
  else if (phase === 'upcoming' && start) msg = `${t('session.opensBefore')} · ${t('session.startsIn')} ${countdown(start - now, lang)}`
  else if (!hasLink) msg = manage ? t('session.addLinkHint') : t('session.noLinkYet')
  else msg = t('session.notReady')

  return (
    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 py-2 text-[12px] font-semibold text-muted">
      🔒 {t('workspace.join')} <span className="font-normal text-faint">— {msg}</span>
    </div>
  )
}

function fmtDate(d: string | null, locale: string): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long' })
}
function fmtTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = Number(h)
  const ampmA = hr < 12 ? 'ص' : 'م'
  const h12 = hr % 12 || 12
  return `${h12}:${m} ${ampmA}`
}

export function ServiceWorkspace({
  requestId,
  manage,
  isStudent,
}: {
  requestId: string
  manage: boolean
  isStudent: boolean
}) {
  const { t, lang } = useLanguage()
  const qc = useQueryClient()
  const locale = lang === 'ar' ? 'ar' : 'en-US'

  const sessionsQ = useQuery({ queryKey: ['svc-sessions', requestId], queryFn: () => listSessions(requestId) })
  const tasksQ = useQuery({ queryKey: ['svc-tasks', requestId], queryFn: () => listTasks(requestId) })

  const invalidate = (key: string) => qc.invalidateQueries({ queryKey: [key, requestId] })

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SessionsPanel
          sessions={sessionsQ.data ?? []}
          loading={sessionsQ.isLoading}
          manage={manage}
          requestId={requestId}
          locale={locale}
          t={t}
          onChange={() => invalidate('svc-sessions')}
        />
        <TasksPanel
          tasks={tasksQ.data ?? []}
          loading={tasksQ.isLoading}
          manage={manage}
          isStudent={isStudent}
          requestId={requestId}
          locale={locale}
          t={t}
          onChange={() => invalidate('svc-tasks')}
        />
      </div>
      <ServiceChat requestId={requestId} />
    </div>
  )
}

type TFn = ReturnType<typeof useLanguage>['t']

/* ── Sessions ─────────────────────────────────────────────────────────── */
function SessionsPanel({
  sessions,
  loading,
  manage,
  requestId,
  locale,
  t,
  onChange,
}: {
  sessions: ServiceSession[]
  loading: boolean
  manage: boolean
  requestId: string
  locale: string
  t: TFn
  onChange: () => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [link, setLink] = useState('')

  const add = useMutation({
    mutationFn: () =>
      addSession({ request_id: requestId, title: title.trim(), session_date: date || null, session_time: time || null, link: link.trim() || null }),
    onSuccess: () => {
      triggerPush('service_session', requestId)
      setTitle(''); setDate(''); setTime(''); setLink(''); setOpen(false); onChange()
    },
  })
  const del = useMutation({ mutationFn: (id: string) => deleteSession(id), onSuccess: onChange })
  const now = useNow()
  const lang = locale === 'ar' ? 'ar' : 'en'

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[14px] font-bold text-navy">📅 {t('workspace.sessions')}</div>
        {manage && (
          <button onClick={() => setOpen((v) => !v)} className="rounded-md border border-navy px-3 py-1 text-[12px] font-semibold text-navy hover:bg-bg-soft">
            {open ? t('workspace.cancel') : `+ ${t('workspace.addSession')}`}
          </button>
        )}
      </div>

      {manage && open && (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border border-border-2 bg-bg-soft p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('workspace.sessionTitlePh')} className={field} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
          </div>
          <input value={link} onChange={(e) => setLink(e.target.value)} dir="ltr" placeholder={t('workspace.linkPh')} className={field} />
          <button
            onClick={() => title.trim() && add.mutate()}
            disabled={!title.trim() || add.isPending}
            className="self-end rounded-md bg-navy px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
          >
            {t('workspace.save')}
          </button>
        </div>
      )}

      {loading && <div className="text-[13px] text-muted">…</div>}
      {!loading && sessions.length === 0 && <div className="py-4 text-center text-[13px] text-faint">{t('workspace.noSessions')}</div>}

      <div className="flex flex-col gap-2.5">
        {sessions.map((s) => {
          const phase = sessionPhase(s, now)
          const accent =
            phase === 'live' ? 'bg-success' : phase === 'joinable' ? 'bg-accent' : phase === 'ended' ? 'bg-border' : 'bg-gold'
          return (
            <div key={s.id} className="relative rounded-lg border border-border-2 bg-bg-soft p-3 ps-4">
              <span className={`absolute inset-y-2 start-0 w-1 rounded-full ${accent}`} />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-navy">{s.title}</span>
                    <PhaseChip phase={phase} t={t} />
                  </div>
                  {(s.session_date || s.session_time) && (
                    <div className="mt-0.5 text-[12px] text-muted">
                      {fmtDate(s.session_date, locale)}
                      {s.session_time ? ` · ${fmtTime(s.session_time)}` : ''}
                    </div>
                  )}
                </div>
                {manage && (
                  <button onClick={() => del.mutate(s.id)} className="shrink-0 rounded px-1.5 text-[13px] text-faint hover:text-error" title={t('workspace.delete')}>
                    🗑
                  </button>
                )}
              </div>
              <SessionJoin session={s} phase={phase} now={now} manage={manage} lang={lang} t={t} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Tasks ────────────────────────────────────────────────────────────── */
function TasksPanel({
  tasks,
  loading,
  manage,
  isStudent,
  requestId,
  locale,
  t,
  onChange,
}: {
  tasks: ServiceTask[]
  loading: boolean
  manage: boolean
  isStudent: boolean
  requestId: string
  locale: string
  t: TFn
  onChange: () => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [due, setDue] = useState('')
  const [link, setLink] = useState('')

  const add = useMutation({
    mutationFn: () =>
      addTask({ request_id: requestId, title: title.trim(), description: desc.trim() || null, due_date: due || null, link: link.trim() || null }),
    onSuccess: () => {
      triggerPush('service_task', requestId)
      setTitle(''); setDesc(''); setDue(''); setLink(''); setOpen(false); onChange()
    },
  })
  const del = useMutation({ mutationFn: (id: string) => deleteTask(id), onSuccess: onChange })
  const toggle = useMutation({ mutationFn: (v: { id: string; done: boolean }) => setTaskDone(v.id, v.done), onSuccess: onChange })

  const today = new Date().toISOString().slice(0, 10)
  const doneCount = tasks.filter((x) => x.done).length

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[14px] font-bold text-navy">
          ✓ {t('workspace.tasks')}{' '}
          {tasks.length > 0 && <span className="text-[12px] font-normal text-muted">({doneCount}/{tasks.length})</span>}
        </div>
        {manage && (
          <button onClick={() => setOpen((v) => !v)} className="rounded-md border border-navy px-3 py-1 text-[12px] font-semibold text-navy hover:bg-bg-soft">
            {open ? t('workspace.cancel') : `+ ${t('workspace.addTask')}`}
          </button>
        )}
      </div>

      {manage && open && (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border border-border-2 bg-bg-soft p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('workspace.taskTitlePh')} className={field} />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder={t('workspace.taskDescPh')} className={`${field} resize-y`} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} />
            <input value={link} onChange={(e) => setLink(e.target.value)} dir="ltr" placeholder={t('workspace.linkPh')} className={field} />
          </div>
          <button
            onClick={() => title.trim() && add.mutate()}
            disabled={!title.trim() || add.isPending}
            className="self-end rounded-md bg-navy px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
          >
            {t('workspace.save')}
          </button>
        </div>
      )}

      {loading && <div className="text-[13px] text-muted">…</div>}
      {!loading && tasks.length === 0 && <div className="py-4 text-center text-[13px] text-faint">{t('workspace.noTasks')}</div>}

      <div className="flex flex-col gap-2.5">
        {tasks.map((tk) => {
          const overdue = !tk.done && tk.due_date && tk.due_date < today
          return (
            <div key={tk.id} className={`rounded-lg border p-3 ${tk.done ? 'border-success/30 bg-success/5' : 'border-border-2 bg-bg-soft'}`}>
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={tk.done}
                  disabled={!isStudent && !manage}
                  onChange={(e) => toggle.mutate({ id: tk.id, done: e.target.checked })}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-success)]"
                />
                <div className="min-w-0 flex-1">
                  <div className={`text-[13.5px] font-semibold ${tk.done ? 'text-muted line-through' : 'text-navy'}`}>{tk.title}</div>
                  {tk.description && <div className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-6 text-muted-2">{tk.description}</div>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {tk.due_date && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${overdue ? 'bg-error-bg text-error' : 'bg-white text-muted'}`}>
                        {t('workspace.due')}: {fmtDate(tk.due_date, locale)}
                      </span>
                    )}
                    {tk.link && (
                      <a href={tk.link} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-navy underline underline-offset-2">
                        {t('workspace.openLink')}
                      </a>
                    )}
                  </div>
                </div>
                {manage && (
                  <button onClick={() => del.mutate(tk.id)} className="shrink-0 rounded px-1.5 text-[13px] text-faint hover:text-error" title={t('workspace.delete')}>
                    🗑
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
