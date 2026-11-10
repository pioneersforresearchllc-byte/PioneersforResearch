// Organisation Vision, Mission & Slogan (الرؤية والرسالة والشعار), announced on
// the site for SCFHS CPD-provider readiness. Stored in site_content so the
// owner can edit them; code holds the approved wording until then.
import type { ContentMap } from '@/lib/content'

export const VISION_KEY = 'org.vision'
export const MISSION_KEY = 'org.mission'
export const SLOGAN_KEY = 'org.slogan'

export const DEFAULT_VISION = {
  ar: 'الريادة في تدريبٍ يصنع المهارة ويحقق الأثر، محليًا وإقليميًا وعالميًا.',
  en: 'Leadership in training that builds skills and delivers impact — locally, regionally and globally.',
}

export const DEFAULT_MISSION = {
  ar: 'نصمّم برامج تدريبية ونقدّمها وفق أعلى المعايير، مستندة إلى البحث العلمي، تُكسب المتدربين مهارات قابلة للتطبيق، ونقيس أثرها في الأداء الفردي والمؤسسي.',
  en: 'We design and deliver training programmes to the highest standards, grounded in scientific research, that give trainees applicable skills — and we measure their impact on individual and organisational performance.',
}

export const DEFAULT_SLOGAN = {
  ar: 'تدريب.. مهارة.. أثر.',
  en: 'Training.. Skill.. Impact.',
}

function resolve(content: ContentMap | undefined, key: string, def: { ar: string; en: string }, lang: 'ar' | 'en'): string {
  const v = content?.[key]?.[lang]
  return v && v.trim() ? v : def[lang]
}

export function resolveVision(content: ContentMap | undefined, lang: 'ar' | 'en'): string {
  return resolve(content, VISION_KEY, DEFAULT_VISION, lang)
}

export function resolveMission(content: ContentMap | undefined, lang: 'ar' | 'en'): string {
  return resolve(content, MISSION_KEY, DEFAULT_MISSION, lang)
}

export function resolveSlogan(content: ContentMap | undefined, lang: 'ar' | 'en'): string {
  return resolve(content, SLOGAN_KEY, DEFAULT_SLOGAN, lang)
}
