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
           // Cualquiera puede leer mensajes
           allow read: if request.auth != null;
           // Solo el autor puede escribir (o cualquiera autenticado para este chat)
           allow create: if request.auth != null;
           // Permitir actualizar para reacciones y confirmación de lectura
           allow update: if request.auth != null;
           // Solo el autor puede borrar su propio mensaje
           allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
         }
         match /users/{userId} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
         match /presence/{userId} {
          allow read: if request.auth != null;
          allow write: if request.auth != null && request.auth.uid == userId;
         }
         match /typing/{channelId} {
           allow read, write: if request.auth != null;
         }
       }
     }
     ```
   - Pulsa en "Publicar".

4. **Configura Firebase Storage (para imágenes):**
   - Ve a **Build (Compilación) > Storage**.
   - Pulsa "Comenzar" y selecciona "Modo de prueba".
   - Reglas recomendadas:
     ```javascript
     rules_version = '2';
     service firebase.storage {
       match /b/{bucket}/o {
         match /chats/{allPaths=**} {
           allow read: if request.auth != null;
           allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024; // Máx 5MB
         }
         match /voice/{allPaths=**} {
           allow read: if request.auth != null;
           allow write: if request.auth != null && request.resource.size < 2 * 1024 * 1024; // Máx 2MB para audio
         }
       }
     }
     ```

5. **Registra tu Aplicación y obtén las credenciales:**
   - En la página de "Información general del proyecto", pulsa el icono de **Web** (</>).
   - Registra tu aplicación (ej: ChatNica Web).
   - Copia el objeto `firebaseConfig` que verás en pantalla (apiKey, authDomain, projectId, etc.).
   - Abre `firebase-config.js` en tu editor y pega esos valores dentro del objeto `const firebaseConfig`.

## 🛠️ Solución de Problemas

- **"Error al entrar"**: Asegúrate de haber activado el inicio de sesión **Anónimo** en la pestaña Authentication.
- **No se envían los mensajes**: Revisa que las **Reglas de Firestore** permitan `read, write: if request.auth != null;`. Si dice `if false;`, nadie podrá escribir nada.
- **Error 404 al configurar GitHub Actions (Service Account)**: Este error sucede porque la API de IAM no está activa en tu proyecto de Google Cloud.
   1. Ve a la [Google Cloud Console](https://console.cloud.google.com/apis/library/iamcredentials.googleapis.com).
   2. Asegúrate de tener seleccionado tu proyecto `chatnica-8648d`.
   3. Haz clic en **HABILITAR**.
   4. Vuelve a ejecutar `firebase init hosting:github` en tu terminal.
- **"Didn't find a Hosting config"**: Este error ocurre porque Firebase no reconoce el archivo `firebase.json` o porque estás ejecutando el comando fuera de la carpeta del proyecto.
   1. **IMPORTANTE**: Asegúrate de que tu terminal esté en la carpeta raíz del proyecto (donde está el archivo `index.html`) y NO en tu carpeta de usuario personal (C:\Users\juanp).
   2. He creado los archivos `firebase.json` y `.firebaserc` por ti para que Firebase reconozca la configuración de inmediato. Solo tienes que volver a ejecutar `firebase init hosting:github`.

- **Error: No currently active project**: Si el CLI no reconoce el proyecto, ejecuta:
   `firebase use chatnica-8648d`

- **Canales de Prueba (Sin usar IPs)**: Para probar en el celular con HTTPS sin configurar IPs:
   1. **Crear canal (Rápido)**: `npm run preview`
   2. **Ver canales activos**: `firebase hosting:channel:list`
   3. **Eliminar canal (Rápido)**: `npm run clean-preview`
   4. **Importante**: Recuerda añadir la URL generada a "Dominios Autorizados" en la Consola de Firebase para que el login funcione.

## 📱 Cómo ver la App en tu Celular (Desarrollo)

Si estás desarrollando en tu PC y quieres ver cómo queda en tu móvil, tienes estas opciones:

### 1. **Red Local (WiFi)** — La más rápida:
   - Asegúrate de que tu PC y tu móvil estén en la misma red WiFi.
   - Abre la terminal en tu PC y escribe `ipconfig` (Windows) o `ifconfig` (Mac/Linux) para buscar tu **Dirección IPv4** (ej: `192.168.1.15`).
   - Inicia un servidor local en tu PC (ej: con la extensión "Live Server" de VS Code o usando `python -m http.server 8000`).
   - En el navegador de tu celular, escribe la IP de tu PC seguida del puerto (ej: `http://192.168.1.15:8000`).
   - **Nota:** Como no es HTTPS, algunas funciones de PWA (como instalar la app) podrían estar limitadas.

### 2. **Firebase Hosting** — Recomendado (Con HTTPS):
   - Al desplegar en Firebase Hosting, obtendrás una URL real con certificado SSL (`https://tu-proyecto.web.app`), lo que permitirá instalar la PWA en tu móvil y probarla al 100%.

### 3. **Ngrok (Túnel Temporal)**:
   - Descarga [Ngrok](https://ngrok.com/), ejecútalo con `ngrok http 8000` y te dará una URL pública temporal que puedes abrir en cualquier celular del mundo.

## 🔄 Sincronización (Flujo de Trabajo)

Como tu código está en **GitHub**, puedes trabajar desde cualquier PC (o desde tu USB) y mantener tu página web siempre actualizada siguiendo estos pasos en tu terminal:

1. **Guardar tus cambios localmente:**
   ```bash
   git add .
   git commit -m "Descripción de tu mejora (ej: añadidos avatares)"
   ```
2. **Subir a la nube (GitHub):**
   ```bash
   git push origin main
   ```
3. **¡Listo!** GitHub actualizará automáticamente tu página en `https://jp-romero.github.io/ChatNica/` en un par de minutos. Así, tu web estará disponible **24/7** aunque tu PC esté apagada.

## 🚀 Despliegue (Gratis)
   ```bash
   # Opción A: Firebase Hosting
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy

   # Opción B: GitHub Pages
   1. Sube los archivos a tu repositorio.
   2. Ve a **Settings > Pages** y activa el despliegue desde la rama `main`.
   3. **IMPORTANTE (Firebase):** Debes autorizar el dominio de GitHub para que el chat funcione.
      - Ve a la [Consola de Firebase](https://console.firebase.google.com).
      - Menú lateral > **Authentication** > pestaña **Settings**.
      - Busca la sección **Dominios autorizados**.
      - Haz clic en "Añadir dominio" y pon: `jp-romero.github.io`.