// src/js/spotifyService.js

export class SpotifyService {
    constructor() {
        this.accessToken = null;
        this.deviceId = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.volume = 50;
        this.playlistId = null;
        this.currentPlaylist = null;
        this.isInitialized = false;
        
        // Spotify Web Playback SDK
        this.player = null;
        this.state = null;
        
        // Callbacks
        this.onTrackChange = null;
        this.onPlaybackStateChange = null;
        this.onError = null;
    }

    // Initialize Spotify service
    async init(clientId, redirectUri) {
        this.clientId = clientId;
        this.redirectUri = redirectUri;
        
        // Check if we have a stored token
        const storedToken = localStorage.getItem('spotify_access_token');
        if (storedToken) {
            this.accessToken = storedToken;
            await this.initializePlayer();
        }
        
        this.isInitialized = true;
    }

    // Get Spotify authorization URL
    getAuthUrl() {
        const scopes = [
            'user-read-private',
            'user-read-email',
            'user-read-playback-state',
            'user-modify-playback-state',
            'user-read-currently-playing',
            'playlist-read-private',
            'playlist-read-collaborative',
            'streaming'
        ];

        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'token',
            redirect_uri: this.redirectUri,
            scope: scopes.join(' '),
            show_dialog: 'false'
        });

        return `https://accounts.spotify.com/authorize?${params.toString()}`;
    }

    // Handle authentication callback
    handleAuthCallback() {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        
        if (params.has('access_token')) {
            this.accessToken = params.get('access_token');
            localStorage.setItem('spotify_access_token', this.accessToken);
            
            // Remove hash from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            this.initializePlayer();
            return true;
        }
        return false;
    }

    // Initialize Spotify Web Playback SDK
    async initializePlayer() {
        if (!this.accessToken) return;

        try {
            // Load Spotify Web Playback SDK
            await this.loadSpotifySDK();
            
            // Create player
            this.player = new window.Spotify.Player({
                name: 'Chat Luthier Spotify Player',
                getOAuthToken: cb => { cb(this.accessToken); }
            });

            // Error handling
            this.player.addListener('initialization_error', ({ message }) => {
                console.error('Spotify initialization error:', message);
                if (this.onError) this.onError(message);
            });

            this.player.addListener('authentication_error', ({ message }) => {
                console.error('Spotify authentication error:', message);
                this.accessToken = null;
                localStorage.removeItem('spotify_access_token');
                if (this.onError) this.onError(message);
            });

            this.player.addListener('account_error', ({ message }) => {
                console.error('Spotify account error:', message);
                if (this.onError) this.onError(message);
            });

            this.player.addListener('playback_error', ({ message }) => {
                console.error('Spotify playback error:', message);
                if (this.onError) this.onError(message);
            });

            // Playback status updates
            this.player.addListener('player_state_changed', state => {
                this.state = state;
                this.isPlaying = state ? !state.paused : false;
                
                if (state && state.track_window.current_track) {
                    this.currentTrack = state.track_window.current_track;
                    if (this.onTrackChange) this.onTrackChange(this.currentTrack);
                }
                
                if (this.onPlaybackStateChange) this.onPlaybackStateChange(state);
            });

            // Ready
            this.player.addListener('ready', ({ device_id }) => {
                this.deviceId = device_id;
                console.log('Spotify player ready with device ID:', device_id);
            });

            // Connect to the player
            await this.player.connect();
            
        } catch (error) {
            console.error('Error initializing Spotify player:', error);
            if (this.onError) this.onError(error.message);
        }
    }

    // Load Spotify Web Playback SDK
    loadSpotifySDK() {
        return new Promise((resolve, reject) => {
            if (window.Spotify) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            
            script.onload = () => {
                window.onSpotifyWebPlaybackSDKReady = () => {
                    resolve();
                };
            };
            
            script.onerror = () => reject(new Error('Failed to load Spotify SDK'));
            document.head.appendChild(script);
        });
    }

    // Search for tracks by mood/context
    async searchTracks(query, type = 'track', limit = 20) {
        if (!this.accessToken) return [];

        try {
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) throw new Error('Search request failed');
            
            const data = await response.json();
            return data.tracks ? data.tracks.items : [];
        } catch (error) {
            console.error('Error searching Spotify tracks:', error);
            return [];
        }
    }

    // Get user's playlists
    async getUserPlaylists() {
        if (!this.accessToken) return [];

        try {
            const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch playlists');
            
            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error('Error fetching user playlists:', error);
            return [];
        }
    }

    // Play a specific track
    async playTrack(trackUri) {
        if (!this.accessToken || !this.deviceId) return false;

        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uris: [trackUri]
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Error playing track:', error);
            return false;
        }
    }

    // Play a playlist
    async playPlaylist(playlistUri, startIndex = 0) {
        if (!this.accessToken || !this.deviceId) return false;

        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    context_uri: playlistUri,
                    offset: { position: startIndex }
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Error playing playlist:', error);
            return false;
        }
    }

    // Resume playback
    async resume() {
        if (!this.accessToken || !this.deviceId) return false;

        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error resuming playback:', error);
            return false;
        }
    }

    // Pause playback
    async pause() {
        if (!this.accessToken || !this.deviceId) return false;

        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error pausing playback:', error);
            return false;
        }
    }

    // Skip to next track
    async next() {
        if (!this.accessToken || !this.deviceId) return false;

        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${this.deviceId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error skipping to next track:', error);
            return false;
        }
    }

    // Skip to previous track
    async previous() {
        if (!this.accessToken || !this.deviceId) return false;

        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${this.deviceId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error skipping to previous track:', error);
            return false;
        }
    }

    // Set volume
    async setVolume(volume) {
        if (!this.accessToken || !this.deviceId) return false;

        this.volume = Math.max(0, Math.min(100, volume));
        const volumePercent = this.volume / 100;

        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(this.volume)}&device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error setting volume:', error);
            return false;
        }
    }

    // Get current playback state
    async getCurrentPlayback() {
        if (!this.accessToken) return null;

        try {
            const response = await fetch('https://api.spotify.com/v1/me/player', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) return null;
            
            return await response.json();
        } catch (error) {
            console.error('Error getting current playback:', error);
            return null;
        }
    }

    // Get recommended tracks based on mood
    async getRecommendedTracks(mood, limit = 20) {
        if (!this.accessToken) return [];

        // Map moods to Spotify seed parameters
        const moodSeeds = {
            'calm': ['acoustic', 'instrumental', 'chill'],
            'dynamic': ['energy', 'dance', 'upbeat'],
            'intense': ['aggressive', 'heavy', 'epic'],
            'all': ['pop', 'rock', 'electronic']
        };

        const seeds = moodSeeds[mood] || moodSeeds['all'];
        
        try {
            const params = new URLSearchParams({
                seed_genres: seeds.slice(0, 5).join(','),
                limit: limit.toString(),
                target_energy: mood === 'calm' ? '0.3' : mood === 'intense' ? '0.8' : '0.6',
                target_valence: mood === 'calm' ? '0.7' : mood === 'intense' ? '0.4' : '0.6'
            });

            const response = await fetch(`https://api.spotify.com/v1/recommendations?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) throw new Error('Failed to get recommendations');
            
            const data = await response.json();
            return data.tracks || [];
        } catch (error) {
            console.error('Error getting recommended tracks:', error);
            return [];
        }
    }

    // Disconnect and cleanup
    async disconnect() {
        if (this.player) {
            await this.player.disconnect();
        }
        this.accessToken = null;
        this.deviceId = null;
        this.currentTrack = null;
        this.isPlaying = false;
        localStorage.removeItem('spotify_access_token');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.accessToken;
    }

    // Check if player is ready
    isPlayerReady() {
        return !!this.deviceId;
    }
}

// Export singleton instance
export const spotifyService = new SpotifyService();
