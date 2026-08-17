import { useLanguage } from '@/lib/i18n'
import { useContentText } from '@/lib/content'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { OfferingSection, useCourses } from '@/pages/marketing/MarketingHome'

export function MarketingCoursesPage() {
  const { t } = useLanguage()
  const ct = useContentText()
  const { data: courses } = useCourses()
  useDocumentMeta(
    'الدورات والبرامج | Pioneers Health Research',
    'دورات وبرامج تدريبية معتمدة في منهجية البحث العلمي: من السؤال البحثي والتحليل حتى النشر.',
  )

  const list = courses ?? []
  const onlyCourses = list.filter((c) => c.kind === 'course')
  const programs = list.filter((c) => c.kind === 'program')

  return (
    <div>
      <OfferingSection
        id="courses"
        eyebrow={ct('home.courses.eyebrow')}
        title={ct('home.courses.title')}
        empty={t('home.courses.empty')}
        ctaLabel={t('home.courses.subscribe')}
        items={onlyCourses}
      />
      {programs.length > 0 && (
        <OfferingSection
          id="programs"
          soft
          title={t('tab.programs')}
          empty={t('home.courses.empty')}
          ctaLabel={t('home.courses.subscribe')}
          items={programs}
        />
      )}
    </div>
  )
}
