// Picks people for a private workshop: search accounts by name / username, or
// add every student of a course at once. Selected people show as removable
// chips. Used both while creating a workshop and to add invitees later.
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { listCourseOptions, listCourseStudents, searchPeople, type PersonOption } from '@/lib/groupSessions'

function roleLabel(role: string, ar: boolean) {
  if (role === 'teacher') return ar ? 'مدرّب' : 'Trainer'
  if (role === 'student') return ar ? 'طالب' : 'Student'
  if (role === 'institution') return ar ? 'مؤسسة' : 'Institution'
  return role
}

export function InvitePicker({
  selected,
  onAdd,
  onRemove,
  exclude,
}: {
  selected: PersonOption[]
  onAdd: (people: PersonOption[]) => void
  onRemove?: (id: string) => void
  /** Ids already on the roster (shown as added, not addable again). */
  exclude?: Set<string>
}) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [courseId, setCourseId] = useState('')
  const [loadingCourse, setLoadingCourse] = useState(false)

  // Debounce typing so we don't query on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setTerm(q.trim()), 300)
    return () => clearTimeout(id)
  }, [q])

  const results = useQuery({ queryKey: ['people-search', term], enabled: term.length >= 2, queryFn: () => searchPeople(term) })
  const courses = useQuery({ queryKey: ['course-options'], queryFn: listCourseOptions })

  const taken = new Set([...selected.map((p) => p.id), ...(exclude ?? [])])

  const addCourse = async () => {
    if (!courseId) return
    setLoadingCourse(true)
    try {
      const people = await listCourseStudents(courseId)
      onAdd(people.filter((p) => !taken.has(p.id)))
      setCourseId('')
    } finally {
      setLoadingCourse(false)
    }
  }

  const field = 'rounded-md border border-border bg-white px-3 py-2 text-[13px]'

  return (
    <div className="flex flex-col gap-2.5">
      {/* Whole course */}
      <div className="flex flex-wrap gap-2">
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={`${field} min-w-0 flex-1`}>
          <option value="">{ar ? 'اختر دورة لدعوة جميع طلابها…' : 'Pick a course to invite all its students…'}</option>
          {(courses.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({ar ? `${c.enrolled} طالب` : `${c.enrolled} students`})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void addCourse()}
          disabled={!courseId || loadingCourse}
          className="rounded-md border border-navy bg-white px-3.5 py-2 text-[12.5px] font-semibold text-navy hover:bg-bg-soft disabled:opacity-40"
        >
          {loadingCourse ? '…' : ar ? 'إضافة طلاب الدورة' : 'Add course students'}
        </button>
      </div>

      {/* Individuals */}
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ar ? 'أو ابحث عن شخص بالاسم أو اسم المستخدم…' : 'Or search a person by name or username…'}
          className={`${field} w-full`}
        />
        {term.length >= 2 && (
          <div className="mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-white shadow-sm">
            {results.isLoading && <div className="px-3 py-2 text-[12.5px] text-muted">…</div>}
            {results.data?.length === 0 && <div className="px-3 py-2 text-[12.5px] text-muted">{ar ? 'لا نتائج' : 'No matches'}</div>}
            {(results.data ?? []).map((p) => {
              const has = taken.has(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={has}
                  onClick={() => onAdd([p])}
                  className="flex w-full items-center justify-between gap-2 border-b border-border-2 px-3 py-2 text-start text-[13px] last:border-0 hover:bg-bg-soft disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-navy">{p.name}</span>
                    <span className="block truncate text-[11.5px] text-muted" dir="ltr">
                      @{p.username} · {roleLabel(p.role, ar)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] font-semibold text-accent">{has ? (ar ? '✓ مضاف' : '✓ Added') : ar ? '+ إضافة' : '+ Add'}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Chosen */}
      {selected.length > 0 && (
        <div>
          <div className="mb-1.5 text-[12px] font-semibold text-navy">
            {ar ? `المدعوون (${selected.length})` : `Invitees (${selected.length})`}
          </div>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {selected.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-navy/[0.07] py-1 ps-3 pe-1.5 text-[12.5px] text-navy">
                {p.name}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(p.id)}
                    aria-label={ar ? `إزالة ${p.name}` : `Remove ${p.name}`}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-muted hover:bg-error-bg hover:text-error"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
