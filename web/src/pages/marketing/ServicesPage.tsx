import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { ServicesSection } from '@/pages/marketing/MarketingHome'

export function MarketingServicesPage() {
  useDocumentMeta(
    'الخدمات البحثية | Pioneers Health Research',
    'خدمات واستشارات بحثية متخصصة: تصميم الدراسة، التحليل الإحصائي، الكتابة الأكاديمية، والنشر العلمي.',
  )

  return (
    <div>
      <ServicesSection />
    </div>
  )
}
