/**
═══════════════════════════════════════════════════════════════
SERVICE WORKER — ChatNica v2
═══════════════════════════════════════════════════════════════
*/

const CACHE_VERSION = 'v3';
const CACHE_NAME    = `chatnica-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase-config.js',
  './manifest.json',
  './offline.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png'
];

// ─── Install ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        SHELL_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn(`[SW] No cache: ${url}`, err))
        )
      )
    )
  );
});

// ─── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase APIs — always network, never cache
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('gstatic.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Tailwind CDN — Cache-First
  if (url.hostname.includes('cdn.tailwindcss.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // Shell — Network-First, fallback to cache, fallback to offline.html for navigation
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const resClone = res.clone();
          if (res.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, resClone));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./offline.html') ||
              new Response('<h1>Sin conexión</h1>', { headers: { 'Content-Type': 'text/html' } });
          }
          return new Response('', { status: 503 });
        })
    );
    return;
  }

  // Default
  event.respondWith(
    fetch(event.request).catch(() =>
      event.request.mode === 'navigate' ? caches.match('./offline.html') : new Response('', { status: 503 })
    )
  );
});
