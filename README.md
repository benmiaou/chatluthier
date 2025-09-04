# Chat Luthier

Le Chat Luthier is your immersive sound companion for enhancing role-playing games, storytelling sessions, or any experience that benefits from atmospheric audio.

## Features

- **Background Music**: Mood-based music selection (calm, dynamic, intense)
- **Ambiance Sounds**: Environmental audio for immersive experiences
- **Soundboard**: Quick access to sound effects
- **Spotify Integration**: Connect your Spotify account for unlimited background music
- **Session Management**: Share audio experiences with friends
- **Google Authentication**: Secure user accounts and preferences

## Local Development

### Prerequisites
- Node.js and npm
- Spotify Premium account (for Spotify integration)

### Setup
```bash
npm install
npm run build
npm run dev
```

### Development with Hot Reloading
For development with automatic code refresh:
```bash
npm run dev:full
```

This will start:
- **Frontend**: Webpack dev server on `http://localhost:3000` with hot reloading
- **Backend**: Express server on `http://localhost:3001`

### Production
For production build:
```bash
npm run build
npm start
```

## Spotify Integration

Chat Luthier now supports Spotify integration for background music! Connect your Spotify account to access:

- Mood-based music recommendations
- Your personal playlists
- Seamless playback controls
- Volume management

**Setup:** 
1. See [SPOTIFY_SETUP.md](SPOTIFY_SETUP.md) for detailed configuration instructions
2. Copy `src/js/spotifyConfig.example.js` to `src/js/spotifyConfig.js`
3. Replace the Client ID with your actual Spotify Client ID from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

## Scripts

- `npm run build` - Build the project for production
- `npm run dev` - Start the frontend development server with hot reloading
- `npm run dev:full` - Start both frontend and backend for development
- `npm run local` - Start the full development environment
- `npm run watch` - Watch for changes and rebuild
- `npm start` - Start the production server



