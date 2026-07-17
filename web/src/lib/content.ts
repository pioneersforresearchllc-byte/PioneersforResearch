import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import type { translations } from '@/lib/translations'

export type ContentKey = keyof typeof translations
export type ContentMap = Record<string, { ar: string | null; en: string | null }>

// The homepage strings the owner is allowed to edit, grouped for the editor
// UI. Every key here must exist in `translations` (that's the fallback text).
export const EDITABLE_CONTENT: { group: string; keys: { key: ContentKey; label: string }[] }[] = [
  {
    group: 'الواجهة الرئيسية (Hero)',
    keys: [
      { key: 'home.hero.title', label: 'العنوان الرئيسي' },
      { key: 'home.hero.subtitle', label: 'النص التعريفي' },
      { key: 'home.hero.createAccount', label: 'زر إنشاء الحساب' },
      { key: 'home.hero.browsePrograms', label: 'زر استعراض الدورات' },
    ],
  },
  {
    group: 'الأرقام (Stats)',
    keys: [
      { key: 'home.stats.programs', label: 'وصف عدد الدورات' },
      { key: 'home.stats.stages', label: 'وصف مراحل الإشراف' },
      { key: 'home.stats.oneToOne', label: 'وصف الإشراف الفردي' },
      { key: 'home.stats.certificate', label: 'وصف الشهادة' },
    ],
  },
  {
    group: 'من نحن (About)',
    keys: [
      { key: 'home.about.eyebrow', label: 'العنوان الصغير' },
      { key: 'home.about.title', label: 'العنوان' },
      { key: 'home.about.body', label: 'النص' },
      { key: 'home.about.teamTitle', label: 'عنوان فريق العمل' },
    ],
  },
  {
    group: 'أقسام الصفحة',
    keys: [
      { key: 'home.courses.eyebrow', label: 'الدورات — العنوان الصغير' },
      { key: 'home.courses.title', label: 'الدورات — العنوان' },
      { key: 'home.services.title', label: 'الخدمات — العنوان' },
      { key: 'home.resources.eyebrow', label: 'الموارد — العنوان الصغير' },
      { key: 'home.resources.title', label: 'الموارد — العنوان' },
      { key: 'home.contact.eyebrow', label: 'تواصل — العنوان الصغير' },
      { key: 'home.contact.title', label: 'تواصل — العنوان' },
    ],
  },
]

export async function fetchSiteContent(): Promise<ContentMap> {
  const { data, error } = await supabase.from('site_content').select('key, value_ar, value_en')
  if (error) return {}
  const map: ContentMap = {}
  for (const row of data ?? []) map[row.key] = { ar: row.value_ar, en: row.value_en }
  return map
}

export async function saveSiteContent(key: string, valueAr: string, valueEn: string) {
  const { error } = await supabase
    .from('site_content')
    .upsert({ key, value_ar: valueAr || null, value_en: valueEn || null, updated_at: new Date().toISOString() })
  if (error) throw error
}

/**
 * Returns a resolver that prefers the owner's edited copy for a key and
 * falls back to the built-in translation. Use it exactly like `t()` for the
 * editable homepage strings.
 */
export function useContentText() {
  const { t, lang } = useLanguage()
  const { data } = useQuery({ queryKey: ['site-content'], queryFn: fetchSiteContent })
  return (key: ContentKey) => {
    const override = data?.[key]?.[lang]
    return override && override.trim() ? override : t(key)
  }
}
