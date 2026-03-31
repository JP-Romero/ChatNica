// Service Worker para PWA — Network-first para archivos dinámicos
const CACHE_NAME = 'chatnica-v5';
const DYNAMIC_FILES = ['/', '/index.html', '/app.js', '/styles.css', '/firebase-config.js'];

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // La API de Cache solo soporta peticiones GET.
  // Firebase usa POST para enviar mensajes y autenticar, lo que causaba el error de "unsupported method".
  if (e.request.method !== 'GET') return;

  // Evitar cachear llamadas a las APIs de Google/Firebase para evitar conflictos
  if (e.request.url.includes('googleapis.com')) return;

  const url = new URL(e.request.url);
  const path = url.pathname;

  // Cache-first para archivos de la app (Carga instantánea)
  if (DYNAMIC_FILES.includes(path) || path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.html')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(response => {
          if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(e.request, response.clone()));
          return response;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // Cache-first para assets estáticos (imágenes, iconos)
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
