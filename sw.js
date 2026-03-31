// Service Worker mínimo para PWA
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => {
      return new Response('Offline', {
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});
