const CACHE_NAME = 'chatnica-v6-pb';
const DYNAMIC_FILES = ['/', '/index.html', '/app.js', '/styles.css', '/pb-config.js'];

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
  if (e.request.method !== 'GET') return;

  if (e.request.url.includes('googleapis.com')) return;

  const url = new URL(e.request.url);
  const path = url.pathname;

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
