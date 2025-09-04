// src/js/main.js

import '../css/styles.css';
import '../css/spotify.css'; 

import { GoogleLogin } from './googleLogin.js'; // Adjust the path if necessary
import { AudioPlayer } from './audioPlayer.js';
import { AudioManager, BackgroundMusic } from './backgroundMusic.js';
import { AmbianceSounds } from './ambianceSounds.js'; // Ensure default export
import { SoundBoard } from './soundboard.js'; 
console.log('SoundBoard:', SoundBoard); // Should log the SoundBoard object with all its methods
import { showAllCredits } from './credits.js';
import './modalWindow.js';
import { toggleMenu, initModals, closeExternalModal } from './modalHandler.js';
import { closeModal } from './modalCredits.js'; // Import createModal
import { openEditSoundModalAdmin,  closeEditSoundModalAdmin, displaySoundsAdmin, isAdminEditVisible } from  './editSoundsAdmin.js';
import { openEditSoundModalUser, closeEditSoundModalUser, displaySoundsUser } from  './editSoundsUser.js';
import { openAddSoundModal,  closeAddSoundModal } from  './addSound.js';
import { openRequestSoundModal, closeRequestSoundModal } from  './requestSound.js';
import { openRequestSoundModalAdmin, closeRequestSoundModalAdmin } from  './requestSoundsProcess.js';
import { spotifyUI } from './spotifyUI.js';
import { spotifyService } from './spotifyService.js';

import './socket-client.js';

// Initialize and attach to window if necessary (for inline handlers)
const audioPlayer = new AudioPlayer();
window.AudioPlayer = audioPlayer;

const audioManager = new AudioManager(); // Corrected variable name
window.AudioManager = audioManager;

// Global state for music source
let useSpotify = false;

// Add Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const calmButton = document.getElementById('calmButton');
    const dynamicButton = document.getElementById('dynamicButton');
    const intenseButton = document.getElementById('intenseButton');
    const allButton = document.getElementById('allButton');
    const nextButton = document.getElementById('nextButton');
    const resetAmbient = document.getElementById('resetAmbient');
    const requestsoundButton = document.getElementById('requestsoundButton');
    const openEditSoundModalAdminButton = document.getElementById('openEditSoundAdminModal');
    const openEditSoundModalUserButton = document.getElementById('openEditSoundUserModal');
    const openAddSoundModalAdminButton = document.getElementById('openAddSoundModalAdminButton');
    const toggleMenuButton = document.getElementById('toggleMenu');
    const closeExternalModalButton = document.getElementById('closeExternalModal');
    const closeModalButton = document.getElementById('closeModal');
    const closeEditSoundModalButton = document.getElementById('closeEditSoundModal');
    const closeAddSoundModalButton = document.getElementById('closeAddSoundModal');
    const closeRequestsoundButton = document.getElementById('closeRequestsoundButton');
    const showAllCreditsButton = document.getElementById('showAllCredits');
    const openRequestSoundModalAdminButton = document.getElementById('openRequestSoundModalAdminButton');
    const closeRequestSoundModalButton = document.getElementById('closeRequestSoundModalButton');
    const spotifyToggleButton = document.getElementById('spotify-toggle-button');
    const musicSourceToggle = document.getElementById('music-source-toggle');
    const musicSourceLabel = document.getElementById('music-source-label');

    
    if (calmButton) {
        calmButton.addEventListener('click', function() {
            if (useSpotify && spotifyService.isAuthenticated() && spotifyService.isPlayerReady()) {
                spotifyUI.playByMood('calm');
            } else {
                BackgroundMusic.playBackgroundSound('calm', this);
            }
        });
    }

    if (dynamicButton) {
        dynamicButton.addEventListener('click', function() {
            if (useSpotify && spotifyService.isAuthenticated() && spotifyService.isPlayerReady()) {
                spotifyUI.playByMood('dynamic');
            } else {
                BackgroundMusic.playBackgroundSound('dynamic', this);
            }
        });
    }

    if (intenseButton) {
        intenseButton.addEventListener('click', function() {
            if (useSpotify && spotifyService.isAuthenticated() && spotifyService.isPlayerReady()) {
                spotifyUI.playByMood('intense');
            } else {
                BackgroundMusic.playBackgroundSound('intense', this);
            }
        });
    }
    if (allButton) {
        allButton.addEventListener('click', function() {
            if (useSpotify && spotifyService.isAuthenticated() && spotifyService.isPlayerReady()) {
                spotifyUI.playByMood('all');
            } else {
                BackgroundMusic.playBackgroundSound('all', this);
            }
        });
    }
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            BackgroundMusic.nextButtonCallBack();
        });
    }
    if (resetAmbient) {
        resetAmbient.addEventListener('click', function() {
            AmbianceSounds.resetAmbientSounds();
        });
    }
    if (openEditSoundModalUserButton) {
        openEditSoundModalUserButton.addEventListener('click', function() {
            openEditSoundModalUser();
        });
    }
    if (openEditSoundModalAdminButton) {
        openEditSoundModalAdminButton.addEventListener('click', function() {
            openEditSoundModalAdmin();
        });
    }
    if (openAddSoundModalAdminButton) {
        openAddSoundModalAdminButton.addEventListener('click', function() {
            openAddSoundModal();
        });
    }
    if (requestsoundButton) {
        requestsoundButton.addEventListener('click', function() {
            openRequestSoundModal();
        });
    }
    if (closeRequestsoundButton) {
        closeRequestsoundButton.addEventListener('click', function() {
            closeRequestSoundModal();
        });
    }
    if (toggleMenuButton) {
        toggleMenuButton.addEventListener('click', function() {
            toggleMenu();
        });
    }
    if (closeExternalModalButton) {
        closeExternalModalButton.addEventListener('click', function() {
            closeExternalModal();
        });
    }
    if (closeModalButton) {
        closeModalButton.addEventListener('click', function() {
            closeModal();
        });
    }
    if (closeEditSoundModalButton) {
        closeEditSoundModalButton.addEventListener('click', function() {
            closeEditSoundModalAdmin();
            closeEditSoundModalUser();
            BackgroundMusic.preloadBackgroundSounds();
            SoundBoard.loadSoundboardButtons();
            AmbianceSounds.loadAmbianceButtons();
        });
    }
    if (closeAddSoundModalButton) {
        closeAddSoundModalButton.addEventListener('click', function() {
            closeAddSoundModal();
        });
    }
    if (showAllCreditsButton) {
        showAllCreditsButton.addEventListener('click', function() {
            showAllCredits();
        });
    }
    if (openRequestSoundModalAdminButton) {
        openRequestSoundModalAdminButton.addEventListener('click', function() {
            openRequestSoundModalAdmin();
        });
    }
    if (closeRequestSoundModalButton) {
        closeRequestSoundModalButton.addEventListener('click', function() {
            closeRequestSoundModalAdmin();
        });
    }
    
    if (spotifyToggleButton) {
        spotifyToggleButton.addEventListener('click', async function() {
            // If not authenticated, connect to Spotify
            if (!spotifyService.isAuthenticated()) {
                try {
                    // Show loading state
                    spotifyToggleButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                    spotifyToggleButton.disabled = true;
                    
                    // Get the auth URL (await the Promise)
                    const authUrl = await spotifyService.getAuthUrl();
                    console.log('Redirecting to Spotify auth:', authUrl);
                    
                    // Redirect to Spotify auth
                    window.location.href = authUrl;
                    return; // Don't continue, page will redirect
                } catch (error) {
                    console.error('Error connecting to Spotify:', error);
                    alert('Failed to connect to Spotify. Please try again.');
                    spotifyToggleButton.innerHTML = '<i class="fab fa-spotify"></i> Toggle Spotify';
                    spotifyToggleButton.disabled = false;
                    return;
                }
            } else {
                // If already authenticated, toggle the UI
                spotifyUI.toggle();
            }
        });
    }
    
    if (musicSourceToggle) {
        musicSourceToggle.addEventListener('click', function() {
            toggleMusicSource();
        });
    }
    

    // Integrate the new script functionalities here
    const audio = BackgroundMusic.getPlayer();
    const progressBar = document.getElementById('progressBar');
    const progress = document.getElementById('sound-progress');

    if (audio) {
        // Function to update the progress bar
        function updateProgress() {
            if (audio.duration) { // Prevent division by zero
                const percentage = (audio.currentTime / audio.duration) * 100;
                progress.style.width = percentage + '%';
            }
        }

        // Event listener for time update on audio
        audio.addEventListener('timeupdate', updateProgress);

        // Click on progress bar to change position
        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                const progressBarWidth = progressBar.clientWidth;
                const clickPosition = e.offsetX;
                const timePerPixel = audio.duration / progressBarWidth;
                audio.currentTime = timePerPixel * clickPosition;
            });
        } else {
            console.error("Progress bar element with ID 'progressBar' not found.");
        }
    } else {
        console.error("Audio player instance not found from BackgroundMusic.getPlayer().");
    }

          // **Volume Slider Change Event**
      const volumeSlider = document.getElementById('music-volume');
      if (volumeSlider) {
          volumeSlider.addEventListener('change', function(event) {
              const volume = event.target.value;
              BackgroundMusic.setBackgroundVolume(volume);
          });
      } else {
          console.error("Volume slider element with ID 'music-volume' not found.");
      }

         // **Volume Slider Change Event**
     const soundboardSlider = document.getElementById('soundboard-volume');
     if (soundboardSlider) {
         soundboardSlider.addEventListener('change', function(event) {
             const volume = event.target.value;
             SoundBoard.setVolume(volume);
         });
     } else {
         console.error("Volume slider element with ID 'soundboard-volume' not found.");
     }


    // Context Selector Change Event
    const contextSelector = document.getElementById('contextSelector');
    if (contextSelector) {
        contextSelector.addEventListener('change', function() {
            BackgroundMusic.setContext(this.value);
        });
    } else {
        console.error("Context selector element with ID 'contextSelector' not found.");
    }

    document.getElementById('soundTypeSelector').addEventListener('change', function() {
        const selectedSoundType = this.value;
        if(isAdminEditVisible)
            displaySoundsAdmin(selectedSoundType);
        else
            displaySoundsUser(selectedSoundType);
    });

    // Function to toggle between site music and Spotify
    async function toggleMusicSource() {
        if (useSpotify) {
            // Switch back to site music
            useSpotify = false;
            musicSourceLabel.textContent = 'Site Music';
            musicSourceToggle.innerHTML = '<i class="fab fa-spotify"></i> Switch to Spotify';
            musicSourceToggle.classList.remove('button-primary-active');
            
            // Stop any Spotify playback
            if (spotifyService.isAuthenticated()) {
                spotifyService.pause();
            }
            
            // Show site music controls
            document.getElementById('progressBar').style.display = 'block';
            document.getElementById('nextButton').style.display = 'block';
            
            // Show background music manager
            const backgroundMusicSection = document.getElementById('background-music');
            if (backgroundMusicSection) {
                backgroundMusicSection.style.display = 'block';
            }
            
            console.log('Switched to Site Music');
        } else {
                         // Switch to Spotify - automatically connect if not authenticated
             if (!spotifyService.isAuthenticated()) {
                 try {
                     // Show loading state
                     musicSourceToggle.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                     musicSourceToggle.disabled = true;
                     
                     // Get the auth URL (await the Promise)
                     const authUrl = await spotifyService.getAuthUrl();
                     console.log('Redirecting to Spotify auth from music source toggle:', authUrl);
                     
                     // Redirect to Spotify auth
                     window.location.href = authUrl;
                     return; // Don't continue, page will redirect
                 } catch (error) {
                     console.error('Error connecting to Spotify:', error);
                     alert('Failed to connect to Spotify. Please try again.');
                     musicSourceToggle.innerHTML = '<i class="fab fa-spotify"></i> Switch to Spotify';
                     musicSourceToggle.disabled = false;
                     return;
                 }
             }
            
            // If already authenticated, switch to Spotify
            useSpotify = true;
            musicSourceLabel.textContent = 'Spotify';
            musicSourceToggle.innerHTML = '<i class="fas fa-music"></i> Switch to Site Music';
            musicSourceToggle.classList.add('button-primary-active');
            
            // Hide site music controls when using Spotify
            document.getElementById('progressBar').style.display = 'none';
            document.getElementById('nextButton').style.display = 'none';
            
            // Hide background music manager
            const backgroundMusicSection = document.getElementById('background-music');
            if (backgroundMusicSection) {
                backgroundMusicSection.style.display = 'none';
            }
            
            // Sync background music volume with Spotify volume
            const backgroundMusicVolumeSlider = document.getElementById('music-volume');
            if (backgroundMusicVolumeSlider) {
                const currentVolume = backgroundMusicVolumeSlider.value;
                // Update Spotify volume to match current background music volume
                if (spotifyService.isAuthenticated()) {
                    spotifyService.setVolume(currentVolume);
                }
            }
            
            console.log('Switched to Spotify');
        }
        
        // Save preference to localStorage
        localStorage.setItem('music_source_preference', useSpotify ? 'spotify' : 'site');
    }
    
    // Load music source preference from localStorage
    function loadMusicSourcePreference() {
        const preference = localStorage.getItem('music_source_preference');
        if (preference === 'spotify') {
            useSpotify = true;
            musicSourceLabel.textContent = 'Spotify';
            musicSourceToggle.innerHTML = '<i class="fas fa-music"></i> Switch to Site Music';
            musicSourceToggle.classList.add('button-primary-active');
            
            // Hide site music controls
            document.getElementById('progressBar').style.display = 'none';
            document.getElementById('nextButton').style.display = 'none';
            
            // Hide background music manager
            const backgroundMusicSection = document.getElementById('background-music');
            if (backgroundMusicSection) {
                backgroundMusicSection.style.display = 'none';
            }
            
            // Sync background music volume with Spotify volume
            const backgroundMusicVolumeSlider = document.getElementById('music-volume');
            if (backgroundMusicVolumeSlider) {
                const currentVolume = backgroundMusicVolumeSlider.value;
                // Update Spotify volume to match current background music volume
                if (spotifyService.isAuthenticated()) {
                    spotifyService.setVolume(currentVolume);
                }
            }
            
            // Update Spotify toggle button text if authenticated
            if (spotifyService.isAuthenticated()) {
                const spotifyToggleButton = document.getElementById('spotify-toggle-button');
                if (spotifyToggleButton) {
                    spotifyToggleButton.innerHTML = '<i class="fab fa-spotify"></i> Toggle Spotify';
                }
            }
        }
    }
    
    // Check if returning from Spotify auth and auto-switch
    async function checkSpotifyAuthReturn() {
        console.log('Main.js: Checking Spotify auth return...');
        
        // Check if we have search params (returning from auth)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('code') || urlParams.has('state')) {
            console.log('Main.js: Found auth callback params, processing...');
            
            try {
                // Handle the auth callback
                const authResult = await spotifyService.handleAuthCallback();
                if (authResult) {
                    console.log('Main.js: Spotify auth successful');
                    // The spotifyAuthenticated event will handle UI updates
                } else {
                    console.log('Main.js: Spotify auth failed or incomplete');
                }
            } catch (error) {
                console.error('Main.js: Error handling Spotify auth callback:', error);
            }
        } else {
            console.log('Main.js: No search params in URL, skipping auth callback');
        }
        
        // Check if we should auto-switch to Spotify mode
        if (spotifyService.isAuthenticated() && !useSpotify) {
            // User just returned from Spotify auth, auto-switch to Spotify mode
            useSpotify = true;
            musicSourceLabel.textContent = 'Spotify';
            musicSourceToggle.innerHTML = '<i class="fas fa-music"></i> Switch to Site Music';
            musicSourceToggle.classList.add('button-primary-active');
            
            // Hide site music controls
            document.getElementById('progressBar').style.display = 'none';
            document.getElementById('nextButton').style.display = 'none';
            
            // Hide background music manager
            const backgroundMusicSection = document.getElementById('background-music');
            if (backgroundMusicSection) {
                backgroundMusicSection.style.display = 'none';
            }
            
            // Sync background music volume with Spotify volume
            const backgroundMusicVolumeSlider = document.getElementById('music-volume');
            if (backgroundMusicVolumeSlider) {
                const currentVolume = backgroundMusicVolumeSlider.value;
                // Update Spotify volume to match current background music volume
                if (spotifyService.isAuthenticated()) {
                    spotifyService.setVolume(currentVolume);
                }
            }
            
            // Update Spotify toggle button text
            const spotifyToggleButton = document.getElementById('spotify-toggle-button');
            if (spotifyToggleButton) {
                spotifyToggleButton.innerHTML = '<i class="fab fa-spotify"></i> Toggle Spotify';
                spotifyToggleButton.disabled = false;
            }
            
            // Save preference
            localStorage.setItem('music_source_preference', 'spotify');
            
            console.log('Auto-switched to Spotify after authentication');
        }
    }
    
    // Function to update Spotify status display
    function updateSpotifyStatusDisplay() {
        const isAuthenticated = spotifyService.isAuthenticated();
        console.log('Main.js: Updating Spotify status display, authenticated:', isAuthenticated);
        
        if (isAuthenticated) {
            // Update UI to show Spotify is connected
            if (spotifyToggleButton) {
                spotifyToggleButton.innerHTML = '<i class="fab fa-spotify"></i> Toggle Spotify';
                spotifyToggleButton.disabled = false;
            }
        } else {
            // Update UI to show Spotify is disconnected
            if (spotifyToggleButton) {
                spotifyToggleButton.innerHTML = '<i class="fab fa-spotify"></i> Connect to Spotify';
                spotifyToggleButton.disabled = false;
            }
        }
    }
    
    // Function to generate buttons dynamically based on sound files
    async function fetchSoundData() {
        try {
            await AmbianceSounds.loadAmbianceButtons();
            await SoundBoard.loadSoundboardButtons();
            await BackgroundMusic.preloadBackgroundSounds();
            GoogleLogin.initGoogleIdentityServices();
            GoogleLogin.updateLoginButton();
            
            // Initialize Spotify UI
            await spotifyUI.init();
            
            // Load music source preference
            loadMusicSourcePreference();
            
            // Check current Spotify auth status
            updateSpotifyStatusDisplay();
            
            // Check if returning from Spotify auth
            await checkSpotifyAuthReturn();
        } catch (error) {
            console.error('Error fetching sound data:', error);
        }
    }

    // Call fetchSoundData
    fetchSoundData();
    
    // Handle Spotify auth callback when page loads
    window.addEventListener('load', async () => {
        console.log('Main.js: Page loaded');
        console.log('Main.js: Current URL:', window.location.href);
        console.log('Main.js: Current search params:', window.location.search);
        
        // Wait a bit for everything to initialize
        setTimeout(async () => {
            console.log('Main.js: Page loaded, checking for Spotify auth callback...');
            await checkSpotifyAuthReturn();
        }, 100);
    });
    
    // Listen for Spotify authentication events
    window.addEventListener('spotifyAuthenticated', async (event) => {
        console.log('Main.js: Spotify authenticated event received');
        
        // Update the music source preference to Spotify
        useSpotify = true;
        localStorage.setItem('music_source_preference', 'spotify');
        
        // Update UI elements
        if (musicSourceLabel) musicSourceLabel.textContent = 'Spotify';
        if (musicSourceToggle) {
            musicSourceToggle.innerHTML = '<i class="fas fa-music"></i> Switch to Site Music';
            musicSourceToggle.classList.add('button-primary-active');
        }
        
        // Hide site music controls
        const progressBar = document.getElementById('progressBar');
        const nextButton = document.getElementById('nextButton');
        if (progressBar) progressBar.style.display = 'none';
        if (nextButton) nextButton.style.display = 'none';
        
        // Hide background music manager
        const backgroundMusicSection = document.getElementById('background-music');
        if (backgroundMusicSection) {
            backgroundMusicSection.style.display = 'none';
        }
        
        // Sync background music volume with Spotify volume
        const backgroundMusicVolumeSlider = document.getElementById('music-volume');
        if (backgroundMusicVolumeSlider) {
            const currentVolume = backgroundMusicVolumeSlider.value;
            // Update Spotify volume to match current background music volume
            if (spotifyService.isAuthenticated()) {
                spotifyService.setVolume(currentVolume);
            }
        }
        
        // Update Spotify toggle button
        if (spotifyToggleButton) {
            spotifyToggleButton.innerHTML = '<i class="fab fa-spotify"></i> Toggle Spotify';
            spotifyToggleButton.disabled = false;
        }
        
        // Update status display
        updateSpotifyStatusDisplay();
        
        // Show success message
        if (window.spotifyUI && window.spotifyUI.container) {
            const successDiv = document.createElement('div');
            successDiv.className = 'spotify-success';
            successDiv.textContent = '✅ Successfully connected to Spotify!';
            successDiv.style.color = 'green';
            successDiv.style.padding = '10px';
            successDiv.style.margin = '10px 0';
            successDiv.style.backgroundColor = '#e8f5e8';
            successDiv.style.borderRadius = '4px';
            successDiv.style.textAlign = 'center';
            successDiv.style.fontWeight = 'bold';
            
            window.spotifyUI.container.insertBefore(successDiv, window.spotifyUI.container.firstChild);
            
            // Remove success message after 5 seconds
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.parentNode.removeChild(successDiv);
                }
            }, 5000);
        }
        
        console.log('Main.js: UI updated after Spotify authentication');
    });
    
         window.addEventListener('spotifyAuthError', (event) => {
         console.error('Main.js: Spotify auth error event received:', event.detail);
         
         // Show user-friendly error message
         const errorMessage = event.detail?.error || 'Unknown error';
         alert(`Spotify Authentication Error: ${errorMessage}`);
     });
     
     // Listen for music source toggle from Spotify UI
     window.addEventListener('toggleMusicSource', () => {
         toggleMusicSource();
     });
});

// Initialize modal functionalities
initModals();