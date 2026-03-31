# 💬 ChatNica — Mensajería y Red Social para Nicaragua

> App de mensajería y red social diseñada para conectar a todos los nicaragüenses. Chats privados, grupos, publicaciones y estados.

## 🚀 Características

- ✅ **Chats directos**: Mensajería privada 1-a-1 en tiempo real
- ✅ **Grupos privados**: Solo por invitación, tú decides quién entra
- ✅ **Contactos**: Sistema de solicitudes para conectar con confianza
- ✅ **Feed social**: Publicaciones visibles solo para tus contactos confirmados
- ✅ **Estados**: Imágenes y texto efímeros (24 horas)
- ✅ **Sin teléfono requerido**: Solo email o Google, teléfono opcional
- ✅ **Notas de voz**: Graba y envía audio directamente
- ✅ **Reacciones y respuestas**: Interactúa con cada mensaje
- ✅ **Perfil personalizable**: Foto, bio, ciudad y departamento

## 🛠️ Tecnologías

- HTML5 + CSS3 + JavaScript (Vanilla)
- Tailwind CSS (vía CDN)
- Firebase (Firestore + Auth + Storage)

## 📦 Instalación

1. **Crea tu proyecto en Firebase:**
   - Ve a [Firebase Console](https://console.firebase.google.com) y crea un proyecto llamado "ChatNica".

2. **Configura Authentication:**
   - Ve a **Build > Authentication > Sign-in method**
   - Habilita: **Google** + **Email/Password** + **Anónimo**

3. **Configura Firestore Database:**
   - Ve a **Build > Firestore Database** y crea la base de datos
   - Selecciona "Modo de prueba" o usa las reglas del archivo `firestore.rules`

4. **Configura Storage:**
   - Ve a **Build > Storage** y crea el almacenamiento
   - Reglas recomendadas:
     ```
     rules_version = '2';
     service firebase.storage {
       match /b/{bucket}/o {
         match /{allPaths=**} {
           allow read: if request.auth != null;
           allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
         }
       }
     }
     ```

5. **Obtén las credenciales:**
   - En la página del proyecto, pulsa el icono **Web** (`</>`)
   - Copia el objeto `firebaseConfig`
   - Pégalo en `firebase-config.js`

## 🚀 Despliegue

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 📱 Estructura de la App

### 4 pestañas principales:
1. **💬 Chats** — Lista de conversaciones directas y grupos
2. **👥 Contactos** — Buscar personas, enviar/aceptar solicitudes
3. **📰 Feed** — Publicaciones de tus contactos confirmados
4. **👤 Perfil** — Tu información, editar perfil, ver tus estados

### Funcionalidades:
- **Mensajería**: Texto, imágenes, notas de voz, reacciones, respuestas
- **Grupos**: Privados, solo por invitación, con info de miembros
- **Contactos**: Sistema de solicitudes (enviar, aceptar, rechazar)
- **Feed**: Posts con texto e imágenes, likes y comentarios
- **Estados**: Imágenes o texto que desaparecen en 24 horas
- **Perfil**: Nombre, foto, bio, ciudad, departamento
