/**
═══════════════════════════════════════════════════════════════
SERVICE WORKER — ChatNica PWA
═══════════════════════════════════════════════════════════════
📌 ESTRATEGIA: 
• Shell (HTML/CSS/JS): Cache-First para carga rápida
• Firebase: Network-First para mensajes en tiempo real
• Offline: Fallback a página personalizada
═══════════════════════════════════════════════════════════════
*/

const CACHE_NAME = 'chatnica-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase-config.js',
  './manifest.json',
  './offline.html',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 🔹 INSTALAR: precachear archivos del shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// 🔹 ACTIVAR: limpiar cachés viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => 
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 🔹 FETCH: estrategia híbrida
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Firebase: intentar red primero, fallback a cache
  if (url.hostname.includes('firestore.googleapis.com') || 
      url.hostname.includes('firebaseinstallations.googleapis.com')) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
    );
    return;
  }
  
  // Archivos locales: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request)
        .then((cached) => cached || fetch(request))
    );
    return;
  }
  
  // CDN (Tailwind): cache-first
  if (url.hostname.includes('cdn.tailwindcss.com')) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          });
        })
    );
    return;
  }
  
  // Default: network-first con fallback a offline.html
  event.respondWith(
    fetch(request)
      .catch(() => caches.match('./offline.html'))
  );
});