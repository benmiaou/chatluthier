// src/js/spotifyConfig.example.js
// Copy this file to spotifyConfig.js and replace with your actual values

export const spotifyConfig = {
    // Spotify API credentials
    // Get your Client ID from: https://developer.spotify.com/dashboard
    clientId: 'abc123def456ghi789jkl012mno345pqr678stu901', // Replace with your actual Spotify Client ID
    redirectUri: window.location.origin, // Current domain as redirect URI
    
    // Default playlists for different moods (optional)
    defaultPlaylists: {
        calm: 'spotify:playlist:37i9dQZF1DX3Ogo9pFvBkY', // Lo-Fi Beats
        dynamic: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits
        intense: 'spotify:playlist:37i9dQZF1DX5Vy6DFOcx00', // Rock Classics
        all: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'   // Today's Top Hits
    },
    
    // Search queries for different moods
    moodQueries: {
        calm: 'acoustic instrumental chill ambient',
        dynamic: 'upbeat energetic dance pop',
        intense: 'epic orchestral dramatic action',
        all: 'popular trending hits'
    },
    
    // Volume settings
    defaultVolume: 50,
    maxVolume: 100,
    minVolume: 0,
    
    // Playback settings
    autoPlay: true,
    shuffle: true,
    repeat: 'context', // 'off', 'track', 'context'
    
    // UI settings
    showNowPlaying: true,
    showPlaylistSelector: true,
    showMoodButtons: true,
    showVolumeControl: true,
    
    // Error handling
    maxRetries: 3,
    retryDelay: 1000,
    
    // Cache settings
    cachePlaylists: true,
    cacheTracks: true,
    cacheExpiry: 3600000, // 1 hour in milliseconds
};

// Helper functions...
export function getConfig(key, fallback = null) {
    return spotifyConfig[key] !== undefined ? spotifyConfig[key] : fallback;
}

export function setConfig(key, value) {
    if (spotifyConfig.hasOwnProperty(key)) {
        spotifyConfig[key] = value;
        try {
            localStorage.setItem('spotify_config', JSON.stringify(spotifyConfig));
        } catch (e) {
            console.warn('Could not save Spotify config to localStorage:', e);
        }
    }
}

export function loadConfig() {
    try {
        const savedConfig = localStorage.getItem('spotify_config');
        if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            Object.assign(spotifyConfig, parsed);
        }
    } catch (e) {
        console.warn('Could not load Spotify config from localStorage:', e);
    }
}

// Initialize config
loadConfig();
