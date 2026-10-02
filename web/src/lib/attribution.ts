/**
 * First-touch lead source: where a visitor first came from (an ad's UTM tags,
 * a click id, or the referring site). Kept 60 days in this browser only and
 * attached to quote/contact messages so the owner can see which channel brings
 * customers. No cookies, nothing sent to third parties.
 */
const KEY = 'pioneers.source'
const TTL_MS = 60 * 24 * 60 * 60 * 1000

export interface LeadSource {
  source: string
  medium?: string
  campaign?: string
  at: number
}

function fromReferrer(ref: string): string | null {
  try {
    const host = new URL(ref).hostname.replace(/^www\./, '')
    if (!host || host === window.location.hostname) return null
    if (/instagram/.test(host)) return 'instagram'
    if (/facebook|fb\.com/.test(host)) return 'facebook'
    if (/t\.co$|twitter|x\.com/.test(host)) return 'x'
    if (/tiktok/.test(host)) return 'tiktok'
    if (/snapchat/.test(host)) return 'snapchat'
    if (/google\./.test(host)) return 'google'
    if (/whatsapp|wa\.me/.test(host)) return 'whatsapp'
    if (/linkedin/.test(host)) return 'linkedin'
    return host
  } catch {
    return null
  }
}

/** Call once on app start. Keeps the first source; a new paid-ad click (UTM) replaces it. */
export function captureLeadSource() {
  try {
    const params = new URLSearchParams(window.location.search)
    const utm = params.get('utm_source')
    let next: LeadSource | null = null
    if (utm) {
      next = { source: utm, medium: params.get('utm_medium') || undefined, campaign: params.get('utm_campaign') || undefined, at: Date.now() }
    } else if (params.get('fbclid')) {
      next = { source: 'facebook/instagram ad', at: Date.now() }
    } else if (params.get('gclid')) {
      next = { source: 'google ad', at: Date.now() }
    } else {
      const r = fromReferrer(document.referrer)
      if (r) next = { source: r, at: Date.now() }
    }
    const current = getLeadSource()
    if (next && (!current || utm)) localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage blocked: attribution simply isn't recorded
  }
}

export function getLeadSource(): LeadSource | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as LeadSource
    if (Date.now() - s.at > TTL_MS) return null
    return s
  } catch {
    return null
  }
}

/** One line for a message, e.g. "المصدر: instagram / paid / ramadan". */
export function leadSourceLine(lang: 'ar' | 'en'): string {
  const s = getLeadSource()
  const parts = s ? [s.source, s.medium, s.campaign].filter(Boolean).join(' / ') : lang === 'ar' ? 'مباشر' : 'direct'
  return `${lang === 'ar' ? 'المصدر' : 'Source'}: ${parts}`
}
