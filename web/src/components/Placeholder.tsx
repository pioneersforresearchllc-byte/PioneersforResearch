import { Link } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n'

/** 404 page for any route that doesn't exist (e.g. a mistyped or old link). */
export function Placeholder({ title }: { title?: string }) {
  const { t } = useLanguage()
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <img src="/logo.png" alt="" className="mb-2 h-14 w-14" />
      <div className="font-heading text-5xl font-bold text-navy">404</div>
      <div className="font-heading text-xl font-bold text-navy">{title ?? t('placeholder.notFound')}</div>
      <div className="max-w-sm text-sm leading-7 text-muted">{t('placeholder.building')}</div>
      <Link
        to="/"
        className="mt-3 rounded-md bg-navy px-6 py-2.5 text-[14px] font-semibold text-white no-underline hover:bg-navy-hover"
      >
        {t('placeholder.home')}
      </Link>
    </div>
  )
}
