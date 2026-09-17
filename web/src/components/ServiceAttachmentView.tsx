import { useEffect, useState } from 'react'
import { signServiceAttachment } from '@/lib/serviceWorkspace'

/** Resolves a private storage path to a short-lived signed URL and renders it
 * as an inline image (for images) or a download chip (everything else). */
export function ServiceAttachmentView({
  path,
  name,
  kind,
  compact,
}: {
  path: string
  name: string | null
  kind: string | null
  compact?: boolean
}) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void signServiceAttachment(path).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [path])

  const label = name || 'ملف'

  if (kind === 'image' && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img src={url} alt={label} className={`rounded-lg border border-border object-cover ${compact ? 'max-h-40' : 'max-h-56'} w-auto`} />
      </a>
    )
  }

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-[12.5px] font-semibold text-navy no-underline hover:border-navy ${url ? '' : 'pointer-events-none opacity-60'}`}
    >
      <span aria-hidden>📎</span>
      <span className="truncate">{label}</span>
    </a>
  )
}
