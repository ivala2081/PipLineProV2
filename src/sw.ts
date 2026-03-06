/// <reference lib="webworker" />
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

declare let self: ServiceWorkerGlobalScope

// Allow the main thread (vite-plugin-pwa) to activate the waiting SW on demand
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Guard: stop Workbox from touching non-HTTP requests (e.g. chrome-extension://).
// This listener is registered first; stopImmediatePropagation() prevents
// Workbox's own fetch listeners from running for these URLs.
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) {
    event.stopImmediatePropagation()
  }
})

// Precache all assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA navigation fallback — serve cached index.html for all navigation requests
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api/, /^\/functions/],
  }),
)

// Google Fonts stylesheet
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
)

// Google Fonts files
registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
)

// Supabase REST API
registerRoute(
  /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 5 })],
    networkTimeoutSeconds: 10,
  }),
)
