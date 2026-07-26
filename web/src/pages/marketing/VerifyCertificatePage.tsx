import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { verifyCertificate } from '@/lib/certificates'

export function VerifyCertificatePage() {
  const { id } = useParams()
  const { t, dir, lang } = useLanguage()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['verify-certificate', id],
    enabled: !!id,
    queryFn: () => verifyCertificate(id!),
  })

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const valid = !!data && !isError

  return (
    <div dir={dir} lang={lang} className="flex min-h-screen items-center justify-center bg-gradient-to-b from-bg-soft to-white px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center font-heading text-lg font-bold text-navy">Pioneers Health Research</div>

        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-navy/20 border-t-navy" />
              <div className="text-[13.5px] text-muted">{t('verify.checking')}</div>
            </div>
          ) : valid && data ? (
            <>
              <div className="flex flex-col items-center gap-3 bg-gradient-to-br from-[#0d2748] to-[#0a1c34] px-6 py-8 text-center text-white">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20 text-success">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m8 12 2.5 2.5L16 9" />
                  </svg>
                </div>
                <div className="font-heading text-xl font-bold">{t('verify.valid')}</div>
              </div>
              <div className="flex flex-col gap-3 p-6">
                {data.cert_number && <Row label={t('verify.number')} value={data.cert_number} />}
                <Row label={t('verify.name')} value={data.student_name} />
                <Row label={t('verify.course')} value={data.course_title} />
                {data.template_title && <Row label={t('verify.certificate')} value={data.template_title} />}
                <Row label={t('verify.date')} value={fmtDate(data.issued_at)} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-error">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6M9 9l6 6" />
                </svg>
              </div>
              <div className="font-heading text-lg font-bold text-navy">{t('verify.invalid')}</div>
              <div className="max-w-xs text-[13px] leading-6 text-muted">{t('verify.invalidHint')}</div>
            </div>
          )}
        </div>

        <div className="mt-5 text-center">
          <Link to="/" className="text-[13px] font-semibold text-navy no-underline hover:text-gold">
            {t('verify.backHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border-2 pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-[12.5px] font-semibold text-muted">{label}</span>
      <span className="text-right text-[14px] font-semibold text-navy">{value}</span>
    </div>
  )
}
