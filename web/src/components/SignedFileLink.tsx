import { useState } from 'react'

/**
 * Opens a file that lives in a PRIVATE storage bucket. The file has no public
 * URL, so we ask Supabase for a short-lived signed URL on click and open it in
 * a new tab. `sign` returns the signed URL (or null on failure).
 */
export function SignedFileLink({
  sign,
  label,
  className,
}: {
  sign: () => Promise<string | null>
  label: string
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const open = async () => {
    if (busy) return
    setBusy(true)
    try {
      const url = await sign()
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      type="button"
      onClick={() => void open()}
      disabled={busy}
      className={className ?? 'inline-block cursor-pointer bg-transparent p-0 text-[12.5px] text-navy underline disabled:opacity-60'}
    >
      {busy ? '…' : label}
    </button>
  )
}
