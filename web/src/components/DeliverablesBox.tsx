import { lazy, Suspense, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import {
  deleteDeliverable,
  listDeliverables,
  previewDeliverable,
  signDeliverable,
  uploadDeliverable,
  type Deliverable,
} from '@/lib/services'

const DeliverablePreview = lazy(() => import('./DeliverablePreview'))

/**
 * Final deliverables of a service request. Staff upload/delete; the student
 * sees the file names but can download only once the request is paid in full
 * (the storage policy enforces it — `locked` just explains it up front).
 */
export function DeliverablesBox({ requestId, manage, locked }: { requestId: string; manage: boolean; locked: boolean }) {
  const { lang } = useLanguage()
  const tx = (a: string, e: string) => (lang === 'ar' ? a : e)
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState<{ blob: Blob; name: string } | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const key = ['deliverables', requestId]
  const { data: files } = useQuery({ queryKey: key, queryFn: () => listDeliverables(requestId) })

  const upload = async (list: FileList | null) => {
    if (!list?.length) return
    setBusy(true)
    setMsg('')
    try {
      for (const f of Array.from(list)) await uploadDeliverable(requestId, f)
      void queryClient.invalidateQueries({ queryKey: key })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : tx('تعذّر الرفع', 'Upload failed'))
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const open = async (d: Deliverable) => {
    setMsg('')
    const url = await signDeliverable(d.path)
    if (url) window.open(url, '_blank')
    else setMsg(tx('الملف مقفل حتى سداد المبلغ المتبقي.', 'This file unlocks once the remaining balance is paid.'))
  }

  // Watermarked, view-only preview (PDF) — the client reads the work before
  // paying without a clean file ever reaching the browser.
  const openPreview = async (d: Deliverable) => {
    setMsg('')
    setPreviewingId(d.id)
    try {
      const blob = await previewDeliverable(d.id)
      setPreview({ blob, name: d.file_name })
    } catch (e) {
      setMsg(
        e instanceof Error && /pdf/i.test(e.message)
          ? tx('المعاينة متاحة لملفات PDF فقط.', 'Preview is available for PDF files only.')
          : tx('تعذّرت المعاينة، حاول مجددًا.', 'Preview failed, please try again.'),
      )
    } finally {
      setPreviewingId(null)
    }
  }

  const remove = async (d: Deliverable) => {
    if (!confirm(tx(`حذف «${d.file_name}»؟`, `Delete “${d.file_name}”?`))) return
    await deleteDeliverable(d)
    void queryClient.invalidateQueries({ queryKey: key })
  }

  if (!manage && (files ?? []).length === 0) return null

  return (
    <div className="mb-3 rounded-lg border border-border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-bold text-navy">
          📦 {tx('الملفات النهائية', 'Final files')}
          {locked && (
            <span className="ms-2 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
              🔒 {manage ? tx('مقفلة للطالب حتى السداد', 'Locked for the student until paid') : tx('معاينة متاحة · التحميل بعد السداد', 'Preview available · download after payment')}
            </span>
          )}
        </div>
        {manage && (
          <>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="rounded-md bg-navy px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? '...' : tx('+ رفع ملف نهائي', '+ Upload final file')}
            </button>
          </>
        )}
      </div>
      {(files ?? []).length === 0 ? (
        <div className="text-[12.5px] text-muted">{tx('لم تُرفع ملفات نهائية بعد.', 'No final files yet.')}</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {(files ?? []).map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 text-[13px]">
              {!manage && locked ? (
                <button
                  type="button"
                  onClick={() => void openPreview(d)}
                  disabled={previewingId === d.id}
                  className="min-w-0 truncate text-start text-accent underline underline-offset-2 disabled:opacity-50"
                >
                  👁 {previewingId === d.id ? tx('جارٍ الفتح…', 'Opening…') : d.file_name}
                  <span className="ms-1 text-[11px] text-muted">({tx('معاينة', 'preview')})</span>
                </button>
              ) : (
                <button type="button" onClick={() => void open(d)} className="min-w-0 truncate text-start text-navy underline underline-offset-2">
                  📄 {d.file_name}
                </button>
              )}
              {manage && (
                <button type="button" onClick={() => void remove(d)} className="shrink-0 text-[12px] text-faint hover:text-error">
                  🗑
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {msg && <div className="mt-2 text-[12.5px] text-error">{msg}</div>}
      {preview && (
        <Suspense fallback={null}>
          <DeliverablePreview blob={preview.blob} fileName={preview.name} onClose={() => setPreview(null)} />
        </Suspense>
      )}
    </div>
  )
}
