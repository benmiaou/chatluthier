// src/js/spotifyService.js

import { spotifyAuthManager } from './spotifyAuthManager.js';

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
        
        // Listen to auth state changes
        spotifyAuthManager.addListener((authState) => {
            this.handleAuthStateChange(authState);
        });
    }

    // Handle auth state changes
    handleAuthStateChange(authState) {
        console.log('SpotifyService: Auth state changed:', authState);
        
        if (authState.state === 'connected') {
            // Get token from auth manager
            const token = localStorage.getItem('spotify_access_token');
            if (token && token !== this.accessToken) {
                this.accessToken = token;
                this.initializePlayer();
            }
        } else if (authState.state === 'disconnected' || authState.state === 'error') {
            this.accessToken = null;
            this.deviceId = null;
            if (this.player) {
                this.player.disconnect();
                this.player = null;
            }
        }
    }

    // Initialize Spotify service
    async init(clientId, redirectUri) {
        console.log('Initializing Spotify service with clientId:', clientId, 'redirectUri:', redirectUri);
        
        this.clientId = clientId;
        this.redirectUri = redirectUri;
        
        // Initialize auth manager
        await spotifyAuthManager.init();
        
        // Check if we have a stored token
        const storedToken = localStorage.getItem('spotify_access_token');
        if (storedToken) {
            console.log('Found stored token, length:', storedToken.length);
            this.accessToken = storedToken;
            
            // Try to initialize player with stored token
            try {
                await this.initializePlayer();
                console.log('Player initialized with stored token');
            } catch (error) {
                console.error('Failed to initialize player with stored token:', error);
                // Token might be expired, remove it
                spotifyAuthManager.clearAuth();
            }
        } else {
            console.log('No stored token found');
        }
        
        this.isInitialized = true;
        console.log('Spotify service initialization complete');
    }

    // Check if we're in the middle of an auth flow
    isInAuthFlow() {
        const existingState = localStorage.getItem('spotify_auth_state');
        const existingCodeVerifier = localStorage.getItem('spotify_code_verifier');
        return !!(existingState && existingCodeVerifier);
    }

    // Get Spotify authorization URL using PKCE flow
    async getAuthUrl() {
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

        // Check if we already have a pending auth flow
        const existingState = localStorage.getItem('spotify_auth_state');
        const existingCodeVerifier = localStorage.getItem('spotify_code_verifier');
        
        console.log('SpotifyService: PKCE data check - existing state:', existingState, 'existing verifier:', existingCodeVerifier ? 'found' : 'not found');
        
        let codeVerifier, codeChallenge, state;
        
        if (existingState && existingCodeVerifier) {
            // Reuse existing PKCE data if we have it
            console.log('SpotifyService: Reusing existing PKCE data - state:', existingState);
            codeVerifier = existingCodeVerifier;
            state = existingState;
            // Generate challenge from existing verifier
            codeChallenge = await this.generateCodeChallenge(codeVerifier);
        } else {
            // Generate new PKCE challenge
            console.log('SpotifyService: Generating new PKCE data');
            // Clear any existing PKCE data first
            localStorage.removeItem('spotify_code_verifier');
            localStorage.removeItem('spotify_auth_state');
            
            codeVerifier = this.generateCodeVerifier();
            codeChallenge = await this.generateCodeChallenge(codeVerifier);
            
            // Store code verifier for later use
            localStorage.setItem('spotify_code_verifier', codeVerifier);
            
            // Generate state for CSRF protection
            state = 'spotify_auth_' + Math.random().toString(36).substring(7);
            localStorage.setItem('spotify_auth_state', state);
            
            console.log('SpotifyService: Generated new PKCE data - state:', state, 'verifier length:', codeVerifier.length);
        }

        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            scope: scopes.join(' '),
            state: state,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge
        });

        const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
        console.log('SpotifyService: Generated PKCE auth URL:', authUrl);
        return authUrl;
    }

    // Generate PKCE code verifier
    generateCodeVerifier() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    // Generate PKCE code challenge
    async generateCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    // Handle authentication callback
    async handleAuthCallback() {
        console.log('SpotifyService: handleAuthCallback called');
        
        // Delegate to auth manager
        const result = await spotifyAuthManager.handleCallback();
        
        if (result) {
            // Get the token from auth manager
            const token = localStorage.getItem('spotify_access_token');
            console.log('SpotifyService: Auth successful, token length:', token ? token.length : 0);
            
            // Update our access token
            this.accessToken = token;
            
            // Dispatch a custom event to notify the UI
            window.dispatchEvent(new CustomEvent('spotifyAuthenticated', {
                detail: { token: token }
            }));
        }
        
        return result;
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

            // Define the callback function BEFORE loading the script
            window.onSpotifyWebPlaybackSDKReady = () => {
                console.log('Spotify Web Playback SDK ready');
                resolve();
            };

            const script = document.createElement('script');
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            
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

    // Comprehensive search for tracks, artists, and albums
    async search(query, types = ['track', 'artist', 'album'], limit = 10) {
        if (!this.accessToken) return { tracks: { items: [] }, artists: { items: [] }, albums: { items: [] } };

        try {
            const typeString = types.join(',');
            const response = await this.makeApiCall(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${typeString}&limit=${limit}`);

            if (!response.ok) throw new Error('Search request failed');
            
            const data = await response.json();
            return {
                tracks: data.tracks || { items: [] },
                artists: data.artists || { items: [] },
                albums: data.albums || { items: [] }
            };
        } catch (error) {
            console.error('Error searching Spotify:', error);
            return { tracks: { items: [] }, artists: { items: [] }, albums: { items: [] } };
        }
    }

    // Get user's playlists
    async getUserPlaylists() {
        if (!this.accessToken) return [];

        try {
            const response = await this.makeApiCall('https://api.spotify.com/v1/me/playlists?limit=50');

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
            const response = await this.makeApiCall(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
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

    // Play an artist's top tracks
    async playArtist(artistUri) {
        if (!this.accessToken || !this.deviceId) return false;

        try {
            const response = await this.makeApiCall(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    context_uri: artistUri
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Error playing artist:', error);
            return false;
        }
    }

    // Play an album
    async playAlbum(albumUri) {
        if (!this.accessToken || !this.deviceId) return false;

        try {
            const response = await this.makeApiCall(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    context_uri: albumUri
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Error playing album:', error);
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
            const response = await this.makeApiCall(`https://api.spotify.com/v1/me/player/pause?device_id=${this.deviceId}`, {
                method: 'PUT'
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
        spotifyAuthManager.clearAuth();
        
        // Dispatch disconnect event
        window.dispatchEvent(new CustomEvent('spotifyDisconnected'));
    }
    
    // Clear PKCE data (use with caution)
    clearPKCEData() {
        localStorage.removeItem('spotify_code_verifier');
        localStorage.removeItem('spotify_auth_state');
        console.log('SpotifyService: PKCE data cleared');
    }

    // Check if user is authenticated
    isAuthenticated() {
        const authState = spotifyAuthManager.getAuthState();
        const hasToken = authState.isAuthenticated && !!this.accessToken;
        console.log('isAuthenticated check - authState:', authState.state, 'hasToken:', hasToken, 'token length:', this.accessToken ? this.accessToken.length : 0);
        return hasToken;
    }
    
    // Check if token is valid by making a test API call
    async validateToken() {
        if (!this.accessToken) {
            console.log('No token to validate');
            return false;
        }
        
        try {
            const response = await fetch('https://api.spotify.com/v1/me', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            if (response.ok) {
                console.log('Token is valid');
                return true;
            } else {
                console.log('Token validation failed, status:', response.status);
                // Token is invalid, remove it
                this.accessToken = null;
                spotifyAuthManager.clearAuth();
                return false;
            }
        } catch (error) {
            console.error('Error validating token:', error);
            return false;
        }
    }

    // Check if player is ready
    isPlayerReady() {
        return !!this.deviceId;
    }

    // Make API call with automatic token refresh on 401
    async makeApiCall(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                ...options.headers
            }
        };
        
        const finalOptions = { ...options, ...defaultOptions };
        
        try {
            const response = await fetch(url, finalOptions);
            
            // If we get a 401, try to refresh the token and retry
            if (response.status === 401) {
                console.log('SpotifyService: Got 401, attempting token refresh...');
                const refreshSuccess = await spotifyAuthManager.refreshAccessToken();
                
                if (refreshSuccess) {
                    // Update our access token
                    this.accessToken = localStorage.getItem('spotify_access_token');
                    
                    // Retry the request with the new token
                    finalOptions.headers['Authorization'] = `Bearer ${this.accessToken}`;
                    return await fetch(url, finalOptions);
                } else {
                    console.error('SpotifyService: Token refresh failed, user needs to re-authenticate');
                    // Dispatch disconnect event
                    window.dispatchEvent(new CustomEvent('spotifyDisconnected'));
                    return response; // Return the original 401 response
                }
            }
            
            return response;
        } catch (error) {
            console.error('SpotifyService: API call error:', error);
            throw error;
        }
    }

    // Add track to playlist
    async addTrackToPlaylist(playlistId, trackUri) {
        if (!this.accessToken) return false;

        try {
            const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                method: 'POST',
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
            console.error('Error adding track to playlist:', error);
            return false;
        }
    }

    // Create a new playlist
    async createPlaylist(name, description = '', isPublic = false) {
        if (!this.accessToken) return null;

        try {
            // First get user ID
            const userResponse = await fetch('https://api.spotify.com/v1/me', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!userResponse.ok) throw new Error('Failed to get user info');
            const user = await userResponse.json();

            // Create playlist
            const response = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    description: description,
                    public: isPublic
                })
            });

            if (!response.ok) throw new Error('Failed to create playlist');
            const playlist = await response.json();
            return playlist;
        } catch (error) {
            console.error('Error creating playlist:', error);
            return null;
        }
    }
}

// Export singleton instance
export const spotifyService = new SpotifyService();
