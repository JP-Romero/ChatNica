# 🔥 Firebase → 🗄️ PocketBase Migration Guide

## Prerequisites

1. **PocketBase running** en `http://127.0.0.1:8090`
2. **Colección `users` creada** como auth collection en PocketBase
3. **Firebase Admin SDK key** descargada

## Step 1: Download Firebase Service Account Key

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto `chatnica-8648d`
3. ⚙️ Settings → **Service Accounts**
4. Click **"Generate new private key"**
5. Guarda el archivo JSON como `serviceAccountKey.json` en esta carpeta

## Step 2: Install dependencies

```bash
cd migration
npm install
```

## Step 3: Configure (optional)

Si usas credenciales diferentes, edita `firebase-to-pb.mjs` o crea un `.env`:

```bash
cp .env.example .env
# edita .env con tus credenciales
```

## Step 4: Run migration

```bash
npm run migrate
```

O directamente:

```bash
node firebase-to-pb.mjs
```

## Output

El script mostrará progreso en tiempo real:

```
▸ Inicializando Firebase Admin SDK...
[OK] Firebase conectado
▸ Conectando a PocketBase (http://127.0.0.1:8090)...
[OK] PocketBase conectado como admin
▸ Creando colecciones en PocketBase...
[OK] Colección "contacts" creada
[OK] Colección "conversations" creada
...
▸ Migrando usuarios...
[OK] Usuarios: 15 migrados, 0 omitidos
...
▸ MIGRACIÓN COMPLETADA en 12.3s
```

## What gets migrated

| Firebase | PocketBase | Notes |
|---|---|---|
| `users` collection | `users` auth collection | Passwords se resetean a temporal |
| `contacts` | `contacts` | IDs preservados |
| `conversations` | `conversations` | IDs preservados |
| `messages` | `messages` | IDs preservados |
| `posts` | `posts` | IDs preservados |
| `stories` | `stories` | IDs preservados |
| `presence` | `presence` | Data only |
| `typing` | `typing` | Data only |

## Important notes

1. **User passwords**: Los usuarios que usaban email/password tendrán contraseña temporal `temp_password_change_me`. Deben cambiarla al hacer login.

2. **Google OAuth users**: Deben re-autenticarse con Google en PocketBase. Se creará un nuevo usuario vinculado.

3. **Storage files**: Las URLs de Firebase Storage seguirán funcionando mientras el proyecto Firebase esté activo. Si quieres migrar archivos, necesitas un script adicional.

4. **Timestamps**: Todos los timestamps de Firebase se convierten a ISO 8601 para PocketBase.

5. **Relations**: Las relaciones entre documentos se preservan usando los mismos IDs.

## Troubleshooting

### "No se encontró el archivo de credencial"
Descarga el service account key desde Firebase Console y guárdalo como `serviceAccountKey.json`

### "No se pudo conectar a PocketBase"
- Verifica que PocketBase esté corriendo: `cd pocketbase && pocketbase.exe serve`
- Verifica las credenciales de admin en `.env`

### "Colección users no encontrada"
Crea la colección `users` como **auth collection** en el admin de PocketBase antes de correr la migración.

### Error de permisos en reglas API
Las reglas se configuran automáticamente durante la migración. Si hay errores, revísalas en el admin UI.
