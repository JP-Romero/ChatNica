# 💬 ChatNica — Mensajería Local para Nicaragua

> App de mensajería PWA que funciona **con o sin internet**. Diseñada para comunidades con conectividad limitada.

## 🚀 Características

- ✅ **PWA instalable**: Funciona como app nativa en Android/iOS
- ✅ **Modo offline**: Los mensajes se guardan y envían después
- ✅ **Tiempo real**: Mensajes instantáneos cuando hay conexión
- ✅ **Liviana**: Sin dependencias pesadas, carga rápida
- ✅ **Privada**: Autenticación anónima, sin datos personales

## 🛠️ Tecnologías

- HTML5 + CSS3 + JavaScript (Vanilla)
- Tailwind CSS (vía CDN)
- Firebase (Firestore + Auth)
- Service Worker para offline

## 📦 Instalación Rápida

1. **Crea tu proyecto en Firebase:**
   - Ve a [console.firebase.google.com](https://console.firebase.google.com)
   - Nuevo proyecto → "ChatNica"
   - Activa: **Authentication** (Anónimo) + **Firestore Database**
   - En Firestore Rules, usa para empezar:
     ```
     allow read, write: if true;
     ```

2. **Configura `firebase-config.js`:**
   - Registra una "Web App" en Firebase
   - Copia tus credenciales en el archivo

3. **Despliega (gratis):**
   ```bash
   # Opción A: Firebase Hosting
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy

   # Opción B: GitHub Pages
   # Sube los archivos a tu repo y activa Pages en Settings