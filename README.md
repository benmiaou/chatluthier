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

Visit `http://localhost:3000/`

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

- `npm run build` - Build the project with webpack
- `npm run dev` - Start the development server
- `npm run local` - Start the local server
- `npm run watch` - Watch for changes and rebuild



