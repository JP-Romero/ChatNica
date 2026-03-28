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
   - Ve a [Firebase Console](https://console.firebase.google.com) y pulsa en "Añadir proyecto".
   - Asígnale el nombre "ChatNica" y sigue los pasos hasta crearlo.

2. **Configura Authentication (Anónimo):**
   - En el menú lateral, ve a **Build (Compilación) > Authentication**.
   - Haz clic en "Comenzar" y luego en la pestaña **Sign-in method**.
   - Busca y activa el proveedor **Anónimo**. Pulsa en "Guardar".

3. **Configura Firestore Database:**
   - En el menú lateral, ve a **Build (Compilación) > Firestore Database**.
   - Haz clic en "Crear base de datos" y selecciona la ubicación más cercana.
   - Selecciona "Modo de prueba" (o configura las reglas manualmente):
     ```javascript
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /messages/{message} {
           allow read, write: if request.auth != null;
         }
       }
     }
     ```
   - Pulsa en "Publicar".

4. **Registra tu Aplicación y obtén las credenciales:**
   - En la página de "Información general del proyecto", pulsa el icono de **Web** (</>).
   - Registra tu aplicación (ej: ChatNica Web).
   - Copia el objeto `firebaseConfig` que verás en pantalla (apiKey, authDomain, projectId, etc.).
   - Abre `firebase-config.js` en tu editor y pega esos valores dentro del objeto `const firebaseConfig`.

## 🛠️ Solución de Problemas

- **"Error al entrar"**: Asegúrate de haber activado el inicio de sesión **Anónimo** en la pestaña Authentication.
- **No se envían los mensajes**: Revisa que las **Reglas de Firestore** permitan `read, write: if request.auth != null;`. Si dice `if false;`, nadie podrá escribir nada.

## 🚀 Despliegue (Gratis)
   ```bash
   # Opción A: Firebase Hosting
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy

   # Opción B: GitHub Pages
   # Sube los archivos a tu repo y activa Pages en Settings