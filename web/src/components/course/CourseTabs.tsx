// Tab bar for the course pages. The active tab lives in ?tab= so it survives a
// refresh and can be linked to directly.
import { useSearchParams } from 'react-router-dom'

export interface CourseTab {
  key: string
  label: string
  badge?: number
}

export function useCourseTab(fallback: string): [string, (key: string) => void] {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || fallback
  const setTab = (key: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        n.set('tab', key)
        return n
      },
      { replace: true },
    )
  return [tab, setTab]
}

export function CourseTabs({ tabs, active, onChange }: { tabs: CourseTab[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="sticky top-[65px] z-10 -mx-1 mb-5 overflow-x-auto bg-bg-soft/90 px-1 backdrop-blur [scrollbar-width:none]">
      <div role="tablist" className="flex min-w-max gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            onClick={() => onChange(t.key)}
            className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-4 py-3 text-[13.5px] font-semibold transition-colors ${
              active === t.key ? 'border-gold text-navy' : 'border-transparent text-muted hover:text-navy'
            }`}
          >
            {t.label}
            {!!t.badge && (
              <span className="rounded-full bg-gold px-1.5 py-px text-[10.5px] font-bold leading-4 text-navy">{t.badge}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
