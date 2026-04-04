const CACHE_NAME = 'chatnica-v8-pb';
const STATIC_FILES = ['/', '/index.html', '/app.js', '/styles.css', '/pb-config.js'];

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
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      return fetch(e.request).then(response => {
        if (response && response.ok && response.type === 'basic') {
          try {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          } catch (e) {}
        }
        return response;
      }).catch(() => {
        return cached || new Response('Offline', { status: 503 });
      });
    })
  );
});
