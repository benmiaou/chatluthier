# Le Chat Luthier

> 🎲 Your immersive sound companion for tabletop RPGs, storytelling sessions, and any experience that benefits from atmospheric audio.

Set the mood in seconds — layer ambient sounds, queue up background music, trigger instant sound effects, and keep your whole table in perfect sonic sync.

---

## Features

### 🎵 Background Music

Choose from curated mood categories — **Calm**, **Dynamic**, or **Intense** — and the player picks tracks at random. Includes a progress bar, volume control, and a **scene filter** to show only tracks relevant to your current context (e.g. "Tavern", "Forest").  
When Spotify is connected, the site music player steps aside automatically.

### 🌿 Ambiance Sounds

Layer up to dozens of environmental sounds simultaneously — rain, fire, crowd chatter, wind — each with its own volume slider. Save and recall your favourite combinations as **presets**. Filter by scene context to surface the sounds you actually need.

### 🥁 Soundboard

A grid of instant-trigger sound effects — stabs, stings, monster roars, and more. One click plays the sound for everyone in the session. Filter by scene context to keep the board focused.

### 🎧 Spotify Integration

Connect your Spotify Premium account to use your own playlists as background music. Full playback controls (play/pause/skip) and playlist selector, powered by the **PKCE OAuth** flow — no secrets stored on the server.

### 🔗 Session Sharing

Create or join a **live session** via WebSocket. Every background music change, ambiance update, and soundboard trigger is broadcast in real time to all participants. Share the invite link and your whole group hears the same thing.

### 🔐 Google Sign-In

Log in with Google to unlock personalised sound lists — enable or disable individual tracks and effects to build your own curated library without affecting other users.

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
- **Documentation**: See [LOGGING.md](LOGGING.md) for detailed usage

---

## Stack

| Layer    | Technology                                                                           |
| -------- | ------------------------------------------------------------------------------------ |
| Frontend | React 18 + TypeScript + [Mantine v7](https://mantine.dev) + [Vite](https://vite.dev) |
| Routing  | React Router v7                                                                      |
| Backend  | Express + WebSocket (Node.js)                                                        |
| Auth     | Google Identity Services (GSI)                                                       |
| Music    | Spotify Web API — PKCE OAuth                                                         |
| Styling  | Mantine dark theme + original CSS variables (BagnardSans font, maroon palette)       |

## Local Development

### Prerequisites

- Node.js ≥ 18 and npm
- Spotify Premium account (for Spotify integration)

### Setup

```bash
npm install
cp .env.example .env          # fill in your Spotify and Google client IDs
cp srv/Tokens.example srv/Tokens  # fill in your JWT secrets
npm run build
npm run dev                   # starts Express + WebSocket server
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

- **Frontend**: Vite dev server on `http://localhost:5173` (proxies `/api` → `:3000`)
- **Backend**: Express on `http://localhost:3000`, WebSocket on `:3001`

### Production

```bash
npm run build   # outputs to dist/
npm start       # serves dist/ via Express
```

## Spotify Integration

See [SPOTIFY_SETUP.md](SPOTIFY_SETUP.md) for full setup instructions.

Required `.env` keys:

```
VITE_SPOTIFY_CLIENT_ID=your_client_id
VITE_SPOTIFY_REDIRECT_URI_LOCAL=http://127.0.0.1:3000
VITE_SPOTIFY_REDIRECT_URI_PROD=https://your-domain.com
```

## Scripts

| Command             | Description                               |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Start Express + WebSocket server only     |
| `npm run dev:watch` | Start Vite HMR frontend + nodemon backend |
| `npm run build`     | Production build → `dist/`                |
| `npm start`         | Serve production build                    |

## Project Structure

```
src/
  components/       React components (audio/, auth/, layout/, modals/, session/, spotify/)
  contexts/         AuthContext, SocketContext
  hooks/            useBackgroundMusic, useAmbianceSounds, useSoundboard, useSpotify, …
  pages/            Home, Privacy, About
  services/         api.ts, spotifyService.ts
  types/            sound.ts, spotify.ts
  css/              Original CSS (imported alongside Mantine for consistent styling)
srv/                Express backend (routes, controllers, WebSocket server)
public/             Static assets (fonts, favicons)
```

## Refactoring Progress

See [PLAN.md](PLAN.md) for the detailed migration checklist and remaining tasks.
