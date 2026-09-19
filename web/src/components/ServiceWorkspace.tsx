import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import {
  addSession,
  addTask,
  deleteSession,
  deleteTask,
  listSessions,
  listTasks,
  submitServiceTask,
  clearServiceTaskSubmission,
  gradeServiceTask,
  uploadServiceAttachment,
  taskState,
  sessionPhase,
  sessionStartMs,
  type SessionPhase,
  type ServiceSession,
  type ServiceTask,
} from '@/lib/serviceWorkspace'
import { triggerPush } from '@/lib/push'
import { ServiceChat } from '@/components/ServiceChat'
import { ServiceAttachmentView } from '@/components/ServiceAttachmentView'

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
  const isVideo = !!session.is_video
  const hasLink = !!session.link?.trim()
  const btnClass =
    'mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-[12.5px] font-bold text-white no-underline shadow-sm transition-transform hover:scale-[1.02] hover:opacity-95'
  const canJoin = (phase === 'joinable' || phase === 'live' || phase === 'no_time') && (isVideo || hasLink)

  if (canJoin) {
    if (isVideo) {
      return (
        <Link to={`/call/${session.id}`} className={btnClass}>
          🎥 {t('workspace.join')}
        </Link>
      )
    }
    return (
      <a href={session.link!} target="_blank" rel="noreferrer" className={btnClass}>
        ▶ {t('workspace.join')}
      </a>
    )
  }

  let msg: string
  if (phase === 'ended') msg = t('session.ended')
  else if (phase === 'upcoming' && start) msg = `${t('session.opensBefore')} · ${t('session.startsIn')} ${countdown(start - now, lang)}`
  else if (!isVideo && !hasLink) msg = manage ? t('session.addLinkHint') : t('session.noLinkYet')
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
  const [isVideo, setIsVideo] = useState(true)

  const add = useMutation({
    mutationFn: () =>
      addSession({
        request_id: requestId,
        title: title.trim(),
        session_date: date || null,
        session_time: time || null,
        link: isVideo ? null : link.trim() || null,
        is_video: isVideo,
      }),
    onSuccess: () => {
      triggerPush('service_session', requestId)
      setTitle(''); setDate(''); setTime(''); setLink(''); setIsVideo(true); setOpen(false); onChange()
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
          <label className="flex items-center gap-2 text-[12.5px] font-medium text-navy">
            <input type="checkbox" checked={isVideo} onChange={(e) => setIsVideo(e.target.checked)} className="h-4 w-4" />
            🎥 {t('workspace.videoSession')}
          </label>
          {!isVideo && (
            <input value={link} onChange={(e) => setLink(e.target.value)} dir="ltr" placeholder={t('workspace.linkPh')} className={field} />
          )}
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

  const doneCount = tasks.filter((x) => taskState(x) === 'graded').length

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
        {tasks.map((tk) => (
          <TaskCard
            key={tk.id}
            task={tk}
            manage={manage}
            isStudent={isStudent}
            requestId={requestId}
            locale={locale}
            t={t}
            onChange={onChange}
            onDelete={() => del.mutate(tk.id)}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Single task: submit a file → teacher grades /100 → stays for reference ── */
function TaskCard({
  task,
  manage,
  isStudent,
  requestId,
  locale,
  t,
  onChange,
  onDelete,
}: {
  task: ServiceTask
  manage: boolean
  isStudent: boolean
  requestId: string
  locale: string
  t: TFn
  onChange: () => void
  onDelete: () => void
}) {
  const state = taskState(task)
  const today = new Date().toISOString().slice(0, 10)
  const overdue = state === 'open' && task.due_date && task.due_date < today
  const fileRef = useRef<HTMLInputElement>(null)
  const [grading, setGrading] = useState(false)
  const [grade, setGrade] = useState(String(task.grade ?? ''))
  const [feedback, setFeedback] = useState(task.feedback ?? '')

  const submit = useMutation({
    mutationFn: async (f: File) => {
      const att = await uploadServiceAttachment(requestId, f, `tasks/${task.id}`)
      await submitServiceTask(task.id, att)
    },
    onSuccess: () => {
      triggerPush('service_submit', task.id)
      onChange()
    },
  })
  const withdraw = useMutation({ mutationFn: () => clearServiceTaskSubmission(task.id), onSuccess: onChange })
  const saveGrade = useMutation({
    mutationFn: () => gradeServiceTask(task.id, Math.max(0, Math.min(100, Number(grade) || 0)), feedback.trim() || null),
    onSuccess: () => {
      triggerPush('service_grade', task.id)
      setGrading(false)
      onChange()
    },
  })

  const border = state === 'graded' ? 'border-success/40 bg-success/5' : state === 'submitted' ? 'border-accent/40 bg-accent/5' : 'border-border-2 bg-bg-soft'

  return (
    <div className={`rounded-lg border p-3.5 ${border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-semibold text-navy">{task.title}</span>
            <TaskStateChip state={state} t={t} />
          </div>
          {task.description && <div className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-6 text-muted-2">{task.description}</div>}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {task.due_date && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${overdue ? 'bg-error-bg text-error' : 'bg-white text-muted'}`}>
                {t('workspace.due')}: {fmtDate(task.due_date, locale)}
              </span>
            )}
            {task.link && (
              <a href={task.link} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-navy underline underline-offset-2">
                {t('workspace.openLink')}
              </a>
            )}
          </div>
        </div>
        {manage && (
          <button onClick={onDelete} className="shrink-0 rounded px-1.5 text-[13px] text-faint hover:text-error" title={t('workspace.delete')}>
            🗑
          </button>
        )}
      </div>

      {/* Submission area */}
      <div className="mt-3 border-t border-border-2/70 pt-3">
        {/* The delivered file (once submitted) — stays visible for reference. */}
        {task.submission_url && (
          <div className="mb-2">
            <div className="mb-1 text-[11.5px] font-semibold text-muted">
              {t('task.delivered')}
              {task.submitted_at ? ` · ${fmtDate(task.submitted_at.slice(0, 10), locale)}` : ''}
            </div>
            <ServiceAttachmentView path={task.submission_url} name={task.submission_name ?? null} kind="file" compact />
          </div>
        )}

        {/* Grade result (once graded) — persists. */}
        {state === 'graded' && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-lg px-2.5 py-1 text-[13px] font-bold ${(task.grade ?? 0) >= 50 ? 'bg-success/15 text-success' : 'bg-error-bg text-error'}`}>
              {task.grade}/100
            </span>
            {task.feedback && <span className="text-[12.5px] text-muted-2">💬 {task.feedback}</span>}
          </div>
        )}

        {/* Student actions */}
        {isStudent && (
          <div>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) submit.mutate(f); e.target.value = '' }} />
            {state === 'open' && (
              <button onClick={() => fileRef.current?.click()} disabled={submit.isPending} className="rounded-md bg-navy px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50">
                {submit.isPending ? t('task.uploading') : `📎 ${t('task.submit')}`}
              </button>
            )}
            {state === 'submitted' && (
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className="text-accent">{t('task.awaitingGrade')}</span>
                <button onClick={() => fileRef.current?.click()} disabled={submit.isPending} className="font-semibold text-navy underline underline-offset-2">
                  {t('task.replace')}
                </button>
                <button onClick={() => withdraw.mutate()} className="text-faint hover:text-error">
                  {t('task.withdraw')}
                </button>
              </div>
            )}
            {state === 'graded' && (
              <button onClick={() => fileRef.current?.click()} disabled={submit.isPending} className="text-[12px] font-semibold text-navy underline underline-offset-2">
                {t('task.resubmit')}
              </button>
            )}
          </div>
        )}

        {/* Teacher/owner actions */}
        {manage && state === 'open' && <div className="text-[12px] text-muted">{t('task.awaitingSubmission')}</div>}
        {manage && (state === 'submitted' || grading) && (
          <div className="mt-1 flex flex-col gap-2 rounded-lg border border-border-2 bg-white p-2.5">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="0-100"
                className="w-24 rounded-md border border-border px-2.5 py-1.5 text-[13px]"
              />
              <span className="text-[13px] font-semibold text-muted">/ 100</span>
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              placeholder={t('task.feedbackPh')}
              className={`${field} resize-y`}
            />
            <button
              onClick={() => saveGrade.mutate()}
              disabled={grade === '' || saveGrade.isPending}
              className="self-end rounded-md bg-success px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {t('task.saveGrade')}
            </button>
          </div>
        )}
        {manage && state === 'graded' && !grading && (
          <button onClick={() => setGrading(true)} className="text-[12px] font-semibold text-navy underline underline-offset-2">
            {t('task.editGrade')}
          </button>
        )}
      </div>
    </div>
  )
}

function TaskStateChip({ state, t }: { state: 'open' | 'submitted' | 'graded'; t: TFn }) {
  const map = {
    open: { label: t('task.state.open'), cls: 'bg-bg-soft text-muted' },
    submitted: { label: t('task.state.submitted'), cls: 'bg-accent/15 text-accent' },
    graded: { label: t('task.state.graded'), cls: 'bg-success/15 text-success' },
  }
  const c = map[state]
  return <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${c.cls}`}>{c.label}</span>
}
