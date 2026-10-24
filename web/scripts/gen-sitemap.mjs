// Build-time sitemap generator. Regenerates public/sitemap.xml with every
// static page plus every public article, service and course pulled from
// Supabase, so new content is picked up automatically on each deploy. Runs
// before `vite build`; it NEVER throws — on any hiccup it falls back to the
// static pages so a sitemap is always produced and the build never breaks.
import { writeFileSync } from 'node:fs'

const SITE = 'https://pioneersresearch.com'
const TODAY = new Date().toISOString().slice(0, 10)

// [path, priority, changefreq]
const STATIC = [
  ['/', '1.0', 'weekly'],
  ['/about', '0.8', 'monthly'],
  ['/courses', '0.9', 'weekly'],
  ['/services', '0.9', 'weekly'],
  ['/institutions', '0.8', 'monthly'],
  ['/contact', '0.6', 'monthly'],
  ['/register', '0.6', 'monthly'],
  ['/login', '0.4', 'monthly'],
  ['/terms', '0.3', 'yearly'],
  ['/privacy', '0.3', 'yearly'],
]

const escLoc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const block = (loc, priority, changefreq) =>
  `  <url>\n    <loc>${SITE}${escLoc(loc)}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`

async function rows(base, key, path) {
  try {
    const res = await fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function main() {
  const blocks = STATIC.map(([l, p, c]) => block(l, p, c))
  const base = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (base && key) {
    const [articles, services, courses] = await Promise.all([
      rows(base, key, 'articles?select=id&order=created_at.desc'),
      rows(base, key, 'services?select=slug'),
      rows(base, key, 'courses?select=id&order=created_at.desc'),
    ])
    for (const a of articles) if (a?.id) blocks.push(block(`/article/${a.id}`, '0.7', 'monthly'))
    for (const s of services) if (s?.slug) blocks.push(block(`/service/${s.slug}`, '0.8', 'monthly'))
    for (const c of courses) if (c?.id) blocks.push(block(`/course/${c.id}`, '0.8', 'weekly'))
    console.log(`[sitemap] ${articles.length} articles, ${services.length} services, ${courses.length} courses`)
  } else {
    console.log('[sitemap] no Supabase env — writing static pages only')
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${blocks.join('\n')}\n</urlset>\n`
  writeFileSync(new URL('../public/sitemap.xml', import.meta.url), xml, 'utf-8')
  console.log(`[sitemap] wrote ${blocks.length} URLs to public/sitemap.xml`)
}

main().catch((e) => {
  console.error('[sitemap] generation failed (ignored):', e)
  process.exitCode = 0
})
