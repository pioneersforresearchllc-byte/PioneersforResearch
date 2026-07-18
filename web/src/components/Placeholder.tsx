import { useLanguage } from '@/lib/i18n'

/** Temporary stand-in for a page not yet built in this phase. */
export function Placeholder({ title }: { title?: string }) {
  const { t } = useLanguage()
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
      <div className="font-heading text-xl font-bold text-navy">{title ?? t('placeholder.notFound')}</div>
      <div className="text-sm text-muted">{t('placeholder.building')}</div>
    </div>
  )
}
