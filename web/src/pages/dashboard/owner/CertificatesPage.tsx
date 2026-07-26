import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTemplate,
  deleteTemplate,
  issueCertificatesForCourse,
  listCourseTemplateIds,
  listTemplates,
  setCourseTemplates,
  updateTemplatePosition,
  uploadTemplateImage,
  type CertificateTemplate,
} from '@/lib/certificates'
import { listCoursesWithMeta } from '@/lib/courses'
import { useLanguage } from '@/lib/i18n'

type Marker = 'name' | 'course' | 'qr' | 'date'

function TemplateEditor({ template, onClose, onSaved }: { template: CertificateTemplate; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const [pos, setPos] = useState({
    name_x: template.name_x,
    name_y: template.name_y,
    course_x: template.course_x,
    course_y: template.course_y,
    qr_x: template.qr_x,
    qr_y: template.qr_y,
    date_x: template.date_x,
    date_y: template.date_y,
  })
  const [dragging, setDragging] = useState<Marker | null>(null)
  const imgRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  const handleMove = (clientX: number, clientY: number) => {
    if (!dragging || !imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    setPos((p) => ({ ...p, [`${dragging}_x`]: x, [`${dragging}_y`]: y }))
  }

  const save = async () => {
    setBusy(true)
    try {
      await updateTemplatePosition(template.id, pos)
      onSaved()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-[560px] rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 font-heading text-lg font-bold text-navy">{t('oCerts.positionTitle')}</div>
        <div className="mb-3 text-[12.5px] text-muted">{t('oCerts.positionHint')}</div>
        <div
          ref={imgRef}
          className="relative w-full select-none overflow-hidden rounded-lg border border-border"
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={() => setDragging(null)}
          onMouseLeave={() => setDragging(null)}
        >
          <img src={template.image_url} className="block w-full" alt="" draggable={false} />
          <div
            onMouseDown={() => setDragging('name')}
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-gold shadow"
            style={{ left: `${pos.name_x}%`, top: `${pos.name_y}%` }}
            title={t('oCerts.nameDotTitle')}
          />
          <div
            onMouseDown={() => setDragging('course')}
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-muted shadow"
            style={{ left: `${pos.course_x}%`, top: `${pos.course_y}%` }}
            title={t('oCerts.courseDotTitle')}
          />
          <div
            onMouseDown={() => setDragging('date')}
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-accent shadow"
            style={{ left: `${pos.date_x}%`, top: `${pos.date_y}%` }}
            title={t('oCerts.dateDotTitle')}
          />
          <div
            onMouseDown={() => setDragging('qr')}
            className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded border-2 border-white bg-navy text-[9px] font-bold text-white shadow"
            style={{ left: `${pos.qr_x}%`, top: `${pos.qr_y}%` }}
            title={t('oCerts.qrDotTitle')}
          >
            QR
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-gold" /> {t('oCerts.nameDotTitle')}</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-muted" /> {t('oCerts.courseDotTitle')}</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-accent" /> {t('oCerts.dateDotTitle')}</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-navy" /> {t('oCerts.qrDotTitle')}</span>
        </div>
        <div className="mt-4 flex gap-2.5">
          <button
            onClick={() => void save()}
            disabled={busy}
            className="flex-1 rounded-md bg-navy py-2.75 text-[14px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
          >
            {t('oCerts.savePosition')}
          </button>
          <button onClick={onClose} className="rounded-md border border-border px-5 py-2.75 text-[14px] text-navy">
            {t('dash.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

function CourseCertPanel({ courseId, courseTitle, onClose }: { courseId: string; courseTitle: string; onClose: () => void }) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const templatesQuery = useQuery({ queryKey: ['cert-templates'], queryFn: listTemplates })
  const linkedQuery = useQuery({ queryKey: ['course-cert-templates', courseId], queryFn: () => listCourseTemplateIds(courseId) })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const toggle = async (templateId: string) => {
    const current = linkedQuery.data ?? []
    const next = current.includes(templateId) ? current.filter((id) => id !== templateId) : [...current, templateId]
    await setCourseTemplates(courseId, next)
    void queryClient.invalidateQueries({ queryKey: ['course-cert-templates', courseId] })
  }

  const issue = async (reissue = false) => {
    if (reissue && !confirm(t('oCerts.reissueConfirm'))) return
    setBusy(true)
    setMessage('')
    try {
      const count = await issueCertificatesForCourse(courseId, courseTitle, { reissue })
      setMessage(count > 0 ? t('oCerts.issued', { count: String(count) }) : t('oCerts.noneEligible'))
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t('oCerts.issueError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-[440px] rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 font-heading text-lg font-bold text-navy">{t('oCerts.certsFor', { course: courseTitle })}</div>
        <div className="mb-4 text-[12.5px] text-muted">{t('oCerts.chooseTemplates')}</div>
        <div className="mb-4 flex flex-col gap-1.5">
          {(templatesQuery.data ?? []).map((tpl) => (
            <label key={tpl.id} className="flex items-center gap-2 text-[13.5px] text-navy">
              <input
                type="checkbox"
                checked={(linkedQuery.data ?? []).includes(tpl.id)}
                onChange={() => void toggle(tpl.id)}
              />
              {tpl.title}
            </label>
          ))}
          {templatesQuery.data && templatesQuery.data.length === 0 && (
            <div className="text-[13px] text-muted">{t('oCerts.addTemplateFirst')}</div>
          )}
        </div>
        {message && <div className="mb-3 text-[13px] text-navy">{message}</div>}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2.5">
            <button
              onClick={() => void issue(false)}
              disabled={busy}
              className="flex-1 rounded-md bg-navy py-2.75 text-[14px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
            >
              {busy ? t('oCerts.issuing') : t('oCerts.issueNow')}
            </button>
            <button onClick={onClose} className="rounded-md border border-border px-5 py-2.75 text-[14px] text-navy">
              {t('dash.close')}
            </button>
          </div>
          <button
            onClick={() => void issue(true)}
            disabled={busy}
            className="rounded-md border border-navy py-2.5 text-[13px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:opacity-50"
          >
            {t('oCerts.reissueAll')}
          </button>
          <div className="text-[11.5px] leading-5 text-muted">{t('oCerts.reissueHint')}</div>
        </div>
      </div>
    </div>
  )
}

export function OwnerCertificatesPage() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const templatesQuery = useQuery({ queryKey: ['cert-templates'], queryFn: listTemplates })
  const coursesQuery = useQuery({ queryKey: ['owner-courses'], queryFn: listCoursesWithMeta })
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null)
  const [certCourseId, setCertCourseId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [uploading, setUploading] = useState(false)

  const refreshTemplates = () => void queryClient.invalidateQueries({ queryKey: ['cert-templates'] })

  const uploadNew = async (file: File) => {
    if (!newTitle.trim()) {
      alert(t('oCerts.nameTemplateFirst'))
      return
    }
    setUploading(true)
    try {
      const url = await uploadTemplateImage(file)
      await createTemplate(newTitle.trim(), url)
      setNewTitle('')
      refreshTemplates()
    } finally {
      setUploading(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm(t('oCerts.confirmDeleteTemplate'))) return
    await deleteTemplate(id)
    refreshTemplates()
  }

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('oCerts.title')}</div>

      <div className="mb-8">
        <div className="mb-2.5 text-[15px] font-semibold text-navy">{t('oCerts.templates')}</div>
        <div className="mb-4 flex items-center gap-2.5">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('oCerts.newTemplatePh')}
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && void uploadNew(e.target.files[0])}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {(templatesQuery.data ?? []).map((tpl) => (
            <div key={tpl.id} className="rounded-xl border border-border bg-white p-3">
              <img src={tpl.image_url} className="mb-2.5 block aspect-[1.4] w-full rounded-md object-cover" alt="" />
              <div className="mb-2 text-[13.5px] font-semibold text-navy">{tpl.title}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingTemplate(tpl)}
                  className="flex-1 rounded-md border border-border py-1.5 text-[12px] text-navy hover:border-navy"
                >
                  {t('oCerts.setPosition')}
                </button>
                <button
                  onClick={() => void remove(tpl.id)}
                  className="rounded-md border border-border px-2.5 py-1.5 text-[12px] text-error hover:border-error"
                >
                  {t('dash.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2.5 text-[15px] font-semibold text-navy">{t('oCerts.issueSection')}</div>
        <div className="flex flex-col gap-2">
          {(coursesQuery.data ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setCertCourseId(c.id)}
              className="flex items-center justify-between rounded-lg border border-border bg-white p-4 text-right hover:border-navy"
            >
              <span className="text-[14px] font-semibold text-navy">{c.title}</span>
              <span className="text-[12.5px] text-faint">{t('oCerts.enrolled', { n: String(c.enrolledCount) })}</span>
            </button>
          ))}
        </div>
      </div>

      {editingTemplate && (
        <TemplateEditor template={editingTemplate} onClose={() => setEditingTemplate(null)} onSaved={refreshTemplates} />
      )}
      {certCourseId && (
        <CourseCertPanel
          courseId={certCourseId}
          courseTitle={coursesQuery.data?.find((c) => c.id === certCourseId)?.title ?? ''}
          onClose={() => setCertCourseId(null)}
        />
      )}
    </div>
  )
}
