// src/js/spotifyUI.js

import { spotifyService } from './spotifyService.js';
import { spotifyConfig, getConfig } from './spotifyConfig.js';

export class SpotifyUI {
    constructor() {
        this.isVisible = false;
        this.currentMood = null;
        this.currentPlaylist = null;
        this.isPlaying = false;
        
        // UI elements
        this.container = null;
        this.loginButton = null;
        this.nowPlaying = null;
        this.controls = null;
        this.playlistSelector = null;
        this.volumeControl = null;
        
        // Bind methods
        this.handleLogin = this.handleLogin.bind(this);
        this.handlePlayback = this.handlePlayback.bind(this);
        this.handleVolumeChange = this.handleVolumeChange.bind(this);
        this.handlePlaylistChange = this.handlePlaylistChange.bind(this);
        
        // Initialize
        this.init();
    }

    init() {
        // Check for auth callback
        if (spotifyService.handleAuthCallback()) {
            this.updateUI();
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize Spotify service
        spotifyService.init(getConfig('clientId'), getConfig('redirectUri'));
        
        // Set up callbacks
        spotifyService.onTrackChange = this.onTrackChange.bind(this);
        spotifyService.onPlaybackStateChange = this.onPlaybackStateChange.bind(this);
        spotifyService.onError = this.onError.bind(this);
    }

    setupEventListeners() {
        // Handle auth callback on page load
        window.addEventListener('load', () => {
            if (spotifyService.handleAuthCallback()) {
                this.updateUI();
            }
        });
    }

    // Create and inject Spotify UI into the page
    injectUI() {
        if (this.container) return; // Already injected

        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'spotify-container';
        this.container.className = 'spotify-container';
        this.container.style.display = 'none'; // Hidden by default

        // Create login section
        this.createLoginSection();
        
        // Create now playing section
        this.createNowPlayingSection();
        
        // Create controls section
        this.createControlsSection();
        
        // Create playlist selector
        this.createPlaylistSelector();
        
        // Create volume control
        this.createVolumeControl();
        
        // Inject into the page (after background music section)
        const backgroundMusicSection = document.getElementById('background-music');
        if (backgroundMusicSection) {
            backgroundMusicSection.parentNode.insertBefore(this.container, backgroundMusicSection.nextSibling);
        }
        
        // Don't call updateUI here - wait for user to click toggle button
    }

    createLoginSection() {
        const loginSection = document.createElement('div');
        loginSection.className = 'spotify-login-section';
        loginSection.style.display = 'none'; // Hide by default
        
        this.loginButton = document.createElement('button');
        this.loginButton.className = 'button-primary spotify-login-btn';
        this.loginButton.innerHTML = '<i class="fab fa-spotify"></i> Disconnect Spotify';
        this.loginButton.addEventListener('click', this.handleLogin);
        
        const statusText = document.createElement('p');
        statusText.className = 'spotify-status';
        statusText.textContent = 'Connected to Spotify';
        
        loginSection.appendChild(this.loginButton);
        loginSection.appendChild(statusText);
        this.container.appendChild(loginSection);
    }

    createNowPlayingSection() {
        const nowPlayingSection = document.createElement('div');
        nowPlayingSection.className = 'spotify-now-playing';
        nowPlayingSection.style.display = 'none';
        
        const title = document.createElement('h3');
        title.textContent = 'Now Playing';
        
        this.nowPlaying = document.createElement('div');
        this.nowPlaying.className = 'now-playing-content';
        this.nowPlaying.innerHTML = '<p>No track playing</p>';
        
        nowPlayingSection.appendChild(title);
        nowPlayingSection.appendChild(this.nowPlaying);
        this.container.appendChild(nowPlayingSection);
    }

    createControlsSection() {
        const controlsSection = document.createElement('div');
        controlsSection.className = 'spotify-controls';
        controlsSection.style.display = 'none';
        
        const title = document.createElement('h3');
        title.textContent = 'Spotify Controls';
        
        this.controls = document.createElement('div');
        this.controls.className = 'controls-content';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'button-primary spotify-control-btn';
        prevBtn.innerHTML = '<i class="fas fa-step-backward"></i>';
        prevBtn.addEventListener('click', () => spotifyService.previous());
        
        // Play/Pause button
        const playPauseBtn = document.createElement('button');
        playPauseBtn.className = 'button-primary spotify-control-btn';
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        playPauseBtn.addEventListener('click', this.handlePlayback);
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'button-primary spotify-control-btn';
        nextBtn.innerHTML = '<i class="fas fa-step-forward"></i>';
        nextBtn.addEventListener('click', () => spotifyService.next());
        
        this.controls.appendChild(prevBtn);
        this.controls.appendChild(playPauseBtn);
        this.controls.appendChild(nextBtn);
        
        controlsSection.appendChild(title);
        controlsSection.appendChild(this.controls);
        this.container.appendChild(controlsSection);
    }

    createPlaylistSelector() {
        const playlistSection = document.createElement('div');
        playlistSection.className = 'spotify-playlist-selector';
        playlistSection.style.display = 'none';
        
        const title = document.createElement('h3');
        title.textContent = 'Playlists';
        
        this.playlistSelector = document.createElement('select');
        this.playlistSelector.className = 'selector-primary spotify-playlist-select';
        this.playlistSelector.addEventListener('change', this.handlePlaylistChange);
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a playlist...';
        this.playlistSelector.appendChild(defaultOption);
        
        playlistSection.appendChild(title);
        playlistSection.appendChild(this.playlistSelector);
        this.container.appendChild(playlistSection);
    }

    createVolumeControl() {
        const volumeSection = document.createElement('div');
        volumeSection.className = 'spotify-volume-control';
        volumeSection.style.display = 'none';
        
        const title = document.createElement('h3');
        title.textContent = 'Spotify Volume';
        
        this.volumeControl = document.createElement('input');
        this.volumeControl.type = 'range';
        this.volumeControl.min = '0';
        this.volumeControl.max = '100';
        this.volumeControl.value = getConfig('defaultVolume');
        this.volumeControl.className = 'slider spotify-volume-slider';
        this.volumeControl.addEventListener('input', this.handleVolumeChange);
        
        const volumeLabel = document.createElement('span');
        volumeLabel.className = 'volume-label';
        volumeLabel.textContent = `${this.volumeControl.value}%`;
        
        volumeSection.appendChild(title);
        volumeSection.appendChild(this.volumeControl);
        volumeSection.appendChild(volumeLabel);
        this.container.appendChild(volumeSection);
    }

    // Handle Spotify login
    async handleLogin() {
        if (spotifyService.isAuthenticated()) {
            // Already logged in, show logout option
            if (confirm('Disconnect from Spotify?')) {
                await spotifyService.disconnect();
                this.updateUI();
            }
        } else {
            // Redirect to Spotify auth
            window.location.href = spotifyService.getAuthUrl();
        }
    }

    // Handle play/pause
    async handlePlayback() {
        if (!spotifyService.isAuthenticated()) return;
        
        if (spotifyService.isPlaying) {
            await spotifyService.pause();
        } else {
            await spotifyService.resume();
        }
    }

    // Handle volume change
    async handleVolumeChange(event) {
        const volume = event.target.value;
        const volumeLabel = event.target.parentNode.querySelector('.volume-label');
        if (volumeLabel) {
            volumeLabel.textContent = `${volume}%`;
        }
        
        await spotifyService.setVolume(volume);
    }

    // Handle playlist selection
    async handlePlaylistChange(event) {
        const playlistUri = event.target.value;
        if (playlistUri) {
            await spotifyService.playPlaylist(playlistUri);
        }
    }

    // Handle track change
    onTrackChange(track) {
        if (!this.nowPlaying) return;
        
        this.nowPlaying.innerHTML = `
            <div class="track-info">
                <img src="${track.album.images[0]?.url || ''}" alt="Album Art" class="album-art">
                <div class="track-details">
                    <p class="track-name">${track.name}</p>
                    <p class="track-artist">${track.artists.map(a => a.name).join(', ')}</p>
                    <p class="track-album">${track.album.name}</p>
                </div>
            </div>
        `;
    }

    // Handle playback state change
    onPlaybackStateChange(state) {
        if (!this.controls) return;
        
        const playPauseBtn = this.controls.querySelector('.spotify-control-btn:nth-child(2)');
        if (playPauseBtn) {
            if (state && !state.paused) {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                this.isPlaying = true;
            } else {
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                this.isPlaying = false;
            }
        }
    }

    // Handle errors
    onError(message) {
        console.error('Spotify error:', message);
        // Show error message to user
        if (this.container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'spotify-error';
            errorDiv.textContent = `Spotify error: ${message}`;
            errorDiv.style.color = 'red';
            errorDiv.style.padding = '10px';
            errorDiv.style.margin = '10px 0';
            errorDiv.style.backgroundColor = '#ffebee';
            errorDiv.style.borderRadius = '4px';
            
            this.container.insertBefore(errorDiv, this.container.firstChild);
            
            // Remove error after 5 seconds
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 5000);
        }
    }

    // Update UI based on authentication state
    async updateUI() {
        if (!this.container) return;
        
        const isAuthenticated = spotifyService.isAuthenticated();
        const isReady = spotifyService.isPlayerReady();
        
        // Show/hide container
        this.container.style.display = 'block';
        
        // Show/hide login section based on authentication
        if (this.loginButton && this.loginButton.parentNode) {
            this.loginButton.parentNode.style.display = isAuthenticated ? 'block' : 'none';
        }
        
        // Update login button text
        if (this.loginButton) {
            if (isAuthenticated) {
                this.loginButton.innerHTML = '<i class="fab fa-spotify"></i> Disconnect Spotify';
                this.loginButton.classList.add('button-primary-active');
            } else {
                this.loginButton.innerHTML = '<i class="fab fa-spotify"></i> Connect Spotify';
                this.loginButton.classList.remove('button-primary-active');
            }
        }
        
        // Show/hide sections based on authentication
        const sections = [
            { element: this.nowPlaying, show: isAuthenticated && isReady },
            { element: this.controls, show: isAuthenticated && isReady },
            { element: this.playlistSelector, show: isAuthenticated && isReady },
            { element: this.volumeControl, show: isAuthenticated && isReady }
        ];
        
        sections.forEach(({ element, show }) => {
            if (element && element.parentNode) {
                element.parentNode.style.display = show ? 'block' : 'none';
            }
        });
        
        // Load playlists if authenticated
        if (isAuthenticated && isReady) {
            await this.loadPlaylists();
        }
    }

    // Load user playlists
    async loadPlaylists() {
        if (!this.playlistSelector) return;
        
        try {
            const playlists = await spotifyService.getUserPlaylists();
            
            // Clear existing options (keep default)
            this.playlistSelector.innerHTML = '';
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a playlist...';
            this.playlistSelector.appendChild(defaultOption);
            
            // Add playlist options
            playlists.forEach(playlist => {
                const option = document.createElement('option');
                option.value = playlist.uri;
                option.textContent = playlist.name;
                this.playlistSelector.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading playlists:', error);
        }
    }

    // Play music by mood (integrate with existing background music system)
    async playByMood(mood) {
        if (!spotifyService.isAuthenticated()) {
            alert('Please connect to Spotify first');
            return;
        }
        
        this.currentMood = mood;
        
        try {
            // Try to play default playlist first
            const defaultPlaylist = getConfig(`defaultPlaylists.${mood}`);
            if (defaultPlaylist) {
                await spotifyService.playPlaylist(defaultPlaylist);
                return;
            }
            
            // Fallback to search-based recommendations
            const tracks = await spotifyService.getRecommendedTracks(mood, 10);
            if (tracks.length > 0) {
                const trackUris = tracks.map(track => track.uri);
                // Create a temporary playlist context
                await spotifyService.playTrack(trackUris[0]);
            }
        } catch (error) {
            console.error('Error playing mood music:', error);
            this.onError('Failed to play music for this mood');
        }
    }

    // Show/hide the Spotify UI
    toggle() {
        if (!this.container) {
            this.injectUI();
        }
        
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            // Show the UI and update it
            this.container.style.display = 'block';
            this.updateUI();
        } else {
            // Hide the UI
            this.container.style.display = 'none';
        }
    }

    // Show the Spotify UI
    show() {
        if (!this.container) {
            this.injectUI();
        }
        this.isVisible = true;
        this.container.style.display = 'block';
        this.updateUI(); // Update UI when showing
    }

    // Hide the Spotify UI
    hide() {
        if (this.container) {
            this.isVisible = false;
            this.container.style.display = 'none';
        }
    }
}

// Export singleton instance
export const spotifyUI = new SpotifyUI();
