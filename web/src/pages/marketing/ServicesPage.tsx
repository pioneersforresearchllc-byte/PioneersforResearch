import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { ServicesSection } from '@/pages/marketing/MarketingHome'

export function MarketingServicesPage() {
  useDocumentMeta(
    'استشارات وخدمات البحث العلمي — تحليل إحصائي SPSS وخطة بحث ونشر | الرواد الاستشارية للبحوث الصحية',
    'خدمات واستشارات بحثية متخصصة: مستشار بحث علمي، مساعدة رسائل الماجستير والدكتوراه، كتابة خطة البحث والمنهجية، التحليل الإحصائي SPSS، الإطار النظري والدراسات السابقة، والنشر في المجلات المحكمة وسكوبس.',
  )

  return (
    <div>
      <ServicesSection />
    </div>
  )
}
