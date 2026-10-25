// Full-screen viewer for one course material: PDFs, images, audio and video
// files play inline from a signed URL; YouTube / Vimeo / Drive links embed;
// notes render as Markdown. Anything else gets a clear open / download card.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/lib/i18n'
import { Markdown } from '@/components/Markdown'
import {
  embedUrl,
  fileFamily,
  formatBytes,
  isDirectVideo,
  signMaterialFile,
  type CourseMaterial,
} from '@/lib/courseMaterials'
import { MaterialIcon, kindLabel } from './MaterialIcon'

export async function downloadMaterial(m: CourseMaterial) {
  if (!m.file_path) return
  const url = await signMaterialFile(m.file_path, m.file_name ?? m.title)
  if (url) window.location.assign(url)
}

export function MaterialViewer({
  material,
  done,
  onToggleDone,
  onPrev,
  onNext,
  onClose,
}: {
  material: CourseMaterial
  done?: boolean
  onToggleDone?: () => void
  onPrev?: () => void
  onNext?: () => void
  onClose: () => void
}) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const [signed, setSigned] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSigned(null)
    setFailed(false)
    if (material.kind === 'file' && material.file_path) {
      let alive = true
      void signMaterialFile(material.file_path).then((u) => {
        if (!alive) return
        if (u) setSigned(u)
        else setFailed(true)
      })
      return () => {
        alive = false
      }
    }
  }, [material])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const fam = material.kind === 'file' ? fileFamily(material.file_name, material.mime_type) : null
  const embed = material.kind === 'video' || material.kind === 'link' ? embedUrl(material.url) : null

  let body: React.ReactNode
  if (material.kind === 'note') {
    body = (
      <div className="h-full overflow-y-auto rounded-xl bg-white p-6 md:p-10">
        <div className="mx-auto max-w-3xl text-[15px] leading-8 text-muted-2">
          <Markdown source={material.body ?? ''} />
        </div>
      </div>
    )
  } else if (embed) {
    body = (
      <iframe
        src={embed}
        title={material.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="h-full w-full rounded-xl bg-black"
      />
    )
  } else if (material.kind === 'video' && isDirectVideo(material.url)) {
    body = <video src={material.url!} controls className="h-full w-full rounded-xl bg-black" />
  } else if (material.kind === 'file' && failed) {
    body = <Fallback material={material} ar={ar} message={ar ? 'تعذّر فتح الملف. حاول مرة أخرى.' : 'Could not open the file. Please try again.'} />
  } else if (material.kind === 'file' && !signed) {
    body = (
      <div className="flex h-full items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    )
  } else if (material.kind === 'file' && signed && fam === 'pdf') {
    body = <iframe src={signed} title={material.title} className="h-full w-full rounded-xl bg-white" />
  } else if (material.kind === 'file' && signed && fam === 'image') {
    body = (
      <div className="flex h-full items-center justify-center overflow-auto">
        <img src={signed} alt={material.title} className="max-h-full max-w-full rounded-xl object-contain" />
      </div>
    )
  } else if (material.kind === 'file' && signed && fam === 'video') {
    body = <video src={signed} controls autoPlay className="h-full w-full rounded-xl bg-black" />
  } else if (material.kind === 'file' && signed && fam === 'audio') {
    body = (
      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-xl rounded-2xl bg-white p-8 text-center">
          <div className="mb-4 flex justify-center">
            <MaterialIcon material={material} size="lg" />
          </div>
          <div className="mb-5 font-semibold text-navy">{material.title}</div>
          <audio src={signed} controls autoPlay className="w-full" />
        </div>
      </div>
    )
  } else {
    body = (
      <Fallback
        material={material}
        ar={ar}
        message={
          material.kind === 'link'
            ? ar
              ? 'هذا رابط خارجي، سيفتح في نافذة جديدة.'
              : 'This is an external link; it opens in a new tab.'
            : ar
              ? 'لا تتوفر معاينة مباشرة لهذا النوع من الملفات. يمكنك فتحه أو تنزيله.'
              : 'No inline preview for this file type. Open or download it instead.'
        }
      />
    )
  }

  const external = material.kind === 'file' ? signed : material.url

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#071426]/95 backdrop-blur-sm" role="dialog" aria-modal="true">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-white md:px-6">
        <button
          onClick={onClose}
          className="rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold hover:bg-white/20"
          aria-label={ar ? 'إغلاق' : 'Close'}
        >
          ✕ {ar ? 'إغلاق' : 'Close'}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold">{material.title}</div>
          <div className="text-[12px] text-white/60">
            {kindLabel(material, ar)}
            {material.file_size ? ` · ${formatBytes(material.file_size)}` : ''}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {external && material.kind !== 'note' && (
            <a
              href={external}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-white no-underline hover:bg-white/20"
            >
              {ar ? 'فتح في نافذة جديدة' : 'Open in new tab'}
            </a>
          )}
          {material.kind === 'file' && (
            <button
              onClick={() => void downloadMaterial(material)}
              className="rounded-full bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold hover:bg-white/20"
            >
              {ar ? 'تنزيل' : 'Download'}
            </button>
          )}
          {onToggleDone && (
            <button
              onClick={onToggleDone}
              className={`rounded-full px-4 py-1.5 text-[12.5px] font-bold transition-colors ${
                done ? 'bg-success text-white' : 'bg-gold text-navy hover:bg-gold-light'
              }`}
            >
              {done ? (ar ? '✓ مكتمل' : '✓ Completed') : ar ? 'تحديد كمكتمل' : 'Mark complete'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 px-3 pb-3 md:px-6 md:pb-4">{body}</div>

      {material.description && material.kind !== 'note' && (
        <div className="mx-3 mb-3 max-h-28 overflow-y-auto rounded-xl bg-white/5 px-4 py-3 text-[13px] leading-7 text-white/80 md:mx-6">
          {material.description}
        </div>
      )}

      {/* Prev / next */}
      {(onPrev || onNext) && (
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 md:px-6">
          <button
            onClick={onPrev}
            disabled={!onPrev}
            className="rounded-full bg-white/10 px-4 py-2 text-[13px] font-semibold text-white hover:bg-white/20 disabled:opacity-30"
          >
            {ar ? '→ السابق' : '← Previous'}
          </button>
          <button
            onClick={onNext}
            disabled={!onNext}
            className="rounded-full bg-white px-5 py-2 text-[13px] font-bold text-navy hover:bg-white/90 disabled:opacity-30"
          >
            {ar ? 'التالي ←' : 'Next →'}
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}

function Fallback({ material, ar, message }: { material: CourseMaterial; ar: boolean; message: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center">
        <div className="mb-4 flex justify-center">
          <MaterialIcon material={material} size="lg" />
        </div>
        <div className="mb-1 font-semibold text-navy">{material.file_name || material.title}</div>
        <div className="mb-5 text-[13px] leading-6 text-muted">{message}</div>
        <div className="flex justify-center gap-2">
          {material.kind === 'file' ? (
            <button
              onClick={() => void downloadMaterial(material)}
              className="rounded-full bg-navy px-6 py-2.5 text-[13.5px] font-bold text-white hover:bg-navy-hover"
            >
              {ar ? 'تنزيل الملف' : 'Download file'}
            </button>
          ) : (
            material.url && (
              <a
                href={material.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-navy px-6 py-2.5 text-[13.5px] font-bold text-white no-underline hover:bg-navy-hover"
              >
                {ar ? 'فتح الرابط' : 'Open link'}
              </a>
            )
          )}
        </div>
      </div>
    </div>
  )
}
