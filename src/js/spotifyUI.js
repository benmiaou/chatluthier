// src/js/spotifyUI.js

import { spotifyService } from './spotifyService.js';
import { spotifyConfig, getConfig } from './spotifyConfig.js';
import { spotifyAuthManager } from './spotifyAuthManager.js';

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
        this.searchInput = null;
        this.searchResults = null;
        // Volume control removed - using main Background Music volume slider instead
        
        // Bind methods
        this.handleLogin = this.handleLogin.bind(this);
        this.handlePlayback = this.handlePlayback.bind(this);
        // Volume control removed - using main Background Music volume slider instead
        this.handlePlaylistChange = this.handlePlaylistChange.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        
        // Initialize
        this.init();
    }

    async init() {
        // Initialize Spotify service first
        await spotifyService.init(getConfig('clientId'), getConfig('redirectUri'));
        
        // Don't handle auth callback here - let main.js handle it
        // Just check current state
        const isAuthenticated = spotifyService.isAuthenticated();
        console.log('SpotifyUI init - is authenticated:', isAuthenticated);
        
        // Set up callbacks
        spotifyService.onTrackChange = this.onTrackChange.bind(this);
        spotifyService.onPlaybackStateChange = this.onPlaybackStateChange.bind(this);
        spotifyService.onError = this.onError.bind(this);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Listen to auth state changes
        spotifyAuthManager.addListener((authState) => {
            this.handleAuthStateChange(authState);
        });
        
        // Update UI if already authenticated
        if (isAuthenticated) {
            await this.updateUI();
        }
    }

    setupEventListeners() {
        // Listen for Spotify authentication events
        window.addEventListener('spotifyAuthenticated', async (event) => {
            console.log('SpotifyUI: Spotify authenticated event received:', event.detail);
            await this.updateUI();
        });
        
        window.addEventListener('spotifyAuthError', (event) => {
            console.error('SpotifyUI: Spotify auth error event received:', event.detail);
            this.onError(`Authentication failed: ${event.detail.error}`);
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

        // Create now playing section
        this.createNowPlayingSection();
        
        // Create controls section
        this.createControlsSection();
        
        // Create search section
        this.createSearchSection();
        
        // Create playlist selector
        this.createPlaylistSelector();
        
        // Volume control removed - using main Background Music volume slider instead
        
        // Inject into the page (after background music section)
        const backgroundMusicSection = document.getElementById('background-music');
        if (backgroundMusicSection) {
            backgroundMusicSection.parentNode.insertBefore(this.container, backgroundMusicSection.nextSibling);
        }
        
        // Don't call updateUI here - wait for user to click toggle button
    }

    createNowPlayingSection() {
        const nowPlayingSection = document.createElement('div');
        nowPlayingSection.className = 'spotify-now-playing';
        nowPlayingSection.style.display = 'block';
        
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
        controlsSection.style.display = 'block';
        
        
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
        
        controlsSection.appendChild(this.controls);
        this.container.appendChild(controlsSection);
    }

    createSearchSection() {
        const searchSection = document.createElement('div');
        searchSection.className = 'spotify-search';
        searchSection.style.display = 'block';
        
        // Search input
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Search tracks, artists, albums...';
        this.searchInput.className = 'spotify-search-input';
        this.searchInput.addEventListener('input', this.handleSearch);
        
        // Search results container
        this.searchResults = document.createElement('div');
        this.searchResults.className = 'spotify-search-results';
        this.searchResults.style.display = 'none';
        
        searchSection.appendChild(this.searchInput);
        searchSection.appendChild(this.searchResults);
        this.container.appendChild(searchSection);
    }

    createPlaylistSelector() {
        const playlistSection = document.createElement('div');
        playlistSection.className = 'spotify-playlist-selector';
        playlistSection.style.display = 'block';
        
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

    // Volume control removed - using main Background Music volume slider instead

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

    // Volume control removed - using main Background Music volume slider instead

    // Handle playlist selection
    async handlePlaylistChange(event) {
        const playlistUri = event.target.value;
        if (playlistUri) {
            await spotifyService.playPlaylist(playlistUri);
        }
    }

    // Handle search
    async handleSearch(event) {
        const query = event.target.value.trim();
        
        if (query.length < 2) {
            this.searchResults.style.display = 'none';
            return;
        }
        
        try {
            const results = await spotifyService.search(query, ['track', 'artist', 'album'], 10);
            this.displaySearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.searchResults.innerHTML = '<div class="search-error">Search failed. Please try again.</div>';
            this.searchResults.style.display = 'block';
        }
    }

    // Display search results
    displaySearchResults(results) {
        if (!results || (!results.tracks?.items?.length && !results.artists?.items?.length && !results.albums?.items?.length)) {
            this.searchResults.innerHTML = '<div class="no-results">No results found</div>';
            this.searchResults.style.display = 'block';
            return;
        }
        
        let html = '';
        
        // Tracks
        if (results.tracks?.items?.length) {
            html += '<div class="search-section"><h4>Tracks</h4>';
            results.tracks.items.forEach(track => {
                html += `
                    <div class="search-item">
                        <img src="${track.album.images[0]?.url || ''}" alt="Album Art" class="search-item-art">
                        <div class="search-item-info">
                            <div class="search-item-name">${track.name}</div>
                            <div class="search-item-artist">${track.artists.map(a => a.name).join(', ')}</div>
                        </div>
                        <div class="search-item-actions">
                            <button class="search-action-btn play-btn" data-type="track" data-uri="${track.uri}" title="Play">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="search-action-btn add-btn" data-type="track" data-uri="${track.uri}" title="Add to Playlist">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // Artists
        if (results.artists?.items?.length) {
            html += '<div class="search-section"><h4>Artists</h4>';
            results.artists.items.forEach(artist => {
                html += `
                    <div class="search-item">
                        <img src="${artist.images[0]?.url || ''}" alt="Artist" class="search-item-art">
                        <div class="search-item-info">
                            <div class="search-item-name">${artist.name}</div>
                            <div class="search-item-artist">Artist</div>
                        </div>
                        <div class="search-item-actions">
                            <button class="search-action-btn play-btn" data-type="artist" data-uri="${artist.uri}" title="Play Artist">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // Albums
        if (results.albums?.items?.length) {
            html += '<div class="search-section"><h4>Albums</h4>';
            results.albums.items.forEach(album => {
                html += `
                    <div class="search-item">
                        <img src="${album.images[0]?.url || ''}" alt="Album Art" class="search-item-art">
                        <div class="search-item-info">
                            <div class="search-item-name">${album.name}</div>
                            <div class="search-item-artist">${album.artists.map(a => a.name).join(', ')}</div>
                        </div>
                        <div class="search-item-actions">
                            <button class="search-action-btn play-btn" data-type="album" data-uri="${album.uri}" title="Play Album">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        this.searchResults.innerHTML = html;
        this.searchResults.style.display = 'block';
        
        // Add event listeners to search items
        this.addSearchItemListeners();
    }

    // Add event listeners to search result items
    addSearchItemListeners() {
        const actionButtons = this.searchResults.querySelectorAll('.search-action-btn');
        actionButtons.forEach(button => {
            button.addEventListener('click', async (event) => {
                event.stopPropagation(); // Prevent event bubbling
                
                const type = event.currentTarget.dataset.type;
                const uri = event.currentTarget.dataset.uri;
                const action = event.currentTarget.classList.contains('play-btn') ? 'play' : 'add';
                
                if (!type || !uri) return;
                
                try {
                    if (action === 'play') {
                        let success = false;
                        switch (type) {
                            case 'track':
                                success = await spotifyService.playTrack(uri);
                                break;
                            case 'artist':
                                success = await spotifyService.playArtist(uri);
                                break;
                            case 'album':
                                success = await spotifyService.playAlbum(uri);
                                break;
                        }
                        
                        if (success) {
                            // Hide search results after successful play
                            this.searchResults.style.display = 'none';
                            this.searchInput.value = '';
                        } else {
                            console.error('Failed to play', type, uri);
                        }
                    } else if (action === 'add' && type === 'track') {
                        // Show playlist selector for adding track
                        await this.showAddToPlaylistDialog(uri);
                    }
                } catch (error) {
                    console.error('Error with', action, type, ':', error);
                }
            });
        });
    }

    // Show dialog to select playlist for adding track
    async showAddToPlaylistDialog(trackUri) {
        try {
            const playlists = await spotifyService.getUserPlaylists();
            
            if (playlists.length === 0) {
                alert('No playlists found. Create a playlist first.');
                return;
            }

            // Create playlist selection dialog
            const dialog = document.createElement('div');
            dialog.className = 'playlist-dialog';
            dialog.innerHTML = `
                <div class="playlist-dialog-content">
                    <h3>Add to Playlist</h3>
                    <select class="playlist-selector" id="playlist-selector">
                        <option value="">Select a playlist...</option>
                        ${playlists.map(playlist => 
                            `<option value="${playlist.id}">${playlist.name}</option>`
                        ).join('')}
                    </select>
                    <div class="playlist-dialog-actions">
                        <button class="button-primary" id="add-to-playlist-btn">Add</button>
                        <button class="button-secondary" id="cancel-add-btn">Cancel</button>
                    </div>
                </div>
            `;

            // Add to page
            document.body.appendChild(dialog);

            // Handle add button
            document.getElementById('add-to-playlist-btn').addEventListener('click', async () => {
                const playlistId = document.getElementById('playlist-selector').value;
                if (playlistId) {
                    const success = await spotifyService.addTrackToPlaylist(playlistId, trackUri);
                    if (success) {
                        alert('Track added to playlist successfully!');
                        document.body.removeChild(dialog);
                    } else {
                        alert('Failed to add track to playlist.');
                    }
                } else {
                    alert('Please select a playlist.');
                }
            });

            // Handle cancel button
            document.getElementById('cancel-add-btn').addEventListener('click', () => {
                document.body.removeChild(dialog);
            });

        } catch (error) {
            console.error('Error showing playlist dialog:', error);
            alert('Error loading playlists.');
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

    // Handle auth state changes
    handleAuthStateChange(authState) {
        console.log('SpotifyUI: Auth state changed:', authState);
        
        if (authState.state === 'connected') {
            // Update UI to show authenticated state
            this.updateUI();
        } else if (authState.state === 'disconnected' || authState.state === 'error') {
            // Update UI to show disconnected state
            this.updateUI();
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
            { element: this.nowPlaying, show: isAuthenticated },
            { element: this.controls, show: isAuthenticated },
            { element: this.playlistSelector, show: isAuthenticated },
            { element: this.searchInput, show: isAuthenticated }
        ];
        
        sections.forEach(({ element, show }) => {
            if (element && element.parentNode) {
                element.parentNode.style.display = show ? 'block' : 'none';
            }
        });
        
        // Load playlists if authenticated
        if (isAuthenticated) {
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

// Make it globally accessible for main.js
window.spotifyUI = spotifyUI;
