// Course Q&A board: students ask questions, trainers and classmates reply,
// and the asker or staff mark a question as answered. Trainers are notified of
// new questions; askers are notified of replies (see migration 0086 triggers).
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { LoadingState } from '@/components/LoadingState'
import { MaterialsNotReadyError, createPost, deletePost, listPosts, setPostResolved, type CoursePost } from '@/lib/courseMaterials'
import { NotMigratedNote } from './CourseMaterials'

type Filter = 'all' | 'open' | 'answered' | 'mine'

function ago(iso: string, ar: boolean) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return ar ? 'الآن' : 'just now'
  if (mins < 60) return ar ? `منذ ${mins} د` : `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return ar ? `منذ ${h} س` : `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return ar ? `منذ ${d} يوم` : `${d}d ago`
  return new Date(iso).toLocaleDateString(ar ? 'ar' : 'en-GB')
}

function Avatar({ name, staff }: { name: string; staff: boolean }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
        staff ? 'bg-navy text-white' : 'bg-gold/20 text-accent'
      }`}
    >
      {(name || '؟').trim().charAt(0)}
    </span>
  )
}

export function CourseDiscussion({ courseId, staff = false }: { courseId: string; staff?: boolean }) {
  const { profile } = useAuth()
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [openThread, setOpenThread] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['course-posts', courseId],
    queryFn: () => listPosts(courseId),
    retry: false,
    refetchInterval: 30_000,
  })
  const refresh = () => void qc.invalidateQueries({ queryKey: ['course-posts', courseId] })

  const { questions, replies } = useMemo(() => {
    const all = data ?? []
    const replies = new Map<string, CoursePost[]>()
    for (const p of all) if (p.parent_id) replies.set(p.parent_id, [...(replies.get(p.parent_id) ?? []), p])
    const questions = all.filter((p) => !p.parent_id).reverse()
    return { questions, replies }
  }, [data])

  if (isLoading) return <LoadingState />
  if (error instanceof MaterialsNotReadyError) return staff ? <NotMigratedNote /> : null

  const isStaff = (p: CoursePost) => p.authorRole === 'teacher' || p.authorRole === 'owner'
  const answered = (q: CoursePost) => q.resolved || (replies.get(q.id) ?? []).some(isStaff)
  const shown = questions.filter((q) =>
    filter === 'open' ? !answered(q) : filter === 'answered' ? answered(q) : filter === 'mine' ? q.author_id === profile?.id : true,
  )
  const openCount = questions.filter((q) => !answered(q)).length

  const ask = async () => {
    if (!draft.trim()) return
    setBusy(true)
    try {
      await createPost(courseId, draft.trim(), null)
      setDraft('')
      refresh()
    } finally {
      setBusy(false)
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: ar ? `الكل (${questions.length})` : `All (${questions.length})` },
    { key: 'open', label: ar ? `بانتظار الرد (${openCount})` : `Awaiting reply (${openCount})` },
    { key: 'answered', label: ar ? 'تمت الإجابة' : 'Answered' },
    ...(!staff ? [{ key: 'mine' as Filter, label: ar ? 'أسئلتي' : 'My questions' }] : []),
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Ask box */}
      <div className="rounded-2xl border border-border bg-white p-4 md:p-5">
        <div className="mb-2 text-[14.5px] font-bold text-navy">
          {staff ? (ar ? 'انشر سؤالًا أو موضوعًا للنقاش' : 'Start a discussion') : ar ? 'اسأل المدرّب وزملاءك' : 'Ask the trainer and classmates'}
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder={ar ? 'اكتب سؤالك بوضوح، واذكر رقم المحاضرة أو الملف إن أمكن…' : 'Write your question clearly — mention the lecture or file if you can…'}
          className="w-full resize-y rounded-xl border border-border px-3.5 py-2.5 text-[14px] leading-7"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="text-[11.5px] text-muted">{ar ? 'يراه المدرّب وجميع طلاب الدورة.' : 'Visible to the trainer and all students in this course.'}</div>
          <button
            onClick={() => void ask()}
            disabled={busy || !draft.trim()}
            className="rounded-full bg-navy px-5 py-2 text-[13px] font-bold text-white hover:bg-navy-hover disabled:opacity-40"
          >
            {busy ? '…' : staff ? (ar ? 'نشر' : 'Post') : ar ? 'إرسال السؤال' : 'Ask'}
          </button>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold ${
                filter === f.key ? 'border-navy bg-navy text-white' : 'border-border bg-white text-navy hover:border-navy'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {questions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-bg-soft/60 px-6 py-10 text-center text-[13px] text-muted">
          {ar ? 'لا توجد أسئلة بعد — كن أول من يسأل!' : 'No questions yet — be the first to ask!'}
        </div>
      )}

      {shown.map((q) => (
        <Thread
          key={q.id}
          q={q}
          replies={replies.get(q.id) ?? []}
          answered={answered(q)}
          open={openThread === q.id}
          onToggle={() => setOpenThread((t) => (t === q.id ? null : q.id))}
          canModerate={staff || q.author_id === profile?.id}
          myId={profile?.id}
          staff={staff}
          isStaff={isStaff}
          courseId={courseId}
          onChange={refresh}
        />
      ))}
    </div>
  )
}

function Thread({
  q,
  replies,
  answered,
  open,
  onToggle,
  canModerate,
  myId,
  staff,
  isStaff,
  courseId,
  onChange,
}: {
  q: CoursePost
  replies: CoursePost[]
  answered: boolean
  open: boolean
  onToggle: () => void
  canModerate: boolean
  myId: string | undefined
  staff: boolean
  isStaff: (p: CoursePost) => boolean
  courseId: string
  onChange: () => void
}) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!reply.trim()) return
    setBusy(true)
    try {
      await createPost(courseId, reply.trim(), q.id)
      setReply('')
      onChange()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (p: CoursePost) => {
    if (!confirm(ar ? 'حذف هذه المشاركة؟' : 'Delete this post?')) return
    await deletePost(p.id)
    onChange()
  }

  return (
    <article className={`rounded-2xl border bg-white ${answered ? 'border-border' : 'border-gold/40'}`}>
      <div className="flex gap-3 p-4 md:p-5">
        <Avatar name={q.authorName} staff={isStaff(q)} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="font-bold text-navy">{q.authorName}</span>
            {isStaff(q) && <span className="rounded-full bg-navy px-2 py-0.5 text-[10.5px] font-bold text-white">{ar ? 'المدرّب' : 'Trainer'}</span>}
            <span className="text-faint">{ago(q.created_at, ar)}</span>
            <span
              className={`ms-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                answered ? 'bg-success-bg text-success' : 'bg-gold/15 text-accent'
              }`}
            >
              {answered ? (ar ? '✓ تمت الإجابة' : '✓ Answered') : ar ? 'بانتظار الرد' : 'Awaiting reply'}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-[14.5px] leading-7 text-muted-2">{q.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px]">
            <button onClick={onToggle} className="font-semibold text-navy hover:underline">
              {open
                ? ar
                  ? 'إخفاء الردود'
                  : 'Hide replies'
                : replies.length
                  ? ar
                    ? `عرض الردود (${replies.length})`
                    : `View replies (${replies.length})`
                  : ar
                    ? 'رد'
                    : 'Reply'}
            </button>
            {canModerate && (
              <button
                onClick={async () => {
                  await setPostResolved(q.id, !q.resolved)
                  onChange()
                }}
                className="text-muted hover:text-navy"
              >
                {q.resolved ? (ar ? 'إعادة فتح' : 'Reopen') : ar ? 'تحديد كمُجاب' : 'Mark answered'}
              </button>
            )}
            {(staff || q.author_id === myId) && (
              <button onClick={() => void remove(q)} className="text-error/80 hover:text-error">
                {ar ? 'حذف' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-border-2 bg-bg-soft/50 px-4 py-3 md:px-5">
          <div className="flex flex-col gap-3">
            {replies.map((r) => (
              <div key={r.id} className={`flex gap-3 rounded-xl p-3 ${isStaff(r) ? 'bg-navy/[0.04] ring-1 ring-navy/10' : 'bg-white'}`}>
                <Avatar name={r.authorName} staff={isStaff(r)} />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="font-bold text-navy">{r.authorName}</span>
                    {isStaff(r) && <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold text-white">{ar ? 'المدرّب' : 'Trainer'}</span>}
                    <span className="text-faint">{ago(r.created_at, ar)}</span>
                    {(staff || r.author_id === myId) && (
                      <button onClick={() => void remove(r)} className="ms-auto text-[11.5px] text-error/70 hover:text-error">
                        {ar ? 'حذف' : 'Delete'}
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-[14px] leading-7 text-muted-2">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={2}
              placeholder={ar ? 'اكتب ردك…' : 'Write a reply…'}
              className="min-w-0 flex-1 resize-y rounded-xl border border-border bg-white px-3 py-2 text-[13.5px] leading-6"
            />
            <button
              onClick={() => void send()}
              disabled={busy || !reply.trim()}
              className="self-end rounded-full bg-navy px-4 py-2 text-[12.5px] font-bold text-white hover:bg-navy-hover disabled:opacity-40"
            >
              {busy ? '…' : ar ? 'رد' : 'Reply'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
