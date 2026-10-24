import { useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const SITE_URL = 'https://pioneersresearch.com'
const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

// Signed-in areas and one-off flow pages: never worth indexing. Certificate
// verify pages carry a person's name, so they stay out of search results too.
const PRIVATE_PATH = /^\/(student|teacher|owner|institution|call|group-call|verify\/|owner-login|owner-otp|register-otp|complete-profile|auth\/|reset-password|forgot-password|teacher-pending|institution-pending|my-requests)/

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

/** Absolute self-URL of a path, no query/hash, no trailing slash (except "/"). */
export function canonicalUrl(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/'
  return SITE_URL + path
}

/**
 * Mounted once in App. On every route change it points the canonical link and
 * og:url at the current page (index.html ships the homepage's) and resets the
 * robots tag. A layout effect, so it runs before the pages' own useDocumentMeta
 * effects, which may then override robots (e.g. the 404 page's noindex).
 */
export function SeoSync() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    const url = canonicalUrl(pathname)
    upsertCanonical(url)
    upsertMeta('property', 'og:url', url)
    upsertMeta('name', 'robots', PRIVATE_PATH.test(pathname) ? 'noindex, nofollow' : DEFAULT_ROBOTS)
  }, [pathname])
  return null
}

interface MetaOptions {
  /** Absolute image URL for link previews (WhatsApp, X, LinkedIn). */
  image?: string | null
  type?: 'website' | 'article'
  noindex?: boolean
}

/** Set the document <title>, meta description and their Open Graph / Twitter
 * copies for a page, restoring the previous values on unmount. Gives each SPA
 * route its own search snippet and link preview. */
export function useDocumentMeta(title: string, description?: string, opts: MetaOptions = {}) {
  const { image, type, noindex } = opts
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    const restore: (() => void)[] = []
    const set = (attr: 'name' | 'property', key: string, value: string) => {
      const prev = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)?.content
      upsertMeta(attr, key, value)
      if (prev != null) restore.push(() => upsertMeta(attr, key, prev))
    }

    set('property', 'og:title', title)
    set('name', 'twitter:title', title)
    if (description) {
      set('name', 'description', description)
      set('property', 'og:description', description)
      set('name', 'twitter:description', description)
    }
    if (image) {
      set('property', 'og:image', image)
      set('name', 'twitter:image', image)
    }
    if (type) set('property', 'og:type', type)
    // Not restored: SeoSync resets robots on the next route change.
    if (noindex) upsertMeta('name', 'robots', 'noindex, follow')

    return () => {
      document.title = prevTitle
      restore.forEach((fn) => fn())
    }
  }, [title, description, image, type, noindex])
}

/** Inject a JSON-LD structured-data block for as long as the page is mounted. */
export function useJsonLd(data: object | null | undefined) {
  const json = data ? JSON.stringify(data) : null
  useEffect(() => {
    if (!json) return
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.textContent = json
    document.head.appendChild(el)
    return () => el.remove()
  }, [json])
}
