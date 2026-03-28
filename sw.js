/**
═══════════════════════════════════════════════════════════════
SERVICE WORKER — ChatNica PWA
═══════════════════════════════════════════════════════════════
📌 VERSIÓN: 1.0.0
📌 ESTRATEGIAS:
• Shell (HTML/CSS/JS local): Network-First
• Firebase: Network-First con fallback a cache
• CDN (Tailwind): Cache-First
═══════════════════════════════════════════════════════════════
*/

const CACHE_VERSION = 'v1';
const CACHE_NAME = `chatnica-shell-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase-config.js',
  './manifest.json',
  './offline.html'
];

// ─────────────────────────────────────────────
//  INSTALL: pre-cachear shell
// ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log(`[SW ${CACHE_VERSION}] Cacheando shell…`);
      return cache.addAll(SHELL_ASSETS);
    })
  );
});

// ─────────────────────────────────────────────
//  ACTIVATE: limpiar cachés viejas
// ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────
//  FETCH: estrategias por tipo de recurso
// ─────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Firebase - Network-First
  if (url.hostname.includes('firestore.googleapis.com') || 
      url.hostname.includes('firebaseinstallations.googleapis.com')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Tailwind CDN - Cache-First
  if (url.hostname.includes('cdn.tailwindcss.com')) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          });
        })
    );
    return;
  }
  
  // Shell local - Network-First
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Default
  event.respondWith(
    fetch(event.request).catch(() => caches.match('./offline.html'))
  );
});