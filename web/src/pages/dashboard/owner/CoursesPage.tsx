import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addSession,
  createCourse,
  deleteCourse,
  deleteSession,
  listActiveTeachers,
  listCoursesWithMeta,
  updateCourse,
  uploadCourseImage,
  type CourseFormValues,
  type CourseWithMeta,
  type TeacherOption,
} from '@/lib/courses'

function formatSar(cents: number) {
  if (cents === 0) return 'مجاني'
  return `${(cents / 100).toLocaleString('ar-SA')} ريال`
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
        }
      : emptyForm,
  )
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>(course?.teacherIds ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
      setError('اسم البرنامج مطلوب')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (course) {
        await updateCourse(course.id, form, selectedTeachers)
      } else {
        await createCourse(form, selectedTeachers)
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحفظ')
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
        className="flex max-h-[85vh] w-[520px] flex-col overflow-y-auto rounded-xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 font-heading text-lg font-bold text-navy">
          {course ? 'تعديل البرنامج' : 'برنامج جديد'}
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="اسم البرنامج"
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="الوصف"
            rows={3}
            className="resize-y rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <input
            value={form.duration_label}
            onChange={(e) => set('duration_label', e.target.value)}
            placeholder="المدة (مثال: 8 أسابيع)"
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <div className="flex gap-3">
            <input
              type="number"
              value={form.price_cents / 100}
              disabled={form.price_cents === 0 && form.original_price_cents === null}
              onChange={(e) => set('price_cents', Math.round(Number(e.target.value) * 100))}
              placeholder="السعر (ريال)"
              className="flex-1 rounded-md border border-border px-3.5 py-2.5 text-[14px] disabled:bg-bg-soft"
            />
            <input
              type="number"
              value={form.original_price_cents ? form.original_price_cents / 100 : ''}
              onChange={(e) =>
                set('original_price_cents', e.target.value ? Math.round(Number(e.target.value) * 100) : null)
              }
              placeholder="السعر قبل الخصم (اختياري)"
              className="flex-1 rounded-md border border-border px-3.5 py-2.5 text-[14px]"
            />
          </div>
          <label className="flex items-center gap-2 text-[13.5px] text-navy">
            <input
              type="checkbox"
              checked={form.price_cents === 0}
              onChange={(e) => set('price_cents', e.target.checked ? 0 : form.original_price_cents || 100)}
            />
            برنامج مجاني (بدون دفع — تسجيل مباشر)
          </label>
          <input
            type="number"
            min={0}
            value={form.capacity ?? ''}
            onChange={(e) => set('capacity', e.target.value ? Math.max(0, Math.round(Number(e.target.value))) : null)}
            placeholder="الحد الأقصى للمقاعد (اتركه فارغًا لعدد غير محدود)"
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <div className="flex items-center gap-3">
            {form.image_url && <img src={form.image_url} className="h-14 w-24 rounded object-cover" alt="" />}
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleImage(e.target.files[0])} />
          </div>
          <label className="flex items-center gap-2 text-[13.5px] text-navy">
            <input type="checkbox" checked={form.completed} onChange={(e) => set('completed', e.target.checked)} />
            البرنامج مكتمل (لا يُعرض تسجيل جديد)
          </label>

          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-navy">المعلمون المكلّفون</div>
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
              <div className="mb-1.5 text-[13px] font-semibold text-navy">الحصص</div>
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
                    حذف
                  </button>
                </div>
              ))}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <input
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="عنوان الحصة"
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
                  placeholder="رابط (اختياري)"
                  className="min-w-24 flex-1 rounded-md border border-border px-2.5 py-1.5 text-[12.5px]"
                />
                <button
                  onClick={() => void addSessionRow()}
                  className="rounded-md border border-navy px-3 py-1.5 text-[12.5px] text-navy"
                >
                  إضافة حصة
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
              {course ? 'حفظ التعديلات' : 'إنشاء البرنامج'}
            </button>
            <button onClick={onClose} className="rounded-md border border-border px-5 py-2.75 text-[14px] text-navy">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function OwnerCoursesPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<CourseWithMeta | null | 'new'>(null)

  const coursesQuery = useQuery({ queryKey: ['owner-courses'], queryFn: listCoursesWithMeta })
  const teachersQuery = useQuery({ queryKey: ['active-teachers'], queryFn: listActiveTeachers })

  const teacherNameById = useMemo(
    () => new Map((teachersQuery.data ?? []).map((t) => [t.id, t.name])),
    [teachersQuery.data],
  )

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['owner-courses'] })

  const remove = async (id: string) => {
    if (!confirm('حذف هذا البرنامج نهائيًا؟')) return
    await deleteCourse(id)
    refresh()
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="font-heading text-xl font-bold text-navy">البرامج</div>
        <button
          onClick={() => setEditing('new')}
          className="rounded-md bg-navy px-4.5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-navy-hover"
        >
          + برنامج جديد
        </button>
      </div>

      {coursesQuery.isLoading && <div className="text-muted">جارِ التحميل...</div>}
      {coursesQuery.data && coursesQuery.data.length === 0 && (
        <div className="text-muted">لا توجد برامج بعد.</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {(coursesQuery.data ?? []).map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-white p-5">
            <div className="mb-2 flex items-start justify-between">
              <div className="text-[15.5px] font-semibold text-navy">{c.title}</div>
              {c.completed && <span className="rounded-full bg-bg-soft px-2.5 py-1 text-[11px] text-muted">مكتمل</span>}
            </div>
            <div className="mb-2 line-clamp-2 text-[13px] text-muted">{c.description}</div>
            <div className="mb-3 flex items-center justify-between text-[12.5px] text-muted">
              <span>{c.duration_label}</span>
              <span className="font-semibold text-navy">{formatSar(c.price_cents)}</span>
            </div>
            <div className="mb-3 text-[12px] text-faint">
              {c.teacherIds.map((id) => teacherNameById.get(id)).filter(Boolean).join('، ') || 'بلا معلم مكلّف'}
            </div>
            <div className="mb-3 text-[12px] text-faint">
              {c.enrolledCount}
              {c.capacity != null ? `/${c.capacity}` : ''} مسجّل · {c.sessions.length} حصة
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(c)}
                className="flex-1 rounded-md border border-border py-2 text-[12.5px] text-navy hover:border-navy"
              >
                تعديل
              </button>
              <button
                onClick={() => void remove(c.id)}
                className="rounded-md border border-border px-3 py-2 text-[12.5px] text-error hover:border-error"
              >
                حذف
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
