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
cp .env.example .env   # fill in JWT secrets and any provider credentials
npm run build
npm run dev            # starts Express + WebSocket server
```

Generate JWT secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run it twice — once for `ACCESS_TOKEN_SECRET`, once for `REFRESH_TOKEN_SECRET`. The server will refuse to start if either is missing.

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
  pages/          Home
  services/       api.ts, spotifyService.ts, deezerService.ts, soundcloudService.ts
  types/          sound.ts, spotify.ts
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

## Production Deployment

This section covers deploying Le Chat Luthier on a server running **nginx** as a reverse proxy (e.g. `yourDomain.org`).

### Files to configure

| File              | What to set                                                          |
| ----------------- | -------------------------------------------------------------------- |
| `.env`            | All secrets, ports, origins, and `VITE_*` provider credentials       |
| nginx site config | Domain, SSL certificates, reverse proxy, WebSocket proxy, CSP header |

---

### 1. Environment file (`.env`)

`VITE_*` variables are **inlined at build time** — set them before running `npm run build`.

```env
NODE_ENV=production

# ── JWT secrets ───────────────────────────────────────────────────────────────
# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
ACCESS_TOKEN_SECRET=<64-char-random-hex>
REFRESH_TOKEN_SECRET=<64-char-different-random-hex>

# ── Server ────────────────────────────────────────────────────────────────────
PORT=3000

# ── CORS (comma-separated, no trailing slash) ─────────────────────────────────
CORS_ORIGINS=https://yourDomain.org

# ── CSP WebSocket origins (must match the nginx /ws/ proxy below) ─────────────
WS_ORIGINS=wss://yourDomain.org

# ── Frontend — API served from same origin, no base URL needed ────────────────
VITE_API_BASE_URL=

# ── Frontend — WebSocket (nginx proxies /ws/ → Express :3001) ─────────────────
VITE_WS_HOST=yourDomain.org
VITE_WS_PORT=443
VITE_WS_PATH=/ws/

# ── Spotify ───────────────────────────────────────────────────────────────────
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_REDIRECT_URI=https://yourDomain.org/callback

# ── Deezer ────────────────────────────────────────────────────────────────────
VITE_DEEZER_APP_ID=your_deezer_app_id
VITE_DEEZER_REDIRECT_URI=https://yourDomain.org/deezer-callback

# ── SoundCloud ────────────────────────────────────────────────────────────────
VITE_SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id
VITE_SOUNDCLOUD_REDIRECT_URI=https://yourDomain.org/soundcloud-callback
SOUNDCLOUD_CLIENT_SECRET=your_soundcloud_client_secret

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_LEVEL=warn
LOG_FILE=/var/log/chatluthier/app.log

# ── Assets Path (for dynamic sound uploads) ──────────────────────────────────
# The path where dynamically uploaded sounds are stored
# This should match the nginx alias configuration for /assets/
ASSETS_DIR=/path/to/chatluthier/dist/assets
```

---

### 2. Build and start

```bash
npm ci
npm run build          # bundles frontend into dist/ (VITE_* vars are read here)
node srv/server.js     # or use pm2 / systemd
```

---

### 3. Nginx configuration

[Helmet](https://helmetjs.github.io/) is active and sets most security headers automatically:
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection`, `Strict-Transport-Security`, and others.

**Content-Security-Policy is intentionally disabled in Helmet** to avoid duplicate headers.
Set it once in nginx as shown below.

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name yourDomain.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name yourDomain.org;

    ssl_certificate     /etc/letsencrypt/live/yourDomain.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourDomain.org/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # ── Content-Security-Policy (helmet CSP is disabled — set it here only) ───
    # Adjust connect-src if you add more external WebSocket or API origins.
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval'; script-src-elem 'self'; style-src 'self' 'unsafe-inline'; style-src-elem 'self'; img-src 'self' data: https://mirrors.creativecommons.org; font-src 'self'; connect-src 'self' wss://yourDomain.org; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-src 'self';" always;

    # ── Serve the Vite-built React SPA ────────────────────────────────────────
    root /path/to/chatluthier/dist;
    index index.html;

    # SPA fallback — React Router handles client-side navigation
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── API proxy → Express :3000 ─────────────────────────────────────────────
    location ~ ^/(api|login|logout|register|verify-login|refresh-token|check-session|
                  save-preset|load-presets|delete-sound|update-main-playlist|
                  update-user-sound|add-sound|request-sound|get-requests|close-request|
                  get-sound-order|save-sound-order|contexts|request-password-reset|
                  get-secret-question|check-pseudo-available|change-password|
                  backgroundMusic|ambianceSounds|soundboard) {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # ── WebSocket proxy → Express :3001 ───────────────────────────────────────
    # Matches VITE_WS_PATH=/ws/ set in .env
    location /ws/ {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
        proxy_read_timeout 86400s;     # keep alive for long sessions
    }

    # ── Long-lived cache for static assets ────────────────────────────────────
    location ~* \.(js|css|woff2?|ttf|otf|png|jpg|ico|svg|gif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # ── Serve all assets from dist/assets directory ─────────────────────────
    location /assets/ {
        alias /path/to/chatluthier/dist/assets/;
        try_files $uri =404;
    }
}
```

> **How the WebSocket URL is resolved at runtime:**
> With `VITE_WS_HOST=yourDomain.org`, `VITE_WS_PORT=443`, and `VITE_WS_PATH=/ws/` in `.env`, the frontend builds the URL `wss://yourDomain.org:443/ws/`. Nginx receives the upgrade request on port 443 and proxies it internally to Express on port 3001 — no extra port needs to be opened in your firewall.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Annex — External Sound WebSocket Interaction

### Scenario A — Same provider on both sides

```
User A (Spotify)                  WebSocket Server              User B (Spotify)
       │                                  │                              │
       │  plays "Run Boy Run" (Spotify)   │                              │
       │─────────────────────────────────▶│                              │
       │                                  │  backgroundMusicChange       │
       │                                  │  provider: spotify           │
       │                                  │  trackId: 4uLU6hMCjMI7e     │
       │                                  │  artist:  Woodkid            │
       │                                  │  title:   Run Boy Run        │
       │                                  │─────────────────────────────▶│
       │                                  │                              │
       │                                  │          provider: spotify available ✓
       │                                  │          plays trackId directly
       │                                  │          shows 🟢 Spotify logo
```

---

### Scenario B — Different providers (cross-provider search fallback)

```
User A (Spotify)                  WebSocket Server              User B (Deezer)
       │                                  │                              │
       │  plays "Run Boy Run" (Spotify)   │                              │
       │─────────────────────────────────▶│                              │
       │                                  │  backgroundMusicChange       │
       │                                  │  provider: spotify           │
       │                                  │  trackId: 4uLU6hMCjMI7e     │
       │                                  │  artist:  Woodkid            │
       │                                  │  title:   Run Boy Run        │
       │                                  │─────────────────────────────▶│
       │                                  │                              │
       │                                  │          provider: spotify ✗ not connected
       │                                  │          fallback: deezer ✓
       │                                  │          search "Woodkid Run Boy Run"
       │                                  │                │
       │                                  │          Deezer API returns closest match
       │                                  │                │
       │                                  │          plays result via Deezer SDK
       │                                  │          shows 🔴 Deezer logo
```

---

### Scenario C — No provider connected (external sounds disabled)

```
User A (Spotify)                  WebSocket Server         User C (no provider)
       │                                  │                              │
       │  plays "Run Boy Run" (Spotify)   │                              │
       │─────────────────────────────────▶│                              │
       │                                  │  backgroundMusicChange       │
       │                                  │  provider: spotify           │
       │                                  │─────────────────────────────▶│
       │                                  │                              │
       │                                  │        no provider available
       │                                  │        resolveAndPlayExternal returns null
       │                                  │        sound silently skipped
       │                                  │
       │                                  │   (User C can click "Disable external sounds"
       │                                  │    toggle — all clients in the session are
       │                                  │    notified and external sounds are skipped
       │                                  │    until the toggle is turned off)
```

---

### Attribution rules per provider

| Provider   | Logo shown  | Link displayed                     | Required by ToS                                |
| ---------- | ----------- | ---------------------------------- | ---------------------------------------------- |
| Spotify    | ✅ Green ♠  | Open on Spotify (permalink)        | Yes                                            |
| Deezer     | ✅ Red ◆    | Open on Deezer (permalink)         | Yes                                            |
| SoundCloud | ✅ Orange ☁ | Open on SoundCloud (permalink_url) | Yes — also requires uploader credit + backlink |

The logo shown always reflects **the provider actually used for playback** on that client, not the sender's provider.
