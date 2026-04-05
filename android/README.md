# ChatNica Android App

A native Android client for ChatNica — a real-time messaging and social network app, powered by [PocketBase](https://pocketbase.io).

## Features

- 🔐 Email/password authentication
- 💬 Direct messages and group chats (real-time via PocketBase SSE)
- 👥 Contacts system (send/accept/reject requests)
- 📰 Social feed (posts with likes and comments)
- 📖 Stories (24-hour ephemeral content)
- 👤 User profiles (photo, name, bio, city)
- 🌐 Configurable PocketBase backend URL

## Tech Stack

| Layer | Library |
|-------|---------|
| UI | Jetpack Compose + Material3 |
| Navigation | Navigation Compose |
| Networking | OkHttp 4 + okhttp-sse |
| Serialization | kotlinx.serialization |
| Persistence | DataStore Preferences |
| Image loading | Coil |
| Async | Kotlin Coroutines + Flow |

## Requirements

- Android Studio Hedgehog (2023.1) or newer
- JDK 11+
- Android emulator or physical device (API 26+)
- A running [PocketBase](https://pocketbase.io/docs/) instance

## Getting Started

### 1. Set up PocketBase

Download and run PocketBase on your development machine:

```bash
./pocketbase serve
# Starts on http://127.0.0.1:8090 by default
```

Create the following collections in the PocketBase Admin UI (`http://127.0.0.1:8090/_/`):
- `users` (built-in auth collection) — add fields: `name`, `bio`, `city`, `avatar`
- `conversations` — fields: `name` (text), `isGroup` (bool), `members` (relation → users, multiple)
- `messages` — fields: `conversation` (relation), `sender` (relation → users), `body` (text), `type` (text)
- `contacts` — fields: `requester` (relation → users), `recipient` (relation → users), `status` (text)
- `posts` — fields: `author` (relation → users), `body` (text), `image` (file), `likes` (relation → users, multiple)
- `comments` — fields: `post` (relation → posts), `author` (relation → users), `body` (text)
- `stories` — fields: `author` (relation → users), `type` (text), `file` (file), `text` (text), `expires` (date)

### 2. Build the Android app

```bash
cd android
./gradlew assembleDebug
```

### 3. Install on emulator/device

```bash
./gradlew installDebug
```

Or open the `android/` directory in Android Studio and press **Run ▶**.

## Connecting to PocketBase

### Android Emulator
The emulator routes `10.0.2.2` to your host machine's `localhost`. The default PocketBase URL is already set to `http://10.0.2.2:8090`.

### Physical Device
Change the PocketBase URL in the app:
1. Open the app → Settings (gear icon in Chats screen)
2. Update the URL to your machine's local IP (e.g. `http://192.168.1.X:8090`)
3. Tap **Save**

## Project Structure

```
android/
├── app/src/main/
│   ├── kotlin/com/chatnica/app/
│   │   ├── ChatNicaApplication.kt     # App entry point
│   │   ├── MainActivity.kt            # Single activity
│   │   ├── data/
│   │   │   ├── api/
│   │   │   │   ├── ApiClient.kt       # OkHttp wrapper
│   │   │   │   └── PocketBaseService.kt # REST + SSE calls
│   │   │   ├── local/
│   │   │   │   └── PreferencesManager.kt # DataStore
│   │   │   ├── models/
│   │   │   │   └── Models.kt          # Data classes
│   │   │   └── repository/            # Business logic
│   │   ├── navigation/
│   │   │   └── NavGraph.kt            # Navigation graph
│   │   └── ui/
│   │       ├── auth/                  # Login/Register
│   │       ├── chat/                  # Chat screen
│   │       ├── contacts/              # Contacts screen
│   │       ├── conversations/         # Conversations list
│   │       ├── feed/                  # Social feed
│   │       ├── navigation/            # Bottom nav bar
│   │       ├── profile/               # User profile
│   │       ├── settings/              # App settings
│   │       └── theme/                 # Material3 theme
│   ├── AndroidManifest.xml
│   └── res/
│       ├── values/strings.xml
│       ├── values/themes.xml
│       └── xml/network_security_config.xml
├── build.gradle.kts
├── settings.gradle.kts
└── gradle/libs.versions.toml
```

## License

MIT — see the root [LICENSE.md](../LICENSE.md).
