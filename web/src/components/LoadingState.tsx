/**
 * Centered spinner for lists/pages while their data loads. Replaces the plain
 * "..." / "loading" text so a fetch in flight reads as intentional, not broken.
 */
export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Spinner />
      {label && <div className="text-[13px] text-muted">{label}</div>}
    </div>
  )
}

/** Bare inline spinner — use inside buttons or tight spots. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={
        className ??
        'inline-block h-6 w-6 animate-spin rounded-full border-2 border-navy/20 border-t-navy'
      }
      role="status"
      aria-label="loading"
    />
  )
}
