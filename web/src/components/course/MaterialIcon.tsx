// Coloured file-type badges for course materials (PDF, Word, slides, video…).
import { fileFamily, type CourseMaterial, type FileFamily } from '@/lib/courseMaterials'

type Look = { label: string; bg: string; fg: string }

const FAMILY: Record<FileFamily, Look> = {
  pdf: { label: 'PDF', bg: 'bg-red-50', fg: 'text-red-600' },
  doc: { label: 'DOC', bg: 'bg-blue-50', fg: 'text-blue-600' },
  sheet: { label: 'XLS', bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  slides: { label: 'PPT', bg: 'bg-orange-50', fg: 'text-orange-600' },
  image: { label: 'IMG', bg: 'bg-violet-50', fg: 'text-violet-600' },
  video: { label: 'VID', bg: 'bg-rose-50', fg: 'text-rose-600' },
  audio: { label: 'AUD', bg: 'bg-pink-50', fg: 'text-pink-600' },
  archive: { label: 'ZIP', bg: 'bg-amber-50', fg: 'text-amber-700' },
  code: { label: 'CODE', bg: 'bg-slate-100', fg: 'text-slate-700' },
  other: { label: 'FILE', bg: 'bg-bg-soft', fg: 'text-muted-2' },
}

function Glyph({ kind }: { kind: 'video' | 'link' | 'note' }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (kind === 'video')
    return (
      <svg {...common}>
        <rect x="2.5" y="5" width="15" height="14" rx="2.5" />
        <path d="m17.5 10 4-2.5v9l-4-2.5" />
      </svg>
    )
  if (kind === 'link')
    return (
      <svg {...common}>
        <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
        <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  )
}

export function MaterialIcon({ material, size = 'md' }: { material: CourseMaterial; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl'
  if (material.kind === 'file') {
    const look = FAMILY[fileFamily(material.file_name, material.mime_type)]
    return (
      <div className={`flex shrink-0 items-center justify-center ${box} ${look.bg} ${look.fg} text-[10.5px] font-extrabold tracking-wide`}>
        {look.label}
      </div>
    )
  }
  const look =
    material.kind === 'video'
      ? 'bg-rose-50 text-rose-600'
      : material.kind === 'link'
        ? 'bg-sky-50 text-sky-600'
        : 'bg-gold/10 text-accent'
  return (
    <div className={`flex shrink-0 items-center justify-center ${box} ${look}`}>
      <Glyph kind={material.kind} />
    </div>
  )
}

export function kindLabel(m: CourseMaterial, ar: boolean): string {
  if (m.kind === 'video') return ar ? 'فيديو' : 'Video'
  if (m.kind === 'link') return ar ? 'رابط' : 'Link'
  if (m.kind === 'note') return ar ? 'ملاحظة' : 'Note'
  const fam = fileFamily(m.file_name, m.mime_type)
  const names: Record<FileFamily, [string, string]> = {
    pdf: ['ملف PDF', 'PDF'],
    doc: ['مستند', 'Document'],
    sheet: ['جدول بيانات', 'Spreadsheet'],
    slides: ['عرض تقديمي', 'Slides'],
    image: ['صورة', 'Image'],
    video: ['فيديو', 'Video'],
    audio: ['صوت', 'Audio'],
    archive: ['ملف مضغوط', 'Archive'],
    code: ['ملف بيانات/كود', 'Data / code'],
    other: ['ملف', 'File'],
  }
  return names[fam][ar ? 0 : 1]
}
