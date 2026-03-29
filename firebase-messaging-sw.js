/**
═══════════════════════════════════════════════════════════════
FIREBASE MESSAGING SERVICE WORKER — ChatNica
═══════════════════════════════════════════════════════════════
Este archivo maneja las notificaciones push en SEGUNDO PLANO
(cuando la app está cerrada o minimizada).

REQUISITO: Debe estar en la raíz del dominio para funcionar.
Para activar notificaciones push completas también necesitas:
  • Clave VAPID generada en Firebase Console → Project Settings
    → Cloud Messaging → Web Push Certificates
  • Cloud Functions para enviar las notificaciones a los tokens
═══════════════════════════════════════════════════════════════
*/

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyAgQzLJU_bx5iUtiKOkkb7POeXIK3VpGu0",
  authDomain:        "chatnica-8648d.firebaseapp.com",
  projectId:         "chatnica-8648d",
  storageBucket:     "chatnica-8648d.firebasestorage.app",
  messagingSenderId: "9515659791",
  appId:             "1:9515659791:web:60cd2400fdff67b53a297a"
});

const messaging = firebase.messaging();

// Notificación en segundo plano
messaging.onBackgroundMessage(payload => {
  const { title = '💬 ChatNica', body = 'Nuevo mensaje' } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag:   'chatnica-msg',
    renotify: true,
    data: payload.data || {}
  });
});

// Al hacer clic en la notificación → abrir/enfocar la app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
