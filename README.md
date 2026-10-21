# Le Chat Luthier

> Your immersive sound companion for tabletop RPGs, storytelling sessions, and any experience that benefits from atmospheric audio.

Set the mood in seconds — layer ambient sounds, queue up background music, trigger instant sound effects, and keep your whole table in perfect sonic sync.

---

## Features

### Background Music

Choose from curated mood categories — **Calm**, **Dynamic**, or **Intense** — and the player picks tracks at random. Includes a progress bar, volume control, and a **scene filter** to show only tracks relevant to your current context (e.g. "Tavern", "Forest").

### Ambiance Sounds

Layer up to dozens of environmental sounds simultaneously — rain, fire, crowd chatter, wind — each with its own volume slider. Save and recall your favourite combinations as **presets**. Filter by scene context to surface the sounds you actually need.

### Soundboard

A grid of instant-trigger sound effects — stabs, stings, monster roars, and more. One click plays the sound for everyone in the session. Filter by scene context to keep the board focused.

### Session Sharing

Create or join a **live session** via WebSocket. Every background music change, ambiance update, and soundboard trigger is broadcast in real time to all participants. Share the invite link and your whole group hears the same thing.

### Admin Panel

Admins get extra controls inline and in the toolbar:

- **Inline delete** on every sound in Background Music, Ambiance, and Soundboard
- **Add Sound** — upload new audio files with metadata
- **Edit Sounds** — toggle enable/disable per sound, site-wide
- **Review Requests** — see and close pending sound requests from users

### Sound Requests

Any signed-in user can submit a request for a new sound. Admins review and close requests from the panel.

---

## Stack

| Layer        | Technology                                                                           |
| ------------ | ------------------------------------------------------------------------------------ |
| Frontend     | React 19 + TypeScript + [Mantine v8](https://mantine.dev) + [Vite](https://vite.dev) |
| Routing      | React Router v7                                                                      |
| Backend      | Express + WebSocket (Node.js)                                                        |
| Database     | SQLite (via `sqlite3`)                                                               |
| Music        | Local audio files (MP3, etc.)                                                        |
| Styling      | Mantine dark theme + original CSS variables (BagnardSans font, maroon palette)       |
| Testing      | Jest (unit + frontend service tests) + plain Node integration tests                  |
| Code quality | ESLint + Prettier + Husky pre-commit hook                                            |
| UI Utilities | Drag-and-drop (hello-pangea/dnd), Rich notifications                                 |

---

## Project Structure

```
src/
  components/
    audio/        BackgroundMusic, AmbianceSounds, Soundboard
    auth/         AuthButtons
    layout/       AppLayout, Header, Footer
    modals/       EditSoundsModal, ServerEditSoundsModal, AddSoundModal, …
    session/      SessionManager
  contexts/       AuthContext, SocketContext (WebSocket message types)
  hooks/          useBackgroundMusic, useAmbianceSounds, useSoundboard, …
  pages/          Home
  services/       api.ts
  types/          sound.ts
tests/
  jest/           Jest suite — unit/ (backend mocked) + frontend/ (service tests)
  test_*.js       Plain Node integration tests
public/           Static assets (fonts, favicons)
```

---

## Testing

The project has two complementary test layers:

### Jest (unit & service tests) — no server required

```bash
npm run test:jest
```

- **Backend unit tests** (`tests/jest/unit/`): Covers validation, DB interaction contracts, response shaping, and error paths.
- **Frontend service tests** (`tests/jest/frontend/`): pure function tests.

### Integration tests — requires `npm run dev`

```bash
npm test                    # all plain Node tests (auth, cookies, JWT, WebSocket, …)
```

---

## Scripts

| Command                      | Description                                   |
| ---------------------------- | --------------------------------------------- |
| `npm run dev`                | Start Express + WebSocket server only         |
| `npm run dev:watch`          | Start Vite HMR frontend + nodemon backend     |
| `npm run build`              | Production build → `dist/`                    |
| `npm start`                  | Serve production build                        |
| `npm test`                   | Run all plain Node integration tests          |
| `npm run test:jest`          | Run full Jest suite (backend unit + frontend) |
| `npm run test:jest:unit`     | Jest backend unit tests only (no server)      |
| `npm run test:jest:frontend` | Jest frontend service tests only              |
| `npm run lint`               | ESLint check                                  |
| `npm run lint:fix`           | ESLint auto-fix                               |
| `npm run check-format`       | Prettier check                                |
| `npm run format`             | Prettier auto-fix                             |

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
