import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import { fetchSiteContent, resolveWhatsapp } from '@/lib/content'
import { EMAIL, PRIVACY, REFUND, TERMS, type Doc, type Lang } from '@/lib/legalDocs'
import { legalDocsHash, TERMS_VERSION } from '@/lib/legal'

const EFFECTIVE = {
  ar: `تاريخ السريان وآخر تحديث: 14 أكتوبر 2026 — الإصدار ${TERMS_VERSION}`,
  en: `Effective & last updated: 14 October 2026 — version ${TERMS_VERSION}`,
}

function LegalDoc({ doc, lang }: { doc: Doc; lang: Lang }) {
  const { data: content } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  const wa = resolveWhatsapp(content)
  const { data: hash } = useQuery({ queryKey: ['legal-docs-hash', TERMS_VERSION], queryFn: legalDocsHash, staleTime: Infinity })
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8 md:py-16">
      <Link to="/" className="mb-4 inline-block text-[13px] text-muted no-underline">
        {lang === 'ar' ? '→ الرئيسية' : '← Home'}
      </Link>
      <h1 className="font-heading mb-2 text-[26px] font-bold text-navy md:text-[32px]">{doc.title}</h1>
      <div className="mb-6 text-[12.5px] text-faint">{EFFECTIVE[lang]}</div>
      <p className="mb-4 text-[15px] leading-8 text-muted-2">{doc.intro}</p>
      <div className="mb-8 rounded-xl border border-border bg-bg-soft px-4 py-3 text-[13.5px] leading-7 text-navy">
        {lang === 'ar' ? 'للتواصل: ' : 'Contact: '}
        <a href={`mailto:${EMAIL}`} className="font-semibold text-navy">
          {EMAIL}
        </a>
        {wa && (
          <>
            {' — '}
            {lang === 'ar' ? 'واتساب: ' : 'WhatsApp: '}
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" dir="ltr" className="font-semibold text-navy">
              +{wa}
            </a>
          </>
        )}
        <div className="mt-1 flex flex-wrap gap-x-4 text-[12.5px]">
          <Link to="/terms" className="text-muted">{lang === 'ar' ? 'الشروط والأحكام' : 'Terms'}</Link>
          <Link to="/privacy" className="text-muted">{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy'}</Link>
          <Link to="/refund" className="text-muted">{lang === 'ar' ? 'سياسة الاسترجاع والإلغاء' : 'Refund & cancellation'}</Link>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        {doc.sections.map((s, i) => (
          <section key={i}>
            <h2 className="font-heading mb-2 text-[17px] font-bold text-navy">
              {i + 1}. {s.h}
            </h2>
            {s.p.map((para, j) => (
              <p key={j} className="mb-2 text-[14px] leading-7 text-muted-2">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
      {hash && (
        <div className="mt-10 border-t border-border pt-4 text-[11px] leading-5 text-faint" dir="ltr">
          {lang === 'ar' ? 'بصمة نص هذا الإصدار (SHA-256)' : 'Fingerprint of this version (SHA-256)'}: <span className="break-all font-mono">{hash}</span>
        </div>
      )}
    </div>
  )
}

export function TermsPage() {
  const { lang } = useLanguage()
  return <LegalDoc doc={TERMS[lang]} lang={lang} />
}

export function PrivacyPage() {
  const { lang } = useLanguage()
  return <LegalDoc doc={PRIVACY[lang]} lang={lang} />
}

export function RefundPage() {
  const { lang } = useLanguage()
  return <LegalDoc doc={REFUND[lang]} lang={lang} />
}
