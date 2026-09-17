import { LogoLoader } from '@/components/LogoLoader'

/**
 * Centered branded loader for lists/pages while their data loads — the logo
 * fills with its colour so a fetch in flight reads as intentional, not broken.
 * Unified across the app (see LogoLoader).
 */
export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="py-12">
      <LogoLoader size={60} label={label} />
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
