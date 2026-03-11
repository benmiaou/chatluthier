# Le Chat Luthier

> 🎲 Your immersive sound companion for tabletop RPGs, storytelling sessions, and any experience that benefits from atmospheric audio.

Set the mood in seconds — layer ambient sounds, queue up background music, trigger instant sound effects, and keep your whole table in perfect sonic sync.

---

## Features

### 🎵 Background Music

Choose from curated mood categories — **Calm**, **Dynamic**, or **Intense** — and the player picks tracks at random. Includes a progress bar, volume control, and a **scene filter** to show only tracks relevant to your current context (e.g. "Tavern", "Forest").  
When Spotify is connected, the site music player steps aside automatically.

### 🌍 External Sound Providers

Add tracks from **Spotify**, **Deezer**, or **SoundCloud** directly to your background music playlist. External sounds blend seamlessly with local tracks and sync across the entire session via WebSocket.

- **Search** any provider's catalogue from within the app
- **Preview** 30-second clips before adding
- **Assign intensity + scene context** (e.g. `medium / combat`) when adding a track
- **Persist** external sounds per user in the database — they reload automatically on next visit
- **Graceful fallback**: a one-click toggle disables all external sounds for sessions where not every participant has a provider connected

Each provider uses a secure OAuth flow:

| Provider   | Auth method           | Notes                          |
| ---------- | --------------------- | ------------------------------ |
| Spotify    | PKCE (existing)       | Requires Spotify Premium       |
| Deezer     | OAuth2 implicit grant | Free accounts supported        |
| SoundCloud | OAuth2 PKCE           | Requires SoundCloud API access |

### 🌿 Ambiance Sounds

Layer up to dozens of environmental sounds simultaneously — rain, fire, crowd chatter, wind — each with its own volume slider. Save and recall your favourite combinations as **presets**. Filter by scene context to surface the sounds you actually need.

### 🥁 Soundboard

A grid of instant-trigger sound effects — stabs, stings, monster roars, and more. One click plays the sound for everyone in the session. Filter by scene context to keep the board focused.

### 🎧 Spotify Integration

Connect your Spotify Premium account to use your own playlists as background music. Full playback controls (play/pause/skip) and playlist selector, powered by the **PKCE OAuth** flow — no secrets stored on the server.

### 🔗 Session Sharing

Create or join a **live session** via WebSocket. Every background music change, ambiance update, and soundboard trigger is broadcast in real time to all participants. Share the invite link and your whole group hears the same thing.

### 🛠 Admin Panel

Admins get extra controls inline and in the toolbar:

- **Inline delete** on every sound in Background Music, Ambiance, and Soundboard
- **Add Sound** — upload new audio files with metadata
- **Edit Sounds** — toggle enable/disable per sound, site-wide
- **Review Requests** — see and close pending sound requests from users

### 💬 Sound Requests

Any signed-in user can submit a request for a new sound. Admins review and close requests from the panel.

### 📝 Development Logging

Developers can enable file-based logging for both client and server during development:

- **Console + File Logging**: `npm run dev:watch:logs`
- **Console Only**: `npm run dev:watch` (default)
- **Log Location**: `logs/` directory with daily rotating files

---

## Stack

| Layer        | Technology                                                                           |
| ------------ | ------------------------------------------------------------------------------------ |
| Frontend     | React 18 + TypeScript + [Mantine v7](https://mantine.dev) + [Vite](https://vite.dev) |
| Routing      | React Router v7                                                                      |
| Backend      | Express + WebSocket (Node.js)                                                        |
| Database     | SQLite (via `sqlite3`)                                                               |
| Music        | Spotify / Deezer / SoundCloud — PKCE & implicit grant OAuth                          |
| Styling      | Mantine dark theme + original CSS variables (BagnardSans font, maroon palette)       |
| Testing      | Jest (unit + frontend service tests) + plain Node integration tests                  |
| Code quality | ESLint + Prettier + Husky pre-commit hook                                            |

---

## Local Development

### Prerequisites

- Node.js ≥ 18 and npm
- Spotify Premium account (optional — for Spotify integration)

### Setup

```bash
npm install
cp srv/Tokens.example srv/Tokens  # fill in your JWT secrets
npm run build
npm run dev                        # starts Express + WebSocket server
```

The `srv/Tokens` file holds JWT signing secrets (gitignored). Generate strong random strings for production:

```json
{
  "ACCESS_TOKEN_SECRET": "a-long-random-string",
  "REFRESH_TOKEN_SECRET": "another-long-random-string"
}
```

### Development with hot reload

```bash
npm run dev:watch      # Vite (HMR) + nodemon backend in parallel
```

This starts:

- **Frontend**: Vite dev server on `http://localhost:5173` (proxies API calls → `:3000`)
- **Backend**: Express on `http://localhost:3000`, WebSocket on `:3001`

### Production

```bash
npm run build   # outputs to dist/
npm start       # serves dist/ via Express
```

---

## Environment Variables

Create a `.env` file at the project root. All `VITE_*` variables are bundled into the frontend; the others are server-only.

```env
# ── Spotify ─────────────────────────────────────────────
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_REDIRECT_URI_LOCAL=http://127.0.0.1:3000
VITE_SPOTIFY_REDIRECT_URI_PROD=https://your-domain.com

# ── Deezer ──────────────────────────────────────────────
VITE_DEEZER_APP_ID=your_deezer_app_id

# ── SoundCloud ──────────────────────────────────────────
VITE_SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id
VITE_SOUNDCLOUD_REDIRECT_URI_LOCAL=http://localhost:5173/sc-callback
VITE_SOUNDCLOUD_REDIRECT_URI_PROD=https://your-domain.com/sc-callback

# Server-side only (token exchange proxy)
SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id
SOUNDCLOUD_CLIENT_SECRET=your_soundcloud_client_secret
```

> **Note — SoundCloud:** Public API registration was deprecated in 2021. You need to request API access directly from SoundCloud. Deezer and Spotify registration is straightforward via their developer portals.

---

## Scripts

| Command                      | Description                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| `npm run dev`                | Start Express + WebSocket server only                        |
| `npm run dev:watch`          | Start Vite HMR frontend + nodemon backend                    |
| `npm run build`              | Production build → `dist/`                                   |
| `npm start`                  | Serve production build                                       |
| `npm test`                   | Run all plain Node integration tests                         |
| `npm run test:jest`          | Run full Jest suite (backend unit + frontend)                |
| `npm run test:jest:unit`     | Jest backend unit tests only (no server)                     |
| `npm run test:jest:frontend` | Jest frontend service tests only                             |
| `npm run test:external-api`  | External sounds API integration tests (needs running server) |
| `npm run lint`               | ESLint check                                                 |
| `npm run lint:fix`           | ESLint auto-fix                                              |
| `npm run check-format`       | Prettier check                                               |
| `npm run format`             | Prettier auto-fix                                            |

---

## Project Structure

```
src/
  components/
    audio/        BackgroundMusic, AmbianceSounds, Soundboard, ExternalSound* components
    auth/         AuthButtons
    layout/       AppLayout, Header, Footer
    modals/       EditSoundsModal, ServerEditSoundsModal, AddSoundModal, …
    session/      SessionManager
    spotify/      SpotifyPlayer
  contexts/       AuthContext, SocketContext (WebSocket message types)
  hooks/          useBackgroundMusic, useAmbianceSounds, useSoundboard,
                  useSpotify, useDeezer, useSoundCloud, useExternalSounds, …
  pages/          Home, Privacy, About
  services/       api.ts, spotifyService.ts, deezerService.ts, soundcloudService.ts
  types/          sound.ts, spotify.ts
  css/            Original CSS (imported alongside Mantine)
srv/
  controllers/    authController, soundController, externalSoundsController,
                  deezerController, soundcloudController, requestController
  database/       db.js (SQLite singleton), schema.sql, migrations
  routes/         authRoutes, soundRoutes, externalSoundsRoutes, requestRoutes
  sockets/        socketServer.js (WebSocket broadcast)
tests/
  jest/           Jest suite — unit/ (backend mocked) + frontend/ (service tests)
  test_*.js       Plain Node integration tests (require running server)
public/           Static assets (fonts, favicons)
```

---

## Testing

The project has two complementary test layers:

### Jest (unit & service tests) — no server required

```bash
npm run test:jest
```

- **Backend unit tests** (`tests/jest/unit/`): all four external sounds controller handlers tested in isolation with a fully mocked DB (`jest.mock`). Covers validation, DB interaction contracts, response shaping, 409 duplicate detection, and error paths.
- **Frontend service tests** (`tests/jest/frontend/`): pure function and fetch-mocked tests for `deezerService`, `soundcloudService`, and `spotifyService` — token helpers, PKCE auth URL generation, search, token exchange/refresh.

### Integration tests — requires `npm run dev`

```bash
npm run test:external-api   # external sounds CRUD + /backgroundMusic merge
npm test                    # all plain Node tests (auth, cookies, JWT, WebSocket, …)
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
