import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useLanguage } from '@/lib/i18n'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * In-site, read-only viewer for a watermarked deliverable preview. Renders the
 * PDF to <canvas> with pdf.js — there is no download/print control, the context
 * menu, selection and drag are blocked, and the bytes it receives are already
 * watermarked server-side. It can't defeat a determined screen capture (nothing
 * can), but there's no clean file to grab and any capture carries the client's
 * watermark. Lazy-loaded so pdf.js stays out of the main bundle.
 */
export default function DeliverablePreview({
  blob,
  fileName,
  onClose,
}: {
  blob: Blob
  fileName: string
  onClose: () => void
}) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const containerRef = useRef<HTMLDivElement>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    ;(async () => {
      try {
        const buf = await blob.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise
        if (cancelled || !container) return
        container.innerHTML = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 1.5 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = 'mx-auto mb-3 block w-full max-w-[860px] rounded shadow-lg'
          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          container.appendChild(canvas)
          await page.render({ canvasContext: ctx, viewport }).promise
          if (cancelled) return
        }
        if (!cancelled) setLoading(false)
      } catch {
        if (!cancelled) {
          setErr(ar ? 'تعذّر عرض الملف.' : 'Could not display the file.')
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
      if (container) container.innerHTML = ''
    }
  }, [blob, ar])

  const block = (e: SyntheticEvent) => e.preventDefault()

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/85" onContextMenu={block}>
      <div className="flex items-center justify-between gap-3 bg-navy px-4 py-3 text-white">
        <div className="min-w-0 truncate text-[14px] font-semibold">
          👁 {fileName} — {ar ? 'معاينة محمية' : 'Protected preview'}
        </div>
        <button onClick={onClose} className="shrink-0 rounded-md bg-white/15 px-3.5 py-1.5 text-[13px] hover:bg-white/25">
          {ar ? 'إغلاق' : 'Close'}
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 bg-gold/20 px-4 py-1.5 text-center text-[11.5px] text-accent">
        {ar
          ? '🔒 نسخة معاينة بعلامة مائية — التحميل يُفتح بعد سداد المبلغ كامل.'
          : '🔒 Watermarked preview — download unlocks after full payment.'}
      </div>
      {loading && !err && (
        <div className="py-6 text-center text-[13px] text-white/80">{ar ? 'جارٍ التحميل…' : 'Loading…'}</div>
      )}
      {err && <div className="bg-error p-2 text-center text-[13px] text-white">{err}</div>}
      <div
        ref={containerRef}
        onContextMenu={block}
        onDragStart={block}
        className="flex-1 select-none overflow-auto bg-[#2b2b2b] p-4"
        style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
      />
    </div>,
    document.body,
  )
}
