/**
 * Amrit Manage — Service Worker v3
 * Only active on app.* subdomain (PWA install prompt).
 * Handles deep-link routing so PWA shortcuts always open the right login page.
 * Strategy: Network-first for API, cache-first for static assets.
 */

const CACHE_NAME = 'amrit-manage-v3';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.png'
];

// ── Install: pre-cache shell ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for /api, cache-first for assets ────
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip unsupported request schemes (like chrome-extension)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Always go to network directly for API calls (bypass Service Worker)
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests — network first, fallback to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // Only use cache-first strategy for static assets
  const isStaticAsset =
    PRECACHE_URLS.includes(url.pathname) ||
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf|eot)$/i.test(url.pathname);

  if (!isStaticAsset) {
    // Let browser handle client routes and dynamic GET requests natively
    return;
  }

  // Static assets — cache first, then network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
