/*
 * Pioneers Health Research — service worker.
 *
 * A plain static file (NOT bundled by Vite) so a build can never break it and
 * freeze the site. Two jobs:
 *   1. Make the site installable + work offline, WITHOUT ever serving stale
 *      assets to an online user (network-first; the cache is only a fallback
 *      for when the network is unreachable). This deliberately avoids the
 *      stale-CSS problem that stale-while-revalidate would reintroduce.
 *   2. Receive Web Push messages and show/open notifications (wired up in a
 *      later step; the handlers are here and ready).
 */
const CACHE = 'phr-cache-v1'
const OFFLINE_URL = '/'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)).catch(() => {}))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

// Network-first for same-origin GETs; fall back to cache only when offline.
// Cross-origin requests (Supabase API, Google Fonts) are left untouched.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request)
        if (fresh && fresh.ok && fresh.type === 'basic') {
          const cache = await caches.open(CACHE)
          cache.put(request, fresh.clone()).catch(() => {})
        }
        return fresh
      } catch {
        const cached = await caches.match(request)
        if (cached) return cached
        if (request.mode === 'navigate') {
          const fallback = await caches.match(OFFLINE_URL)
          if (fallback) return fallback
        }
        return Response.error()
      }
    })(),
  )
})

// --- Web Push ---------------------------------------------------------------
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }
  const title = payload.title || 'Pioneers Health Research'
  const options = {
    body: payload.body || '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    dir: 'auto',
    lang: payload.lang || 'ar',
    tag: payload.tag,
    renotify: !!payload.tag,
    data: { url: payload.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            await client.navigate(target)
          } catch {
            // navigation across origins/states can throw — focus anyway
          }
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })(),
  )
})
