// Organisation Vision & Mission (الرؤية والرسالة), announced on the site for
// SCFHS CPD-provider readiness. Stored in site_content so the owner can edit
// them; code holds professional defaults until then.
import type { ContentMap } from '@/lib/content'

export const VISION_KEY = 'org.vision'
export const MISSION_KEY = 'org.mission'

export const DEFAULT_VISION = {
  ar: 'أن نكون شريكًا موثوقًا للممارسين والمؤسسات الصحية في المملكة لتطوير البحث العلمي والممارسة المبنية على الدليل، ومرجعًا للتعليم المهني المستمر عالي الجودة في المجال الصحي.',
  en: 'To be a trusted partner to healthcare practitioners and institutions in the Kingdom in advancing scientific research and evidence-based practice, and a reference for high-quality continuing professional development in healthcare.',
}

export const DEFAULT_MISSION = {
  ar: 'تطوير معارف الممارسين الصحيين ومهاراتهم وأدائهم عبر أنشطة تعليمية وخدمات بحثية مبنية على احتياج حقيقي، ومستقلة عن المصالح التجارية، ومصمّمة وفق معايير الهيئة السعودية للتخصصات الصحية، ونقيس أثرها على مستوى الممارس وعلى جودة الرعاية الصحية.',
  en: 'To develop healthcare practitioners’ knowledge, skills and performance through needs-based educational activities and research services that are independent of commercial interests, designed to the standards of the Saudi Commission for Health Specialties, and whose impact we measure on the practitioner and on quality of care.',
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
