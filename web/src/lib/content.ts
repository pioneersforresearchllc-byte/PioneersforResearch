import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import type { translations } from '@/lib/translations'

export type ContentKey = keyof typeof translations
export type ContentMap = Record<string, { ar: string | null; en: string | null }>

// The homepage strings the owner is allowed to edit, grouped for the editor
// UI. Every `key` must exist in `translations` (that's the fallback text), and
// `groupKey`/`labelKey` are translation keys for the editor's own bilingual UI.
export const EDITABLE_CONTENT: { groupKey: ContentKey; keys: { key: ContentKey; labelKey: ContentKey }[] }[] = [
  {
    groupKey: 'cms.group.hero',
    keys: [
      { key: 'home.hero.title', labelKey: 'cms.lbl.heroTitle' },
      { key: 'home.hero.subtitle', labelKey: 'cms.lbl.heroSubtitle' },
      { key: 'home.hero.createAccount', labelKey: 'cms.lbl.heroCreateAccount' },
      { key: 'home.hero.browsePrograms', labelKey: 'cms.lbl.heroBrowse' },
    ],
  },
  {
    groupKey: 'cms.group.stats',
    keys: [
      { key: 'home.stats.programs', labelKey: 'cms.lbl.statsPrograms' },
      { key: 'home.stats.stages', labelKey: 'cms.lbl.statsStages' },
      { key: 'home.stats.oneToOne', labelKey: 'cms.lbl.statsOneToOne' },
      { key: 'home.stats.certificate', labelKey: 'cms.lbl.statsCertificate' },
    ],
  },
  {
    groupKey: 'cms.group.about',
    keys: [
      { key: 'home.about.eyebrow', labelKey: 'cms.lbl.aboutEyebrow' },
      { key: 'home.about.title', labelKey: 'cms.lbl.aboutTitle' },
      { key: 'home.about.body', labelKey: 'cms.lbl.aboutBody' },
      { key: 'home.about.teamTitle', labelKey: 'cms.lbl.aboutTeamTitle' },
    ],
  },
  {
    groupKey: 'cms.group.sections',
    keys: [
      { key: 'home.courses.eyebrow', labelKey: 'cms.lbl.coursesEyebrow' },
      { key: 'home.courses.title', labelKey: 'cms.lbl.coursesTitle' },
      { key: 'home.services.title', labelKey: 'cms.lbl.servicesTitle' },
      { key: 'home.resources.eyebrow', labelKey: 'cms.lbl.resourcesEyebrow' },
      { key: 'home.resources.title', labelKey: 'cms.lbl.resourcesTitle' },
      { key: 'home.contact.eyebrow', labelKey: 'cms.lbl.contactEyebrow' },
      { key: 'home.contact.title', labelKey: 'cms.lbl.contactTitle' },
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

// ── Social account links (footer) ─────────────────────────────────────────
// Stored in site_content under these keys so the owner can edit or hide each
// one from the admin panel. Defaults are used until a row exists; once the
// owner saves a row, that value wins — and an empty value hides the icon.
export const SOCIAL_KEYS = ['social.instagram', 'social.x', 'social.discord'] as const
export type SocialKey = (typeof SOCIAL_KEYS)[number]

export const DEFAULT_SOCIAL: Record<SocialKey, string> = {
  'social.instagram': 'https://www.instagram.com/pioneers.health.research/?hl=en',
  'social.x': 'https://x.com/Pioneers_hr',
  'social.discord': 'https://discord.gg/tVspUg5GfR',
}

/**
 * Resolves a social link: if the owner has saved a row (even an empty one, to
 * hide it) that wins; otherwise the built-in default URL is used.
 */
export function resolveSocialLink(content: ContentMap | undefined, key: SocialKey): string {
  const entry = content?.[key]
  if (entry === undefined) return DEFAULT_SOCIAL[key]
  return entry.en ?? ''
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
