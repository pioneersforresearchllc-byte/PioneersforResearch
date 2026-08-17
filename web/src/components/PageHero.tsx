/** Shared header band for the standalone marketing pages (About, Contact…). */
export function PageHero({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border bg-gradient-to-b from-bg-soft to-white px-4 py-12 text-center md:py-16">
      {eyebrow && <div className="mb-3 text-[13px] font-semibold tracking-[2px] text-accent">{eyebrow}</div>}
      <h1 className="font-heading text-[28px] font-bold text-navy md:text-[38px]">{title}</h1>
      {subtitle && <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-8 text-muted">{subtitle}</p>}
    </div>
  )
}
