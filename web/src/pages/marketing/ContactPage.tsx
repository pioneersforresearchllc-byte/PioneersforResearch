import { useLanguage } from '@/lib/i18n'
import { useContentText } from '@/lib/content'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { ContactForm } from '@/components/ContactForm'

export function MarketingContactPage() {
  const { t } = useLanguage()
  const ct = useContentText()
  useDocumentMeta('تواصل معنا | Pioneers Health Research', 'تواصل مع فريق بيونيرز للأبحاث الصحية — نجيب استفساراتك حول الدورات والخدمات البحثية.')

  return (
    <div className="relative overflow-hidden bg-[#0a1c34] px-4 py-16 text-white md:px-16 md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0d2748] via-[#0a1c34] to-[#050e1a]" />
      <div className="pointer-events-none absolute -top-24 h-80 w-80 rounded-full bg-gold/15 blur-[90px] ltr:right-[-4rem] rtl:left-[-4rem]" />
      <div className="pointer-events-none absolute bottom-[-8rem] h-96 w-96 rounded-full bg-[#1a3f6e]/50 blur-[110px] ltr:left-[-5rem] rtl:right-[-5rem]" />

      <div className="relative mx-auto max-w-130">
        <div className="mb-9 text-center">
          <div className="mb-3.5 text-[13px] font-semibold tracking-[2px] text-gold">{ct('home.contact.eyebrow')}</div>
          <h1 className="font-heading text-[26px] font-bold md:text-[32px]">{ct('home.contact.title')}</h1>
        </div>
        <ContactForm />
        <div className="mt-8 text-center text-[13.5px] text-white/70">
          {t('contactPage.orEmail')}{' '}
          <a href="mailto:pioneersforresearchllc@gmail.com" className="font-semibold text-gold no-underline">
            pioneersforresearchllc@gmail.com
          </a>
        </div>
      </div>
    </div>
  )
}
