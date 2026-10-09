import { supabase } from '@/lib/supabase'

/**
 * Private contact phone (WhatsApp) per account — table profile_contacts
 * (migration 0072). Stored as bare international digits, e.g. 9665XXXXXXXX.
 */

export const PHONE_COUNTRIES: { code: string; ar: string; en: string }[] = [
  { code: '966', ar: 'السعودية', en: 'Saudi Arabia' },
  { code: '249', ar: 'السودان', en: 'Sudan' },
  { code: '20', ar: 'مصر', en: 'Egypt' },
  { code: '971', ar: 'الإمارات', en: 'UAE' },
  { code: '965', ar: 'الكويت', en: 'Kuwait' },
  { code: '974', ar: 'قطر', en: 'Qatar' },
  { code: '973', ar: 'البحرين', en: 'Bahrain' },
  { code: '968', ar: 'عُمان', en: 'Oman' },
  { code: '962', ar: 'الأردن', en: 'Jordan' },
  { code: '967', ar: 'اليمن', en: 'Yemen' },
  { code: '964', ar: 'العراق', en: 'Iraq' },
  { code: '963', ar: 'سوريا', en: 'Syria' },
  { code: '961', ar: 'لبنان', en: 'Lebanon' },
  { code: '970', ar: 'فلسطين', en: 'Palestine' },
  { code: '218', ar: 'ليبيا', en: 'Libya' },
  { code: '216', ar: 'تونس', en: 'Tunisia' },
  { code: '213', ar: 'الجزائر', en: 'Algeria' },
  { code: '212', ar: 'المغرب', en: 'Morocco' },
  { code: '90', ar: 'تركيا', en: 'Turkey' },
  { code: '92', ar: 'باكستان', en: 'Pakistan' },
  { code: '91', ar: 'الهند', en: 'India' },
  { code: '44', ar: 'المملكة المتحدة', en: 'United Kingdom' },
  { code: '1', ar: 'أمريكا / كندا', en: 'USA / Canada' },
]

/**
 * Builds the stored digits from a country code and what the user typed.
 * Accepts a full international number too (+9665…, 009665…), and drops the
 * local trunk 0 (05… → 9665…). Returns null when it can't be a valid number.
 */
export function normalizePhone(countryCode: string, raw: string): string | null {
  const trimmed = raw.trim()
  let digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  if (trimmed.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2)
  } else if (digits.startsWith(countryCode) && digits.length > countryCode.length + 7) {
    // typed the country code without '+'
  } else {
    digits = countryCode + digits.replace(/^0+/, '')
  }
  if (!/^[0-9]{8,15}$/.test(digits)) return null
  // Saudi mobiles: 966 + 5XXXXXXXX
  if (digits.startsWith('966') && !/^9665[0-9]{8}$/.test(digits)) return null
  return digits
}

/** The signed-in user's phone; undefined when the table isn't there yet (migration pending). */
export async function getMyPhone(userId: string): Promise<string | null | undefined> {
  const { data, error } = await supabase.from('profile_contacts').select('phone').eq('user_id', userId).maybeSingle()
  if (error) return undefined
  return (data?.phone as string | undefined) ?? null
}

export async function savePhone(userId: string, phone: string) {
  const { error } = await supabase
    .from('profile_contacts')
    .upsert({ user_id: userId, phone, updated_at: new Date().toISOString() })
  if (error) throw error
}

/** Owner: every saved phone, keyed by user id. */
export async function listAllPhones(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('profile_contacts').select('user_id, phone')
  const map = new Map<string, string>()
  if (error) return map
  for (const r of data ?? []) map.set(r.user_id as string, r.phone as string)
  return map
}

/** "+966 5X XXX XXXX"-ish display (left-to-right). */
export function formatPhone(digits: string): string {
  return `+${digits}`
}
