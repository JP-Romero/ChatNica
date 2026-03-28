/**
═══════════════════════════════════════════════════════════════
SERVICE WORKER — ChatNica PWA
═══════════════════════════════════════════════════════════════
📌 VERSIÓN: 1.0.1
📌 ESTRATEGIAS:
• Shell (HTML/CSS/JS local): Network-First
• Firebase: Network-First con fallback a cache
• CDN (Tailwind): Cache-First
═══════════════════════════════════════════════════════════════
*/

const CACHE_VERSION = 'v2';
const CACHE_NAME    = `chatnica-shell-${CACHE_VERSION}`;

// FIX: incluir los iconos maskable que están en manifest.json
const SHELL_ASSETS = [
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

// ─────────────────────────────────────────────
//  INSTALL: pre-cachear shell
// ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log(`[SW ${CACHE_VERSION}] Cacheando shell…`);
      // addAll falla si algún recurso no existe; usamos Promise.allSettled para
      // ser tolerantes con recursos opcionales (p.ej. iconos maskable ausentes).
      return Promise.allSettled(
        SHELL_ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn(`[SW] No se pudo cachear ${url}:`, err)
          )
        )
      );
    })
  );
  // Activar de inmediato sin esperar a que cierren las pestañas antiguas
  self.skipWaiting();
});

// ─────────────────────────────────────────────
//  ACTIVATE: limpiar cachés viejas
// ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key   => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────
//  FETCH: estrategias por tipo de recurso
// ─────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase — Network-First (sin fallback a cache; los datos en tiempo real
  // no tienen sentido si están desactualizados, Firebase SDK maneja el offline)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseinstallations.googleapis.com')
  ) {
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

  // Shell local — Network-First
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Actualizar cache con respuesta fresca
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;

          // FIX: para navegaciones (HTML), servir offline.html en lugar de undefined
          if (event.request.mode === 'navigate') {
            const offlinePage = await caches.match('./offline.html');
            if (offlinePage) return offlinePage;
          }

          // Sin cache disponible: respuesta vacía con error
          return new Response('Sin conexión', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Default — intento de red, fallback a offline.html para navegaciones
  event.respondWith(
    fetch(event.request).catch(async () => {
      if (event.request.mode === 'navigate') {
        return caches.match('./offline.html');
      }
      return new Response('', { status: 503 });
    })
  );
});
