import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import {
  addSession,
  createCourse,
  deleteCourse,
  deleteSession,
  getCourseAccessCode,
  listActiveTeachers,
  listCoursesWithMeta,
  setCourseAccessCode,
  updateCourse,
  uploadCourseImage,
  type CourseFormValues,
  type CourseWithMeta,
  type TeacherOption,
} from '@/lib/courses'

function formatSar(cents: number, t: ReturnType<typeof useLanguage>['t']) {
  if (cents === 0) return t('course.free')
  return `${(cents / 100).toLocaleString('en-US')} ${t('course.currency')}`
}

const emptyForm: CourseFormValues = {
  title: '',
  description: '',
  duration_label: '',
  price_cents: 0,
  original_price_cents: null,
  image_url: null,
  completed: false,
  capacity: null,
  kind: 'course',
}

function CourseEditor({
  course,
  teachers,
  onClose,
  onSaved,
}: {
  course: CourseWithMeta | null
  teachers: TeacherOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<CourseFormValues>(
    course
      ? {
          title: course.title,
          description: course.description,
          duration_label: course.duration_label,
          price_cents: course.price_cents,
          original_price_cents: course.original_price_cents,
          image_url: course.image_url,
          completed: course.completed,
          capacity: course.capacity,
          kind: course.kind,
        }
      : emptyForm,
  )
  const { t } = useLanguage()
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>(course?.teacherIds ?? [])
  const [accessCode, setAccessCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Load the course's private access code when editing.
  useEffect(() => {
    if (course) void getCourseAccessCode(course.id).then(setAccessCode)
  }, [course])

  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionDate, setSessionDate] = useState('')
  const [sessionTime, setSessionTime] = useState('')
  const [sessionLink, setSessionLink] = useState('')

  const set = <K extends keyof CourseFormValues>(key: K, value: CourseFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const toggleTeacher = (id: string) =>
    setSelectedTeachers((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  const handleImage = async (file: File) => {
    setBusy(true)
    try {
      const url = await uploadCourseImage(file)
      set('image_url', url)
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!form.title.trim()) {
      setError(t('oCourses.nameRequired'))
      return
    }
    setBusy(true)
    setError('')
    try {
      const courseId = course ? (await updateCourse(course.id, form, selectedTeachers), course.id) : await createCourse(form, selectedTeachers)
      await setCourseAccessCode(courseId, accessCode)
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('oCourses.saveError'))
    } finally {
      setBusy(false)
    }
  }

  const addSessionRow = async () => {
    if (!course || !sessionTitle.trim() || !sessionDate || !sessionTime) return
    await addSession(course.id, {
      title: sessionTitle.trim(),
      session_date: sessionDate,
      session_time: sessionTime,
      link: sessionLink.trim() || null,
    })
    setSessionTitle('')
    setSessionDate('')
    setSessionTime('')
    setSessionLink('')
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-[520px] flex-col overflow-y-auto rounded-xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 font-heading text-lg font-bold text-navy">
          {course ? t('oCourses.editTitle') : t('oCourses.newTitle')}
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder={t('oCourses.namePh')}
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder={t('oCourses.descPh')}
            rows={3}
            className="resize-y rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <input
            value={form.duration_label}
            onChange={(e) => set('duration_label', e.target.value)}
            placeholder={t('oCourses.durationPh')}
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <div className="flex gap-3">
            <input
              type="number"
              value={form.price_cents / 100}
              disabled={form.price_cents === 0 && form.original_price_cents === null}
              onChange={(e) => set('price_cents', Math.round(Number(e.target.value) * 100))}
              placeholder={t('oCourses.pricePh')}
              className="flex-1 rounded-md border border-border px-3.5 py-2.5 text-[14px] disabled:bg-bg-soft"
            />
            <input
              type="number"
              value={form.original_price_cents ? form.original_price_cents / 100 : ''}
              onChange={(e) =>
                set('original_price_cents', e.target.value ? Math.round(Number(e.target.value) * 100) : null)
              }
              placeholder={t('oCourses.originalPricePh')}
              className="flex-1 rounded-md border border-border px-3.5 py-2.5 text-[14px]"
            />
          </div>
          <label className="flex items-center gap-2 text-[13.5px] text-navy">
            <input
              type="checkbox"
              checked={form.price_cents === 0}
              onChange={(e) => set('price_cents', e.target.checked ? 0 : form.original_price_cents || 100)}
            />
            {t('oCourses.freeLabel')}
          </label>
          <input
            type="number"
            min={0}
            value={form.capacity ?? ''}
            onChange={(e) => set('capacity', e.target.value ? Math.max(0, Math.round(Number(e.target.value))) : null)}
            placeholder={t('oCourses.capacityPh')}
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <div className="flex items-center gap-3">
            {form.image_url && <img src={form.image_url} className="h-14 w-24 rounded object-cover" alt="" />}
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleImage(e.target.files[0])} />
          </div>
          <label className="flex items-center gap-2 text-[13.5px] text-navy">
            <input type="checkbox" checked={form.completed} onChange={(e) => set('completed', e.target.checked)} />
            {t('oCourses.completedLabel')}
          </label>

          <div>
            <label className="mb-1 block text-[13px] font-semibold text-navy">{t('oCourses.accessCode')}</label>
            <input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder={t('oCourses.accessCodePh')}
              className="w-full rounded-md border border-border px-3.5 py-2.5 text-[14px]"
            />
            <div className="mt-1 text-[11.5px] text-muted">{t('oCourses.accessCodeHint')}</div>
          </div>

          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-navy">{t('oCourses.assignedTeachers')}</div>
            <div className="flex flex-wrap gap-1.5">
              {teachers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTeacher(t.id)}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] ${
                    selectedTeachers.includes(t.id)
                      ? 'border-navy bg-navy text-white'
                      : 'border-border bg-white text-navy'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {course && (
            <div>
              <div className="mb-1.5 text-[13px] font-semibold text-navy">{t('oCourses.sessions')}</div>
              {course.sessions.map((s) => (
                <div key={s.id} className="mb-1.5 flex items-center gap-2 rounded-md bg-bg-soft p-2 text-[12.5px]">
                  <span className="flex-1">
                    {s.title} — {s.session_date} {s.session_time}
                  </span>
                  <button
                    onClick={async () => {
                      await deleteSession(s.id)
                      onSaved()
                    }}
                    className="text-error hover:underline"
                  >
                    {t('dash.delete')}
                  </button>
                </div>
              ))}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <input
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder={t('oCourses.sessionTitlePh')}
                  className="min-w-24 flex-1 rounded-md border border-border px-2.5 py-1.5 text-[12.5px]"
                />
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="rounded-md border border-border px-2.5 py-1.5 text-[12.5px]"
                />
                <input
                  type="time"
                  value={sessionTime}
                  onChange={(e) => setSessionTime(e.target.value)}
                  className="rounded-md border border-border px-2.5 py-1.5 text-[12.5px]"
                />
                <input
                  value={sessionLink}
                  onChange={(e) => setSessionLink(e.target.value)}
                  placeholder={t('oCourses.sessionLinkPh')}
                  className="min-w-24 flex-1 rounded-md border border-border px-2.5 py-1.5 text-[12.5px]"
                />
                <button
                  onClick={() => void addSessionRow()}
                  className="rounded-md border border-navy px-3 py-1.5 text-[12.5px] text-navy"
                >
                  {t('oCourses.addSession')}
                </button>
              </div>
            </div>
          )}

          {error && <div className="text-[13px] text-error">{error}</div>}

          <div className="mt-2 flex gap-2.5">
            <button
              onClick={() => void save()}
              disabled={busy}
              className="flex-1 rounded-md bg-navy py-2.75 text-[14px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
            >
              {course ? t('oCourses.saveEdits') : t('oCourses.create')}
            </button>
            <button onClick={onClose} className="rounded-md border border-border px-5 py-2.75 text-[14px] text-navy">
              {t('dash.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function OwnerCoursesPage() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<CourseWithMeta | null | 'new'>(null)

  const coursesQuery = useQuery({ queryKey: ['owner-courses'], queryFn: listCoursesWithMeta })
  const teachersQuery = useQuery({ queryKey: ['active-teachers'], queryFn: listActiveTeachers })

  const teacherNameById = useMemo(
    () => new Map((teachersQuery.data ?? []).map((tt) => [tt.id, tt.name])),
    [teachersQuery.data],
  )

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['owner-courses'] })

  const remove = async (id: string) => {
    if (!confirm(t('oCourses.confirmDelete'))) return
    await deleteCourse(id)
    refresh()
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="font-heading text-xl font-bold text-navy">{t('oCourses.title')}</div>
        <button
          onClick={() => setEditing('new')}
          className="rounded-md bg-navy px-4.5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-navy-hover"
        >
          {t('oCourses.newBtn')}
        </button>
      </div>

      {coursesQuery.isLoading && <div className="text-muted">{t('dash.loading')}</div>}
      {coursesQuery.data && coursesQuery.data.length === 0 && <div className="text-muted">{t('oCourses.none')}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(coursesQuery.data ?? []).map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-white p-5">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="text-[15.5px] font-semibold text-navy">{c.title}</div>
              {c.completed && (
                <span className="shrink-0 rounded-full bg-bg-soft px-2.5 py-1 text-[11px] text-muted">{t('oCourses.completedBadge')}</span>
              )}
            </div>
            <div className="mb-2 line-clamp-2 text-[13px] text-muted">{c.description}</div>
            <div className="mb-3 flex items-center justify-between text-[12.5px] text-muted">
              <span>{c.duration_label}</span>
              <span className="font-semibold text-navy">{formatSar(c.price_cents, t)}</span>
            </div>
            <div className="mb-3 text-[12px] text-faint">
              {c.teacherIds.map((id) => teacherNameById.get(id)).filter(Boolean).join('، ') || t('sCourses.noTeacher')}
            </div>
            <div className="mb-3 text-[12px] text-faint">
              {t('oCourses.enrolledSessions', {
                enrolled: `${c.enrolledCount}${c.capacity != null ? `/${c.capacity}` : ''}`,
                sessions: String(c.sessions.length),
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(c)}
                className="flex-1 rounded-md border border-border py-2 text-[12.5px] text-navy hover:border-navy"
              >
                {t('dash.edit')}
              </button>
              <button
                onClick={() => void remove(c.id)}
                className="rounded-md border border-border px-3 py-2 text-[12.5px] text-error hover:border-error"
              >
                {t('dash.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <CourseEditor
          course={editing === 'new' ? null : editing}
          teachers={teachersQuery.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
