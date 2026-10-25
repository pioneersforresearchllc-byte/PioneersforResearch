// Course learning space: units (modules), materials (files / videos / links /
// notes), per-student completion, announcements and a Q&A board. Backed by
// migration 0086. Files sit in the PRIVATE `course-materials` bucket under
// "<course-id>/<uuid>.<ext>" and are opened through short-lived signed URLs.
import { supabase } from '@/lib/supabase'

export type MaterialKind = 'file' | 'video' | 'link' | 'note'

export interface CourseModule {
  id: string
  course_id: string
  title: string
  description: string | null
  position: number
  created_at: string
}

export interface CourseMaterial {
  id: string
  course_id: string
  module_id: string | null
  kind: MaterialKind
  title: string
  description: string | null
  file_path: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  url: string | null
  body: string | null
  position: number
  published: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CourseAnnouncement {
  id: string
  course_id: string
  author_id: string | null
  title: string
  body: string | null
  pinned: boolean
  created_at: string
  authorName: string
}

export interface CoursePost {
  id: string
  course_id: string
  parent_id: string | null
  author_id: string
  body: string
  resolved: boolean
  created_at: string
  authorName: string
  authorRole: string
}

const BUCKET = 'course-materials'

/** Thrown when migration 0086 hasn't been applied yet, so the UI can show a
 * clear "run the migration" note to staff instead of a raw Postgres error. */
export class MaterialsNotReadyError extends Error {
  constructor() {
    super('course materials not migrated')
  }
}

function check(error: { code?: string; message?: string } | null) {
  if (!error) return
  // 42P01 = undefined table (Postgres); PGRST205 = table missing from the
  // PostgREST schema cache.
  if (error.code === '42P01' || error.code === 'PGRST205') throw new MaterialsNotReadyError()
  throw error
}

// ── Read ─────────────────────────────────────────────────────────────────
export interface CourseSpace {
  modules: CourseModule[]
  materials: CourseMaterial[]
}

export async function getCourseSpace(courseId: string): Promise<CourseSpace> {
  const [mods, mats] = await Promise.all([
    supabase.from('course_modules').select('*').eq('course_id', courseId).order('position').order('created_at'),
    supabase.from('course_materials').select('*').eq('course_id', courseId).order('position').order('created_at'),
  ])
  check(mods.error)
  check(mats.error)
  return { modules: (mods.data ?? []) as CourseModule[], materials: (mats.data ?? []) as CourseMaterial[] }
}

/** Material ids the given student has marked complete in this course. */
export async function getMyCompletions(courseId: string, studentId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('course_material_progress')
    .select('material_id')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
  check(error)
  return new Set((data ?? []).map((r) => r.material_id as string))
}

/** Staff: how many students completed each material. */
export async function getCompletionCounts(courseId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('course_material_progress').select('material_id').eq('course_id', courseId)
  check(error)
  const out = new Map<string, number>()
  for (const r of data ?? []) out.set(r.material_id, (out.get(r.material_id) ?? 0) + 1)
  return out
}

/** Staff: how many materials each student has completed in this course.
 * Never throws (empty map pre-migration). */
export async function getCompletionsByStudent(courseId: string): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  try {
    const { data, error } = await supabase.from('course_material_progress').select('student_id').eq('course_id', courseId)
    if (error) return out
    for (const r of data ?? []) out.set(r.student_id, (out.get(r.student_id) ?? 0) + 1)
  } catch {
    // pre-migration
  }
  return out
}

export async function setMaterialComplete(courseId: string, materialId: string, studentId: string, done: boolean) {
  if (done) {
    const { error } = await supabase
      .from('course_material_progress')
      .upsert({ course_id: courseId, material_id: materialId, student_id: studentId }, { onConflict: 'material_id,student_id', ignoreDuplicates: true })
    check(error)
  } else {
    const { error } = await supabase
      .from('course_material_progress')
      .delete()
      .eq('material_id', materialId)
      .eq('student_id', studentId)
    check(error)
  }
}

/** Content completion (%) per course for a student — published materials only
 * (RLS already hides drafts from students). Courses without materials are
 * absent from the map. Never throws: returns an empty map pre-migration. */
export async function getContentProgress(studentId: string, courseIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (courseIds.length === 0) return out
  try {
    const [{ data: mats, error: e1 }, { data: done, error: e2 }] = await Promise.all([
      supabase.from('course_materials').select('id, course_id').in('course_id', courseIds).eq('published', true),
      supabase.from('course_material_progress').select('material_id, course_id').eq('student_id', studentId).in('course_id', courseIds),
    ])
    if (e1 || e2) return out
    const total = new Map<string, number>()
    for (const m of mats ?? []) total.set(m.course_id, (total.get(m.course_id) ?? 0) + 1)
    const ids = new Set((mats ?? []).map((m) => m.id))
    const completed = new Map<string, number>()
    for (const d of done ?? []) if (ids.has(d.material_id)) completed.set(d.course_id, (completed.get(d.course_id) ?? 0) + 1)
    for (const [cid, n] of total) out.set(cid, Math.round(((completed.get(cid) ?? 0) / n) * 100))
  } catch {
    // pre-migration
  }
  return out
}

// ── Files ────────────────────────────────────────────────────────────────
// Storage rejects non-ASCII / spaced keys, so the key is a UUID + a sanitised
// extension; the human file name is kept in the row.
function objectKey(courseId: string, fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const ext = dot > -1 ? fileName.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : ''
  return `${courseId}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`
}

export async function uploadMaterialFile(courseId: string, file: File): Promise<string> {
  const path = objectKey(courseId, file.name)
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined })
  if (error) throw error
  return path
}

/** Signed URL (10 min). With `download`, the browser saves the file under its
 * original name instead of opening it. */
export async function signMaterialFile(path: string, download?: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 600, download ? { download } : undefined)
  return data?.signedUrl ?? null
}

// ── Write: modules ───────────────────────────────────────────────────────
export async function createModule(courseId: string, title: string, description: string | null, position: number) {
  const { error } = await supabase.from('course_modules').insert({ course_id: courseId, title, description, position })
  check(error)
}

export async function updateModule(id: string, values: Partial<Pick<CourseModule, 'title' | 'description' | 'position'>>) {
  const { error } = await supabase.from('course_modules').update(values).eq('id', id)
  check(error)
}

export async function deleteModule(id: string) {
  const { error } = await supabase.from('course_modules').delete().eq('id', id)
  check(error)
}

// ── Write: materials ─────────────────────────────────────────────────────
export type MaterialInput = Pick<
  CourseMaterial,
  'module_id' | 'kind' | 'title' | 'description' | 'file_path' | 'file_name' | 'file_size' | 'mime_type' | 'url' | 'body' | 'published'
>

export async function createMaterial(courseId: string, values: MaterialInput, position: number) {
  const { error } = await supabase.from('course_materials').insert({ course_id: courseId, ...values, position })
  check(error)
}

export async function updateMaterial(id: string, values: Partial<MaterialInput & { position: number }>) {
  const { error } = await supabase
    .from('course_materials')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)
  check(error)
}

/** Deletes the row and (best-effort) its stored file. */
export async function deleteMaterial(m: CourseMaterial) {
  const { error } = await supabase.from('course_materials').delete().eq('id', m.id)
  check(error)
  if (m.file_path) await supabase.storage.from(BUCKET).remove([m.file_path])
}

/** Persist a new order: each id gets its index as position. */
export async function reorderMaterials(ids: string[]) {
  await Promise.all(ids.map((id, i) => supabase.from('course_materials').update({ position: i }).eq('id', id)))
}

export async function reorderModules(ids: string[]) {
  await Promise.all(ids.map((id, i) => supabase.from('course_modules').update({ position: i }).eq('id', id)))
}

// ── Announcements ────────────────────────────────────────────────────────
export async function listAnnouncements(courseId: string): Promise<CourseAnnouncement[]> {
  const { data, error } = await supabase
    .from('course_announcements')
    .select('*, author:profiles(name)')
    .eq('course_id', courseId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
  check(error)
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>
    return { ...(row as unknown as CourseAnnouncement), authorName: (row.author as { name: string } | null)?.name ?? '' }
  })
}

export async function createAnnouncement(courseId: string, title: string, body: string | null, pinned: boolean) {
  const { error } = await supabase.from('course_announcements').insert({ course_id: courseId, title, body, pinned })
  check(error)
}

export async function updateAnnouncement(id: string, values: Partial<Pick<CourseAnnouncement, 'title' | 'body' | 'pinned'>>) {
  const { error } = await supabase.from('course_announcements').update(values).eq('id', id)
  check(error)
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from('course_announcements').delete().eq('id', id)
  check(error)
}

// ── Q&A ──────────────────────────────────────────────────────────────────
export async function listPosts(courseId: string): Promise<CoursePost[]> {
  const { data, error } = await supabase
    .from('course_posts')
    .select('*, author:profiles(name, role)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true })
  check(error)
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>
    const author = row.author as { name: string; role: string } | null
    return { ...(row as unknown as CoursePost), authorName: author?.name ?? '', authorRole: author?.role ?? '' }
  })
}

export async function createPost(courseId: string, body: string, parentId: string | null) {
  const { error } = await supabase.from('course_posts').insert({ course_id: courseId, body, parent_id: parentId })
  check(error)
}

export async function setPostResolved(id: string, resolved: boolean) {
  const { error } = await supabase.from('course_posts').update({ resolved }).eq('id', id)
  check(error)
}

export async function deletePost(id: string) {
  const { error } = await supabase.from('course_posts').delete().eq('id', id)
  check(error)
}

// ── Helpers ──────────────────────────────────────────────────────────────
export type FileFamily = 'pdf' | 'doc' | 'sheet' | 'slides' | 'image' | 'video' | 'audio' | 'archive' | 'code' | 'other'

export function fileFamily(name: string | null, mime: string | null): FileFamily {
  const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? ''
  const m = mime ?? ''
  if (ext === 'pdf' || m === 'application/pdf') return 'pdf'
  if (['doc', 'docx', 'odt', 'rtf', 'txt', 'md'].includes(ext)) return 'doc'
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'sheet'
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) return 'slides'
  if (m.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (m.startsWith('video/') || ['mp4', 'webm', 'mov', 'm4v'].includes(ext)) return 'video'
  if (m.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'ogg'].includes(ext)) return 'audio'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive'
  if (['py', 'r', 'ipynb', 'js', 'ts', 'json', 'html', 'sql', 'sav', 'do'].includes(ext)) return 'code'
  return 'other'
}

/** Human size, wrapped in Unicode LTR isolates so "5.1 MB" doesn't flip to
 * "MB 5.1" inside Arabic text. */
export function formatBytes(n: number | null): string {
  if (!n) return ''
  const s =
    n < 1024
      ? `${n} B`
      : n < 1024 ** 2
        ? `${(n / 1024).toFixed(0)} KB`
        : n < 1024 ** 3
          ? `${(n / 1024 ** 2).toFixed(1)} MB`
          : `${(n / 1024 ** 3).toFixed(2)} GB`
  return `⁦${s}⁩`
}

/** Embeddable player URL for YouTube / Vimeo / Google Drive links, or null
 * when the link should just open in a new tab. */
export function embedUrl(raw: string | null): string | null {
  if (!raw) return null
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '')
  if (host === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`
  if (host === 'youtube.com') {
    const v = u.searchParams.get('v')
    if (v) return `https://www.youtube-nocookie.com/embed/${v}`
    const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)
    if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`
  }
  if (host === 'vimeo.com') {
    const m = u.pathname.match(/^\/(\d+)/)
    if (m) return `https://player.vimeo.com/video/${m[1]}`
  }
  if (host === 'player.vimeo.com') return raw
  if (host === 'drive.google.com') {
    const m = u.pathname.match(/\/file\/d\/([\w-]+)/)
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
  }
  if (host === 'docs.google.com' && /\/(document|presentation|spreadsheets)\/d\//.test(u.pathname)) {
    return raw.replace(/\/(edit|view)(\?.*)?$/, '/preview')
  }
  return null
}

/** Is this a direct video file URL that a <video> tag can play? */
export function isDirectVideo(raw: string | null): boolean {
  return !!raw && /\.(mp4|webm|m4v|mov)(\?|$)/i.test(raw)
}
