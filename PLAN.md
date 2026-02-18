# Le Chat Luthier — Refactoring Plan

Migration from vanilla JS + Webpack to **React 18 + TypeScript + Mantine v7 + Vite + React Router v7**.

## Status Legend
- ✅ Done
- ⚠️ Partial / needs polish
- ❌ Not started
- 🚫 Discarded

---

## Phase 1 — Toolchain ✅
- [x] Replace Webpack with Vite
- [x] Add TypeScript (`tsconfig.json`)
- [x] Install React 18 + React Router v7
- [x] Install Mantine v7 + PostCSS config
- [x] Set up `.env` / `.env.example`
- [x] Configure `vite.config.ts` (proxy, chunking)

## Phase 2 — App Shell ✅
- [x] `src/main.tsx` entry point
- [x] `src/App.tsx` with routes `/`, `/privacy`, `/about`
- [x] `AppLayout`, `Header`, `Footer` with Mantine AppShell
- [x] `src/theme.ts` — maroon primary, dark palette, BagnardSans font
- [x] Import original `src/css/styles.css` for legacy CSS variables

## Phase 3 — Hooks & Services ✅
- [x] `useAudioPlayer` — AudioPlayer class + precacheAudio
- [x] `useBackgroundMusic` — categories, progress, volume, socket sync
- [x] `useAmbianceSounds` — ambient bars, volume, presets, socket sync
- [x] `useSoundboard` — load/play sounds, volume
- [x] `useSpotify` — PKCE OAuth, playback controls, playlist fetch
- [x] `src/services/api.ts` — apiFetch / apiUpload helpers
- [x] `src/services/spotifyService.ts` — all Spotify API calls

## Phase 4 — Shared Contexts ✅
- [x] `AuthContext` — single Google GSI init, shared auth state
- [x] `SocketContext` — single WebSocket connection, pub/sub, auto-reconnect

## Phase 5 — Components ✅
- [x] `BackgroundMusic` — category buttons, progress, volume, context filter, socket sync
- [x] `AmbianceSounds` — sound bars, reset, socket sync
- [x] `SoundBar` — individual ambient volume slider
- [x] `Soundboard` — sound buttons grid, global volume, socket sync
- [x] `SpotifyPlayer` — connect/disconnect, playback controls, playlists
- [x] `SessionManager` — create/join/leave session, copy invite
- [x] `GoogleLoginButton` — GSI button or avatar menu when signed in
- [x] `CreditsModal` — all credits grouped by category
- [x] `RequestSoundModal` — user submits sound request
- [x] `AddSoundModal` — admin uploads new sound
- [x] `EditSoundsModal` — toggle enable/disable per sound
- [x] `ReviewRequestsModal` — admin views and closes pending requests

## Phase 6 — Pages ✅
- [x] `Home.tsx` — all audio components + modal trigger buttons
- [x] `Privacy.tsx`
- [x] `About.tsx`

## Phase 7 — Backend & Cleanup ✅
- [x] SPA catch-all added to `srv/app.js`
- [x] Public assets (`fonts/`, `images/`, `site.webmanifest`) copied to `public/`
- [x] Old `src/js/` (25 files) deleted
- [x] Old HTML pages deleted
- [x] `webpack.config.js` deleted

## Phase 8 — API Endpoint Fixes ✅
- [x] `useBackgroundMusic`: `/backgroundSounds` → `/backgroundMusic`
- [x] `AuthContext`: `/api/auth/google` → `/verify-login`
- [x] `RequestSoundModal`: `/api/requests` → `/request-sound`
- [x] `AddSoundModal`: `/api/sounds/upload` → `/add-sound`
- [x] `EditSoundsModal`: `/api/sounds/admin|user` → `/update-main-playlist` / `/update-user-sound`
- [x] `useAmbianceSounds`: `/api/presets` → `/load-presets` (GET) / `/save-preset` (POST)

---

## Remaining Work

### ✅ 15 — Context selector in AmbianceSounds & Soundboard
Both hooks expose `context`/`setContext` + filtered `sounds`/`bars` (with `allSounds`/`allBars` for building the options list). Both components render a `Select` dropdown that only appears when sounds have context tags.

### ✅ 16 — Admin inline UI per sound
Done. `isAdmin` prop added to `BackgroundMusic`, `AmbianceSounds`, `Soundboard`. When admin:
- **AmbianceSounds**: trash icon on every `SoundBar` row → `POST /delete-sound` + reload
- **Soundboard**: trash icon next to every sound button → `POST /delete-sound` + reload
- **BackgroundMusic**: trash icon next to the currently playing track → `POST /delete-sound` + reload
`Home.tsx` passes `isAdmin` from `AuthContext` to all three components.

### ✅ 17 — Music source toggle (Site vs Spotify)
`SpotifyPlayer` accepts `onAuthChange?: (connected: boolean) => void` called on every auth change.
`Home.tsx` tracks `spotifyConnected` and wraps `<BackgroundMusic>` in `<Collapse in={!spotifyConnected}>` — smoothly collapses when Spotify connects, expands on disconnect.

### 🚫 12 — localDirectory.js
File System Access API for browsing local audio folders — **intentionally not migrated**.

---

## Build Status
```
npm run build  → ✅ clean, 0 errors, 0 warnings
tsc --noEmit   → ✅ 0 errors
```

## API Fixes (post-review)
All backend API mismatches were corrected after a full review against the backend controllers:
- `AuthContext`: `{token}` → `{idToken}`, decode Google JWT client-side for name/picture
- Delete sound: `{category}` → `{soundType}` with correct enum values (`backgroundMusic`, `ambianceSounds`, `soundboard`)
- `savePreset`: `{userId,presets}` → `{userId,presetName,presetData}` (one preset at a time)
- `loadPresets`: now extracts `data.presets` (backend wraps in `{presets:{}}`)
- `EditSoundsModal`: completely rewritten — loads sounds from API on open, category selector, correct per-sound and full-array endpoints
- `RequestSoundModal`: `{userId,soundName,description}` → `{category,file,contexts:[]}` with category selector
- `ReviewRequestsModal`: `{id}` → `{requestId:timestamp}` for close-request
- `AddSoundModal`: `name` → `display_name`, correct category enum values, adds `contexts:[]`
