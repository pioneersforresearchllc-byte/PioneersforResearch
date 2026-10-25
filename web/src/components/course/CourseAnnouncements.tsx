// Course announcements: trainers / the owner post updates (optionally pinned);
// enrolled students read them and get a bell notification for each new one.
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { Markdown } from '@/components/Markdown'
import { LoadingState } from '@/components/LoadingState'
import {
  MaterialsNotReadyError,
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
  type CourseAnnouncement,
} from '@/lib/courseMaterials'
import { NotMigratedNote } from './CourseMaterials'

function when(iso: string, ar: boolean) {
  return new Date(iso).toLocaleString(ar ? 'ar' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

export function useAnnouncements(courseId: string) {
  return useQuery({ queryKey: ['course-announcements', courseId], queryFn: () => listAnnouncements(courseId), retry: false })
}

/** The latest pinned (or newest) announcement as a compact banner. */
export function AnnouncementBanner({ courseId, onOpen }: { courseId: string; onOpen: () => void }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const { data } = useAnnouncements(courseId)
  const top = data?.[0]
  if (!top) return null
  const fresh = Date.now() - new Date(top.created_at).getTime() < 7 * 24 * 3_600_000
  if (!top.pinned && !fresh) return null
  return (
    <button
      onClick={onOpen}
      className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-gold/40 bg-gold/[0.08] px-4 py-3 text-start hover:bg-gold/[0.12]"
    >
      <span className="text-[20px]" aria-hidden>
        📣
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11.5px] font-bold text-accent">{top.pinned ? (ar ? 'إعلان مثبّت' : 'Pinned') : ar ? 'إعلان جديد' : 'New announcement'}</span>
        <span className="block truncate text-[14px] font-semibold text-navy">{top.title}</span>
      </span>
      <span className="shrink-0 text-[12.5px] font-semibold text-navy">{ar ? 'عرض ←' : 'View →'}</span>
    </button>
  )
}

export function CourseAnnouncements({ courseId, manage = false }: { courseId: string; manage?: boolean }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const qc = useQueryClient()
  const { data, isLoading, error } = useAnnouncements(courseId)
  const [composing, setComposing] = useState(false)
  const [editing, setEditing] = useState<CourseAnnouncement | null>(null)

  const refresh = () => void qc.invalidateQueries({ queryKey: ['course-announcements', courseId] })

  if (isLoading) return <LoadingState />
  if (error instanceof MaterialsNotReadyError) return manage ? <NotMigratedNote /> : null

  return (
    <div className="flex flex-col gap-3">
      {manage && !composing && !editing && (
        <button
          onClick={() => setComposing(true)}
          className="self-start rounded-md bg-navy px-4 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover"
        >
          {ar ? '+ إعلان جديد' : '+ New announcement'}
        </button>
      )}
      {(composing || editing) && (
        <Composer
          courseId={courseId}
          existing={editing}
          onDone={() => {
            setComposing(false)
            setEditing(null)
            refresh()
          }}
          onCancel={() => {
            setComposing(false)
            setEditing(null)
          }}
        />
      )}

      {(data ?? []).length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-bg-soft/60 px-6 py-10 text-center text-[13px] text-muted">
          {ar ? 'لا توجد إعلانات بعد.' : 'No announcements yet.'}
        </div>
      )}

      {(data ?? []).map((a) => (
        <article
          key={a.id}
          className={`rounded-2xl border bg-white p-5 ${a.pinned ? 'border-gold/50 shadow-[0_0_0_3px_rgba(201,162,75,0.08)]' : 'border-border'}`}
        >
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {a.pinned && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10.5px] font-bold text-accent">📌 {ar ? 'مثبّت' : 'Pinned'}</span>}
                <h3 className="text-[15.5px] font-bold text-navy">{a.title}</h3>
              </div>
              <div className="mt-0.5 text-[12px] text-muted">
                {a.authorName && `${a.authorName} · `}
                {when(a.created_at, ar)}
              </div>
            </div>
            {manage && (
              <div className="flex gap-1.5 text-[12px]">
                <button
                  onClick={async () => {
                    await updateAnnouncement(a.id, { pinned: !a.pinned })
                    refresh()
                  }}
                  className="rounded-md border border-border px-2.5 py-1 text-navy hover:border-navy"
                >
                  {a.pinned ? (ar ? 'إلغاء التثبيت' : 'Unpin') : ar ? 'تثبيت' : 'Pin'}
                </button>
                <button onClick={() => setEditing(a)} className="rounded-md border border-border px-2.5 py-1 text-navy hover:border-navy">
                  {ar ? 'تعديل' : 'Edit'}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(ar ? 'حذف هذا الإعلان؟' : 'Delete this announcement?')) return
                    await deleteAnnouncement(a.id)
                    refresh()
                  }}
                  className="rounded-md border border-border px-2.5 py-1 text-error hover:border-error"
                >
                  {ar ? 'حذف' : 'Delete'}
                </button>
              </div>
            )}
          </div>
          {a.body && (
            <div className="text-[14px] leading-7 text-muted-2">
              <Markdown source={a.body} />
            </div>
          )}
        </article>
      ))}
    </div>
  )
}

function Composer({
  courseId,
  existing,
  onDone,
  onCancel,
}: {
  courseId: string
  existing: CourseAnnouncement | null
  onDone: () => void
  onCancel: () => void
}) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const [title, setTitle] = useState(existing?.title ?? '')
  const [body, setBody] = useState(existing?.body ?? '')
  const [pinned, setPinned] = useState(existing?.pinned ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!title.trim()) return setError(ar ? 'العنوان مطلوب' : 'Title is required')
    setBusy(true)
    setError('')
    try {
      if (existing) await updateAnnouncement(existing.id, { title: title.trim(), body: body.trim() || null, pinned })
      else await createAnnouncement(courseId, title.trim(), body.trim() || null, pinned)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-navy/20 bg-white p-5">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={ar ? 'عنوان الإعلان — مثال: تم رفع شرائح المحاضرة الثالثة' : 'Title — e.g. Lecture 3 slides uploaded'}
        className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder={ar ? 'التفاصيل (اختياري) — يدعم **عريض** و - قوائم و [روابط](https://…)' : 'Details (optional) — supports **bold**, - lists, [links](https://…)'}
        className="resize-y rounded-md border border-border px-3.5 py-2.5 text-[14px] leading-7"
      />
      <label className="flex items-center gap-2 text-[13px] text-navy">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        {ar ? 'تثبيت أعلى صفحة الدورة' : 'Pin to the top of the course page'}
      </label>
      {!existing && <div className="text-[11.5px] text-muted">{ar ? 'سيصل إشعار لكل الطلاب المسجّلين.' : 'All enrolled students will be notified.'}</div>}
      {error && <div className="text-[13px] text-error">{error}</div>}
      <div className="flex gap-2">
        <button
          onClick={() => void save()}
          disabled={busy}
          className="rounded-md bg-navy px-5 py-2 text-[13.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {busy ? '…' : existing ? (ar ? 'حفظ' : 'Save') : ar ? 'نشر الإعلان' : 'Post'}
        </button>
        <button onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-[13.5px] text-navy">
          {ar ? 'إلغاء' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}
