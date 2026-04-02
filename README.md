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
- PocketBase (Auth + Database + Storage + Realtime)

## 📦 Instalación

### 1. Iniciar PocketBase

```bash
cd pocketbase
./pocketbase.exe serve
```

PocketBase se ejecutará en `http://127.0.0.1:8090`

### 2. Configurar el admin

- Abre `http://127.0.0.1:8090/_/`
- Crea tu cuenta de administrador

### 3. Configurar colecciones

Abre la consola admin de PocketBase y crea estas colecciones:

#### `users` (auth collection)
Campos extra:
- `displayName` (text)
- `photoURL` (file, single)
- `color` (text)
- `bio` (text)
- `city` (text)
- `department` (text)

#### `contacts` (base)
- `requester` (relation → users)
- `target` (relation → users)
- `status` (select: pending, accepted)

API Rules:
- List/View: `@request.auth.id != ""`
- Create: `@request.auth.id != "" && requester = @request.auth.id`
- Update/Delete: `@request.auth.id != ""`

#### `conversations` (base)
- `type` (select: direct, group)
- `participants` (relation[] → users)
- `name` (text)
- `createdBy` (relation → users)
- `lastMessage` (text)
- `lastMessageTime` (date)

API Rules:
- List/View: `@request.auth.id != "" && participants.id ?= @request.auth.id`
- Create: `@request.auth.id != "" && participants.id ?= @request.auth.id`
- Update: `@request.auth.id != "" && participants.id ?= @request.auth.id`
- Delete: `@request.auth.id != "" && createdBy = @request.auth.id`

#### `messages` (base)
- `conversation` (relation → conversations)
- `text` (text)
- `image` (file, single)
- `video` (file, single)
- `audio` (file, single)
- `user` (relation → users)
- `replyTo` (relation → messages)
- `replyToUserName` (text)
- `reactions` (json)
- `status` (select: sent, delivered, read)

API Rules:
- List/View: `@request.auth.id != ""`
- Create: `@request.auth.id != "" && user = @request.auth.id`
- Update: `@request.auth.id != ""`
- Delete: `@request.auth.id != "" && user = @request.auth.id`

#### `posts` (base)
- `uid` (relation → users)
- `text` (text)
- `images` (file, multiple)
- `likes` (json)
- `comments` (json)

API Rules:
- List/View: `@request.auth.id != ""`
- Create: `@request.auth.id != "" && uid = @request.auth.id`
- Update/Delete: `@request.auth.id != "" && uid = @request.auth.id`

#### `stories` (base)
- `uid` (relation → users)
- `type` (select: image, text)
- `image` (file, single)
- `text` (text)
- `expiresAt` (date)
- `views` (json)

API Rules:
- List/View: `@request.auth.id != ""`
- Create: `@request.auth.id != "" && uid = @request.auth.id`
- Update/Delete: `@request.auth.id != "" && uid = @request.auth.id`

#### `presence` (base)
- `user` (relation → users, unique)
- `online` (bool)
- `lastSeen` (date)

API Rules:
- List/View: `@request.auth.id != ""`
- Create/Update/Delete: `@request.auth.id != "" && user = @request.auth.id`

Index: `CREATE UNIQUE INDEX idx_presence_user ON presence (user)`

#### `typing` (base)
- `conversation` (relation → conversations, unique)
- `typers` (json)

API Rules:
- List/View/Create/Update/Delete: `@request.auth.id != ""`

Index: `CREATE UNIQUE INDEX idx_typing_conv ON typing (conversation)`

### 4. Configurar Google OAuth

- Ve a Settings > OAuth2 en el admin de PocketBase
- Agrega Google como provider con tu Client ID y Secret

### 5. Abrir la app

Abre `index.html` en tu navegador. La app se conectará automáticamente a PocketBase en `http://127.0.0.1:8090`.

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
