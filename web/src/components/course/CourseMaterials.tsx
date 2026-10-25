// The course "content" area: materials grouped into units. Students browse,
// preview, download and tick off materials (with a progress bar and a
// "continue" button); trainers and the owner (mode="manage") also add units,
// upload files (drag & drop, many at once), add video / link / note items,
// reorder, publish or hide as drafts, and see how many students finished each.
import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { LoadingState } from '@/components/LoadingState'
import {
  MaterialsNotReadyError,
  createMaterial,
  createModule,
  deleteMaterial,
  deleteModule,
  formatBytes,
  getCompletionCounts,
  getCourseSpace,
  getMyCompletions,
  reorderMaterials,
  reorderModules,
  setMaterialComplete,
  updateMaterial,
  updateModule,
  uploadMaterialFile,
  type CourseMaterial,
  type CourseModule,
  type MaterialKind,
} from '@/lib/courseMaterials'
import { MaterialIcon, kindLabel } from './MaterialIcon'
import { MaterialViewer, downloadMaterial } from './MaterialViewer'

type Filter = 'all' | MaterialKind
const NEW_WINDOW = 7 * 24 * 3_600_000

interface Group {
  module: CourseModule | null
  items: CourseMaterial[]
}

function stripExt(name: string) {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

function relDate(iso: string, ar: boolean) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 3_600_000))
  if (days <= 0) return ar ? 'اليوم' : 'Today'
  if (days === 1) return ar ? 'أمس' : 'Yesterday'
  if (days < 30) return ar ? `منذ ${days} يومًا` : `${days} days ago`
  return new Date(iso).toLocaleDateString(ar ? 'ar' : 'en-GB')
}

export function NotMigratedNote() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-[13.5px] leading-7 text-amber-900">
      <div className="mb-1 font-bold">{ar ? 'الميزة بانتظار تفعيل قاعدة البيانات' : 'Feature awaiting database setup'}</div>
      {ar
        ? 'لتفعيل ملفات الدورة والوحدات والإعلانات والأسئلة، شغّل ملف الترحيل supabase/migrations/0086_course_materials.sql في محرر SQL الخاص بـ Supabase.'
        : 'Run supabase/migrations/0086_course_materials.sql in the Supabase SQL editor to enable course files, units, announcements and Q&A.'}
    </div>
  )
}

export function CourseMaterials({
  courseId,
  mode,
  studentCount = 0,
}: {
  courseId: string
  mode: 'student' | 'manage'
  studentCount?: number
}) {
  const { profile } = useAuth()
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const qc = useQueryClient()
  const manage = mode === 'manage'

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [viewing, setViewing] = useState<CourseMaterial | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<{ material: CourseMaterial | null; moduleId: string | null; files?: File[] } | null>(null)
  const [editingModule, setEditingModule] = useState<CourseModule | 'new' | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const spaceQuery = useQuery({ queryKey: ['course-space', courseId], queryFn: () => getCourseSpace(courseId), retry: false })
  const doneQuery = useQuery({
    queryKey: ['course-completions', courseId, profile?.id],
    enabled: !manage && !!profile && spaceQuery.isSuccess,
    queryFn: () => getMyCompletions(courseId, profile!.id),
  })
  const countsQuery = useQuery({
    queryKey: ['course-completion-counts', courseId],
    enabled: manage && spaceQuery.isSuccess,
    queryFn: () => getCompletionCounts(courseId),
  })

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['course-space', courseId] })
    void qc.invalidateQueries({ queryKey: ['course-completion-counts', courseId] })
  }

  const modules = useMemo(() => spaceQuery.data?.modules ?? [], [spaceQuery.data])
  // RLS already hides drafts from students; filter again so a staff member
  // previewing in student mode sees exactly what students see.
  const materials = useMemo(
    () => (spaceQuery.data?.materials ?? []).filter((m) => manage || m.published),
    [spaceQuery.data, manage],
  )
  const done = doneQuery.data ?? new Set<string>()

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: materials.length, file: 0, video: 0, link: 0, note: 0 }
    for (const m of materials) c[m.kind] += 1
    return c
  }, [materials])

  const matches = (m: CourseMaterial) => {
    if (filter !== 'all' && m.kind !== filter) return false
    const s = q.trim().toLowerCase()
    if (!s) return true
    return [m.title, m.description, m.file_name].some((v) => (v ?? '').toLowerCase().includes(s))
  }

  const groups: Group[] = useMemo(() => {
    const known = new Set(modules.map((m) => m.id))
    const loose = materials.filter((m) => !m.module_id || !known.has(m.module_id))
    const out: Group[] = []
    if (loose.length > 0 || (manage && modules.length === 0)) out.push({ module: null, items: loose })
    for (const mod of modules) out.push({ module: mod, items: materials.filter((m) => m.module_id === mod.id) })
    return out
  }, [modules, materials, manage])

  const filtering = filter !== 'all' || q.trim() !== ''
  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter(matches) }))
    .filter((g) => !filtering || g.items.length > 0)
  const flat = visibleGroups.flatMap((g) => g.items)

  // Student progress (published materials only — drafts never reach students).
  const total = materials.length
  const completed = materials.filter((m) => done.has(m.id)).length
  const pct = total ? Math.round((completed / total) * 100) : 0
  const nextUp = groups.flatMap((g) => g.items).find((m) => !done.has(m.id))

  const toggleDone = async (m: CourseMaterial) => {
    if (!profile) return
    const key = ['course-completions', courseId, profile.id]
    const prev = new Set(done)
    const next = new Set(done)
    if (next.has(m.id)) next.delete(m.id)
    else next.add(m.id)
    qc.setQueryData(key, next)
    try {
      await setMaterialComplete(courseId, m.id, profile.id, next.has(m.id))
      void qc.invalidateQueries({ queryKey: ['course-content-progress'] })
    } catch {
      qc.setQueryData(key, prev)
    }
  }

  const openMaterial = (m: CourseMaterial) => {
    setViewing(m)
    // Opening a note/link/video counts as engaging with it; files are ticked
    // off explicitly so a student can come back to long readings.
    if (!manage && !done.has(m.id) && m.kind === 'note') void toggleDone(m)
  }

  const moveMaterial = async (g: Group, idx: number, dir: -1 | 1) => {
    const ids = g.items.map((m) => m.id)
    const j = idx + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[idx], ids[j]] = [ids[j], ids[idx]]
    await reorderMaterials(ids)
    refresh()
  }

  const moveModule = async (idx: number, dir: -1 | 1) => {
    const ids = modules.map((m) => m.id)
    const j = idx + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[idx], ids[j]] = [ids[j], ids[idx]]
    await reorderModules(ids)
    refresh()
  }

  const removeModule = async (mod: CourseModule) => {
    const msg = ar
      ? `حذف الوحدة «${mod.title}»؟ ستنتقل موادها إلى «مواد عامة» ولن تُحذف.`
      : `Delete unit “${mod.title}”? Its materials move to “General” and are kept.`
    if (!confirm(msg)) return
    await deleteModule(mod.id)
    refresh()
  }

  const removeMaterial = async (m: CourseMaterial) => {
    if (!confirm(ar ? `حذف «${m.title}» نهائيًا؟` : `Delete “${m.title}” permanently?`)) return
    await deleteMaterial(m)
    refresh()
  }

  const togglePublished = async (m: CourseMaterial) => {
    await updateMaterial(m.id, { published: !m.published })
    refresh()
  }

  if (spaceQuery.isLoading) return <LoadingState />
  if (spaceQuery.error instanceof MaterialsNotReadyError) {
    return manage ? (
      <NotMigratedNote />
    ) : (
      <EmptyContent ar={ar} />
    )
  }
  if (spaceQuery.error) {
    return (
      <div className="rounded-xl border border-error/30 bg-error-bg p-4 text-[13px] text-error">
        {ar ? 'تعذّر تحميل محتوى الدورة.' : 'Could not load course content.'}
      </div>
    )
  }

  const viewIdx = viewing ? flat.findIndex((m) => m.id === viewing.id) : -1
  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: ar ? 'الكل' : 'All' },
    { key: 'file', label: ar ? 'ملفات' : 'Files' },
    { key: 'video', label: ar ? 'فيديو' : 'Videos' },
    { key: 'link', label: ar ? 'روابط' : 'Links' },
    { key: 'note', label: ar ? 'ملاحظات' : 'Notes' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Student progress */}
      {!manage && total > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-white p-5">
          <div
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(var(--color-gold) ${pct * 3.6}deg, var(--color-border-2) 0deg)` }}
          >
            <div className="flex h-12.5 w-12.5 items-center justify-center rounded-full bg-white text-[14px] font-bold text-navy">
              {pct}%
            </div>
          </div>
          <div className="min-w-40 flex-1">
            <div className="text-[15px] font-bold text-navy">
              {pct === 100 ? (ar ? 'أحسنت! أنهيت كل المحتوى 🎉' : 'Great job — all content done 🎉') : ar ? 'تقدّمك في المحتوى' : 'Your content progress'}
            </div>
            <div className="mt-0.5 text-[13px] text-muted">
              {ar ? `أنجزت ${completed} من ${total} عنصرًا` : `${completed} of ${total} items completed`}
            </div>
          </div>
          {nextUp && (
            <button
              onClick={() => openMaterial(nextUp)}
              className="rounded-full bg-navy px-5 py-2.5 text-[13.5px] font-bold text-white hover:bg-navy-hover"
            >
              {completed === 0 ? (ar ? 'ابدأ التعلّم' : 'Start learning') : ar ? 'تابع من حيث توقفت' : 'Continue'}
              <span className="block max-w-56 truncate text-[11.5px] font-normal text-white/70">{nextUp.title}</span>
            </button>
          )}
        </div>
      )}

      {/* Manage toolbar */}
      {manage && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.07] to-transparent p-4">
          <div className="me-auto">
            <div className="text-[15px] font-bold text-navy">{ar ? 'إدارة محتوى الدورة' : 'Manage course content'}</div>
            <div className="text-[12.5px] text-muted">
              {ar
                ? `${total} عنصر · ${modules.length} وحدة · اسحب الملفات وأفلتها داخل أي وحدة لرفعها`
                : `${total} items · ${modules.length} units · drag & drop files onto a unit to upload`}
            </div>
          </div>
          <button
            onClick={() => setEditingModule('new')}
            className="rounded-md border border-navy bg-white px-4 py-2 text-[13px] font-semibold text-navy hover:bg-bg-soft"
          >
            {ar ? '+ وحدة جديدة' : '+ New unit'}
          </button>
          <button
            onClick={() => setEditingMaterial({ material: null, moduleId: modules[modules.length - 1]?.id ?? null })}
            className="rounded-md bg-navy px-4 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover"
          >
            {ar ? '+ إضافة محتوى' : '+ Add content'}
          </button>
        </div>
      )}

      {/* Search + filters */}
      {total > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ar ? 'ابحث في محتوى الدورة…' : 'Search course content…'}
            className="min-w-48 flex-1 rounded-full border border-border bg-white px-4 py-2 text-[13.5px]"
          />
          <div className="flex flex-wrap gap-1.5">
            {filters
              .filter((f) => f.key === 'all' || counts[f.key] > 0)
              .map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    filter === f.key ? 'border-navy bg-navy text-white' : 'border-border bg-white text-navy hover:border-navy'
                  }`}
                >
                  {f.label} <span className="opacity-60">{counts[f.key]}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {!manage && total === 0 && <EmptyContent ar={ar} />}
      {filtering && flat.length === 0 && (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted">
          {ar ? 'لا نتائج مطابقة.' : 'No matching items.'}
        </div>
      )}

      {/* Units */}
      {visibleGroups.map((g) => {
        const key = g.module?.id ?? 'loose'
        const isOpen = filtering || !collapsed.has(key)
        const unitDone = g.items.filter((m) => done.has(m.id)).length
        const modIdx = g.module ? modules.findIndex((m) => m.id === g.module!.id) : -1
        const unitNo = modIdx + 1
        return (
          <section
            key={key}
            onDragOver={
              manage
                ? (e) => {
                    if (e.dataTransfer.types.includes('Files')) {
                      e.preventDefault()
                      setDropTarget(key)
                    }
                  }
                : undefined
            }
            onDragLeave={manage ? () => setDropTarget((d) => (d === key ? null : d)) : undefined}
            onDrop={
              manage
                ? (e) => {
                    e.preventDefault()
                    setDropTarget(null)
                    const files = [...e.dataTransfer.files]
                    if (files.length) setEditingMaterial({ material: null, moduleId: g.module?.id ?? null, files })
                  }
                : undefined
            }
            className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
              dropTarget === key ? 'border-gold ring-2 ring-gold/40' : 'border-border'
            }`}
          >
            <div className="flex items-center gap-3 border-b border-border-2 bg-bg-soft/60 px-4 py-3.5 md:px-5">
              <button
                onClick={() =>
                  setCollapsed((s) => {
                    const n = new Set(s)
                    if (n.has(key)) n.delete(key)
                    else n.add(key)
                    return n
                  })
                }
                className="flex min-w-0 flex-1 items-center gap-3 text-start"
                aria-expanded={isOpen}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy text-[13px] font-bold text-white">
                  {g.module ? unitNo : '★'}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-bold text-navy">
                    {g.module ? g.module.title : ar ? 'مواد عامة' : 'General materials'}
                  </span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {g.module?.description ? `${g.module.description} · ` : ''}
                    {ar ? `${g.items.length} عنصر` : `${g.items.length} items`}
                    {!manage && g.items.length > 0 && ` · ${unitDone}/${g.items.length} ${ar ? 'مكتمل' : 'done'}`}
                  </span>
                </span>
                <span className={`ms-auto shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {!manage && g.items.length > 0 && unitDone === g.items.length && (
                <span className="shrink-0 rounded-full bg-success-bg px-2.5 py-1 text-[11px] font-bold text-success">✓</span>
              )}
              {manage && g.module && (
                <div className="flex shrink-0 items-center gap-1">
                  <IconBtn label={ar ? 'أعلى' : 'Up'} onClick={() => void moveModule(modIdx, -1)} disabled={modIdx === 0}><Ico name="up" /></IconBtn>
                  <IconBtn label={ar ? 'أسفل' : 'Down'} onClick={() => void moveModule(modIdx, 1)} disabled={modIdx === modules.length - 1}><Ico name="down" /></IconBtn>
                  <IconBtn label={ar ? 'تعديل' : 'Edit'} onClick={() => setEditingModule(g.module)}><Ico name="edit" /></IconBtn>
                  <IconBtn label={ar ? 'حذف' : 'Delete'} onClick={() => void removeModule(g.module!)} danger><Ico name="trash" /></IconBtn>
                </div>
              )}
            </div>

            {isOpen && (
              <div className="flex flex-col divide-y divide-border-2">
                {g.items.length === 0 && (
                  <div className="px-5 py-6 text-center text-[13px] text-muted">
                    {manage
                      ? ar
                        ? 'لا يوجد محتوى في هذه الوحدة بعد — أضف ملفات أو أفلتها هنا.'
                        : 'No content yet — add items or drop files here.'
                      : ar
                        ? 'لا يوجد محتوى بعد.'
                        : 'Nothing here yet.'}
                  </div>
                )}
                {g.items.map((m, idx) => {
                  const isDone = done.has(m.id)
                  const isNew = !manage && !isDone && Date.now() - new Date(m.created_at).getTime() < NEW_WINDOW
                  const finished = countsQuery.data?.get(m.id) ?? 0
                  return (
                    <div key={m.id} className={`flex items-center gap-3 px-4 py-3.5 md:px-5 ${!m.published ? 'bg-amber-50/50' : ''}`}>
                      {!manage && (
                        <button
                          onClick={() => void toggleDone(m)}
                          aria-label={isDone ? (ar ? 'إلغاء الإكمال' : 'Mark incomplete') : ar ? 'تحديد كمكتمل' : 'Mark complete'}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[12px] font-bold transition-colors ${
                            isDone ? 'border-success bg-success text-white' : 'border-border text-transparent hover:border-success'
                          }`}
                        >
                          ✓
                        </button>
                      )}
                      <button onClick={() => openMaterial(m)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                        <MaterialIcon material={m} />
                        <span className="min-w-0">
                          <span className={`flex items-center gap-2 text-[14px] font-semibold ${isDone ? 'text-muted' : 'text-navy'}`}>
                            <span className="truncate">{m.title}</span>
                            {isNew && <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-[10.5px] font-bold text-navy">{ar ? 'جديد' : 'New'}</span>}
                            {!m.published && (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-800">{ar ? 'مسودة' : 'Draft'}</span>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] text-muted">
                            {kindLabel(m, ar)}
                            {m.file_size ? ` · ${formatBytes(m.file_size)}` : ''}
                            {` · ${relDate(m.created_at, ar)}`}
                            {m.description ? ` · ${m.description}` : ''}
                          </span>
                        </span>
                      </button>

                      {manage && m.published && studentCount > 0 && (
                        <span
                          className="hidden shrink-0 rounded-full bg-bg-soft px-2.5 py-1 text-[11.5px] text-muted-2 sm:inline"
                          title={ar ? 'الطلاب الذين أنهوا هذا العنصر' : 'Students who completed this'}
                        >
                          {ar ? `أنهاه ${finished}/${studentCount}` : `${finished}/${studentCount} done`}
                        </span>
                      )}

                      <div className="flex shrink-0 items-center gap-1">
                        {m.kind === 'file' && (
                          <IconBtn label={ar ? 'تنزيل' : 'Download'} onClick={() => void downloadMaterial(m)}><Ico name="download" /></IconBtn>
                        )}
                        {manage && (
                          <>
                            <IconBtn
                              label={m.published ? (ar ? 'إخفاء (مسودة)' : 'Hide (draft)') : ar ? 'نشر للطلاب' : 'Publish'}
                              onClick={() => void togglePublished(m)}
                            >
                              <Ico name={m.published ? "eye" : "eyeOff"} />
                            </IconBtn>
                            <IconBtn label={ar ? 'أعلى' : 'Up'} onClick={() => void moveMaterial(g, idx, -1)} disabled={idx === 0}><Ico name="up" /></IconBtn>
                            <IconBtn label={ar ? 'أسفل' : 'Down'} onClick={() => void moveMaterial(g, idx, 1)} disabled={idx === g.items.length - 1}><Ico name="down" /></IconBtn>
                            <IconBtn label={ar ? 'تعديل' : 'Edit'} onClick={() => setEditingMaterial({ material: m, moduleId: m.module_id })}><Ico name="edit" /></IconBtn>
                            <IconBtn label={ar ? 'حذف' : 'Delete'} onClick={() => void removeMaterial(m)} danger><Ico name="trash" /></IconBtn>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
                {manage && (
                  <button
                    onClick={() => setEditingMaterial({ material: null, moduleId: g.module?.id ?? null })}
                    className="px-5 py-3 text-start text-[13px] font-semibold text-accent hover:bg-bg-soft"
                  >
                    {ar ? '+ إضافة محتوى لهذه الوحدة' : '+ Add content to this unit'}
                  </button>
                )}
              </div>
            )}
          </section>
        )
      })}

      {viewing && (
        <MaterialViewer
          material={viewing}
          done={done.has(viewing.id)}
          onToggleDone={manage ? undefined : () => void toggleDone(viewing)}
          onPrev={viewIdx > 0 ? () => setViewing(flat[viewIdx - 1]) : undefined}
          onNext={viewIdx > -1 && viewIdx < flat.length - 1 ? () => setViewing(flat[viewIdx + 1]) : undefined}
          onClose={() => setViewing(null)}
        />
      )}

      {editingMaterial && (
        <MaterialForm
          courseId={courseId}
          modules={modules}
          material={editingMaterial.material}
          initialModuleId={editingMaterial.moduleId}
          initialFiles={editingMaterial.files}
          nextPosition={(mid) => Math.max(-1, ...materials.filter((m) => m.module_id === mid).map((m) => m.position)) + 1}
          onClose={() => setEditingMaterial(null)}
          onSaved={refresh}
        />
      )}

      {editingModule && (
        <ModuleForm
          courseId={courseId}
          module={editingModule === 'new' ? null : editingModule}
          nextPosition={Math.max(-1, ...modules.map((m) => m.position)) + 1}
          onClose={() => setEditingModule(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

function EmptyContent({ ar }: { ar: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-bg-soft/60 px-6 py-12 text-center">
      <div className="mb-1 text-[15px] font-semibold text-navy">{ar ? 'لم يُضف محتوى للدورة بعد' : 'No course content yet'}</div>
      <div className="text-[13px] text-muted">
        {ar ? 'ستظهر هنا ملفات الدورة والفيديوهات والروابط فور إضافتها من المدرّب.' : 'Files, videos and links will appear here as soon as the trainer adds them.'}
      </div>
    </div>
  )
}

const ICONS = {
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M19 12l-7 7-7-7',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
} as const

function Ico({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  )
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[14px] transition-colors disabled:opacity-25 ${
        danger ? 'text-error hover:border-error/30 hover:bg-error-bg' : 'text-navy hover:border-border hover:bg-bg-soft'
      }`}
    >
      {children}
    </button>
  )
}

// ── Modals ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={onClose}>
      <div className="my-auto w-full max-w-[540px] rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 font-heading text-lg font-bold text-navy">{title}</div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

const input = 'w-full rounded-md border border-border px-3.5 py-2.5 text-[14px]'

function ModuleForm({
  courseId,
  module,
  nextPosition,
  onClose,
  onSaved,
}: {
  courseId: string
  module: CourseModule | null
  nextPosition: number
  onClose: () => void
  onSaved: () => void
}) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const [title, setTitle] = useState(module?.title ?? '')
  const [description, setDescription] = useState(module?.description ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!title.trim()) return setError(ar ? 'اسم الوحدة مطلوب' : 'Unit name is required')
    setBusy(true)
    setError('')
    try {
      if (module) await updateModule(module.id, { title: title.trim(), description: description.trim() || null })
      else await createModule(courseId, title.trim(), description.trim() || null, nextPosition)
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof MaterialsNotReadyError ? (ar ? 'شغّل ملف الترحيل 0086 أولًا.' : 'Run migration 0086 first.') : e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={module ? (ar ? 'تعديل الوحدة' : 'Edit unit') : ar ? 'وحدة جديدة' : 'New unit'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={ar ? 'اسم الوحدة — مثال: الأسبوع الأول: مدخل إلى البحث العلمي' : 'Unit name — e.g. Week 1: Intro to research'}
          className={input}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={ar ? 'وصف قصير (اختياري)' : 'Short description (optional)'}
          rows={2}
          className={`${input} resize-y`}
        />
        {error && <div className="text-[13px] text-error">{error}</div>}
        <FormActions busy={busy} onSave={() => void save()} onClose={onClose} saveLabel={ar ? 'حفظ' : 'Save'} />
      </div>
    </Modal>
  )
}

function FormActions({ busy, onSave, onClose, saveLabel }: { busy: boolean; onSave: () => void; onClose: () => void; saveLabel: string }) {
  const { lang } = useLanguage()
  return (
    <div className="mt-1 flex gap-2.5">
      <button
        onClick={onSave}
        disabled={busy}
        className="flex-1 rounded-md bg-navy py-2.75 text-[14px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
      >
        {busy ? '…' : saveLabel}
      </button>
      <button onClick={onClose} className="rounded-md border border-border px-5 py-2.75 text-[14px] text-navy">
        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
      </button>
    </div>
  )
}

function MaterialForm({
  courseId,
  modules,
  material,
  initialModuleId,
  initialFiles,
  nextPosition,
  onClose,
  onSaved,
}: {
  courseId: string
  modules: CourseModule[]
  material: CourseMaterial | null
  initialModuleId: string | null
  initialFiles?: File[]
  nextPosition: (moduleId: string | null) => number
  onClose: () => void
  onSaved: () => void
}) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const [kind, setKind] = useState<MaterialKind>(material?.kind ?? 'file')
  const [moduleId, setModuleId] = useState<string | null>(initialModuleId)
  const [title, setTitle] = useState(material?.title ?? '')
  const [description, setDescription] = useState(material?.description ?? '')
  const [url, setUrl] = useState(material?.url ?? '')
  const [body, setBody] = useState(material?.body ?? '')
  const [published, setPublished] = useState(material?.published ?? true)
  const [files, setFiles] = useState<File[]>(initialFiles ?? [])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const multi = !material && kind === 'file' && files.length > 1

  const save = async () => {
    setError('')
    if (kind === 'file' && !material && files.length === 0) return setError(ar ? 'اختر ملفًا واحدًا على الأقل' : 'Choose at least one file')
    if ((kind === 'video' || kind === 'link') && !/^https?:\/\//i.test(url.trim()))
      return setError(ar ? 'أدخل رابطًا صحيحًا يبدأ بـ https://' : 'Enter a valid https:// link')
    if (kind === 'note' && !body.trim()) return setError(ar ? 'اكتب نص الملاحظة' : 'Write the note text')
    if (!multi && !title.trim() && !(kind === 'file' && files[0])) return setError(ar ? 'العنوان مطلوب' : 'Title is required')

    setBusy(true)
    try {
      const base = {
        module_id: moduleId,
        kind,
        description: description.trim() || null,
        published,
        url: kind === 'video' || kind === 'link' ? url.trim() : null,
        body: kind === 'note' ? body : null,
      }
      if (material) {
        let fileFields = {}
        if (kind === 'file' && files[0]) {
          setProgress(ar ? 'جارٍ رفع الملف…' : 'Uploading…')
          const path = await uploadMaterialFile(courseId, files[0])
          fileFields = { file_path: path, file_name: files[0].name, file_size: files[0].size, mime_type: files[0].type || null }
        }
        const moved = moduleId !== material.module_id
        await updateMaterial(material.id, {
          ...base,
          title: title.trim() || material.title,
          ...(kind === 'file' ? fileFields : { file_path: null, file_name: null, file_size: null, mime_type: null }),
          ...(moved ? { position: nextPosition(moduleId) } : {}),
        })
      } else if (kind === 'file') {
        let pos = nextPosition(moduleId)
        for (let i = 0; i < files.length; i++) {
          const f = files[i]
          setProgress(ar ? `جارٍ رفع ${i + 1} من ${files.length}: ${f.name}` : `Uploading ${i + 1} of ${files.length}: ${f.name}`)
          const path = await uploadMaterialFile(courseId, f)
          await createMaterial(
            courseId,
            {
              ...base,
              title: files.length === 1 && title.trim() ? title.trim() : stripExt(f.name),
              file_path: path,
              file_name: f.name,
              file_size: f.size,
              mime_type: f.type || null,
            },
            pos++,
          )
        }
      } else {
        await createMaterial(
          courseId,
          { ...base, title: title.trim(), file_path: null, file_name: null, file_size: null, mime_type: null },
          nextPosition(moduleId),
        )
      }
      onSaved()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError(
        e instanceof MaterialsNotReadyError
          ? ar
            ? 'شغّل ملف الترحيل 0086 أولًا.'
            : 'Run migration 0086 first.'
          : /exceeded|too large|413/i.test(msg)
            ? ar
              ? 'حجم الملف أكبر من المسموح. للفيديوهات الكبيرة ارفعها على يوتيوب (غير مدرج) وأضفها كرابط فيديو.'
              : 'File too large. For big videos, upload to YouTube (unlisted) and add it as a video link.'
            : msg || (ar ? 'تعذّر الحفظ' : 'Save failed'),
      )
      onSaved()
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  const kinds: { key: MaterialKind; label: string; hint: string }[] = [
    { key: 'file', label: ar ? 'ملف' : 'File', hint: 'PDF · Word · PPT · Excel · ZIP' },
    { key: 'video', label: ar ? 'فيديو' : 'Video', hint: 'YouTube · Vimeo · Drive' },
    { key: 'link', label: ar ? 'رابط' : 'Link', hint: ar ? 'مقال، موقع، نموذج' : 'Article, site, form' },
    { key: 'note', label: ar ? 'ملاحظة' : 'Note', hint: ar ? 'نص منسّق' : 'Formatted text' },
  ]

  return (
    <Modal title={material ? (ar ? 'تعديل المحتوى' : 'Edit content') : ar ? 'إضافة محتوى' : 'Add content'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-4 gap-1.5">
          {kinds.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              className={`rounded-lg border px-2 py-2 text-center transition-colors ${
                kind === k.key ? 'border-navy bg-navy text-white' : 'border-border bg-white text-navy hover:border-navy'
              }`}
            >
              <div className="text-[13.5px] font-bold">{k.label}</div>
              <div className={`mt-0.5 truncate text-[10px] ${kind === k.key ? 'text-white/70' : 'text-faint'}`}>{k.hint}</div>
            </button>
          ))}
        </div>

        <select value={moduleId ?? ''} onChange={(e) => setModuleId(e.target.value || null)} className={input}>
          <option value="">{ar ? 'مواد عامة (بدون وحدة)' : 'General (no unit)'}</option>
          {modules.map((m, i) => (
            <option key={m.id} value={m.id}>
              {(ar ? 'الوحدة ' : 'Unit ') + (i + 1)} — {m.title}
            </option>
          ))}
        </select>

        {kind === 'file' && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const dropped = [...e.dataTransfer.files]
              if (dropped.length) setFiles(material ? dropped.slice(0, 1) : dropped)
            }}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-bg-soft/60 px-4 py-6 text-center hover:border-navy"
          >
            <input
              ref={fileRef}
              type="file"
              multiple={!material}
              className="hidden"
              onChange={(e) => setFiles([...(e.target.files ?? [])])}
            />
            {files.length === 0 ? (
              <>
                <div className="text-[14px] font-semibold text-navy">
                  {material ? (ar ? 'استبدال الملف (اختياري)' : 'Replace file (optional)') : ar ? 'اسحب الملفات هنا أو اضغط للاختيار' : 'Drop files here or click to choose'}
                </div>
                <div className="mt-1 text-[12px] text-muted">
                  {material?.file_name
                    ? `${ar ? 'الحالي' : 'Current'}: ${material.file_name}`
                    : ar
                      ? 'يمكنك اختيار عدة ملفات دفعة واحدة'
                      : 'You can pick several files at once'}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1 text-start">
                {files.map((f) => (
                  <div key={f.name + f.size} className="flex justify-between gap-2 text-[12.5px] text-navy">
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-muted">{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!multi && (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              kind === 'file'
                ? ar
                  ? 'العنوان (يُؤخذ من اسم الملف إن تُرك فارغًا)'
                  : 'Title (defaults to the file name)'
                : ar
                  ? 'العنوان'
                  : 'Title'
            }
            className={input}
          />
        )}
        {multi && (
          <div className="rounded-md bg-bg-soft px-3 py-2 text-[12.5px] text-muted">
            {ar ? `سيُضاف ${files.length} ملفات، وعنوان كل منها اسم الملف.` : `${files.length} files will be added, each titled by its file name.`}
          </div>
        )}

        {(kind === 'video' || kind === 'link') && (
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            dir="ltr"
            placeholder={kind === 'video' ? 'https://youtube.com/watch?v=…' : 'https://…'}
            className={input}
          />
        )}

        {kind === 'note' && (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder={
              ar
                ? 'اكتب الملاحظة… يدعم: ## عنوان، - قائمة، **عريض**، [نص](https://رابط)'
                : 'Write the note… supports ## heading, - list, **bold**, [text](https://link)'
            }
            className={`${input} resize-y leading-7`}
          />
        )}

        {!multi && (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={ar ? 'وصف قصير أو تعليمات للطلاب (اختياري)' : 'Short description or instructions (optional)'}
            className={`${input} resize-y`}
          />
        )}

        <label className="flex items-center gap-2 rounded-md border border-border-2 bg-bg-soft px-3 py-2.5 text-[13.5px] font-semibold text-navy">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          {ar ? 'منشور ومرئي للطلاب (أزل التحديد لحفظه كمسودة)' : 'Published to students (untick to keep as draft)'}
        </label>
        {published && !material && (
          <div className="-mt-1 text-[11.5px] text-muted">
            {ar ? 'سيصل إشعار للطلاب المسجّلين بالمحتوى الجديد.' : 'Enrolled students get a notification about new content.'}
          </div>
        )}

        {progress && <div className="text-[12.5px] font-semibold text-accent">{progress}</div>}
        {error && <div className="text-[13px] text-error">{error}</div>}
        <FormActions
          busy={busy}
          onSave={() => void save()}
          onClose={onClose}
          saveLabel={material ? (ar ? 'حفظ التعديلات' : 'Save changes') : ar ? 'إضافة' : 'Add'}
        />
      </div>
    </Modal>
  )
}
