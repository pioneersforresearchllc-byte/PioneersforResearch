import type { ReactNode } from 'react'

/**
 * Friendly placeholder for empty lists — a soft icon disc, a title, and an
 * optional line of guidance. Keeps empty screens from feeling broken. Pass
 * `action` to slot a call-to-action button/link beneath the text.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-soft/60 px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-navy/[0.06] text-navy">
        {icon ?? <DefaultIcon />}
      </div>
      <div className="mb-1 text-[15px] font-semibold text-navy">{title}</div>
      {description && <div className="max-w-sm text-[13px] leading-6 text-muted">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

function DefaultIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  )
}
