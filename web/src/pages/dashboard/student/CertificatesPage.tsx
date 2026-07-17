import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { listMyCertificates } from '@/lib/certificates'

export function StudentCertificatesPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const { data, isLoading } = useQuery({
    queryKey: ['my-certificates', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyCertificates(profile!.id),
  })

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">{t('sCerts.title')}</div>

      {isLoading && <div className="text-muted">{t('dash.loading')}</div>}
      {data && data.length === 0 && <div className="text-muted">{t('sCerts.none')}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(data ?? []).map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-white p-4">
            {c.image_url && <img src={c.image_url} className="mb-3 block w-full rounded-lg" alt={c.template_title} />}
            <div className="mb-1 text-[14px] font-semibold text-navy">{c.course_title}</div>
            <div className="mb-2.5 text-[12.5px] text-muted">{c.template_title}</div>
            {c.image_url && (
              <a
                href={c.image_url}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-md border border-navy py-2 text-center text-[12.5px] text-navy no-underline hover:bg-bg-soft"
              >
                {t('sCerts.download')}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
