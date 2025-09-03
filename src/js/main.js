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
        spotifyToggleButton.addEventListener('click', function() {
            // If not authenticated, connect to Spotify
            if (!spotifyService.isAuthenticated()) {
                try {
                    // Show loading state
                    spotifyToggleButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                    spotifyToggleButton.disabled = true;
                    
                    // Redirect to Spotify auth
                    window.location.href = spotifyService.getAuthUrl();
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
         volumeSlider.addEventListener('input', function(event) {
             const volume = event.target.value;
             BackgroundMusic.setBackgroundVolume(volume);
         });
     } else {
         console.error("Volume slider element with ID 'music-volume' not found.");
     }

    // **Volume Slider Change Event**
    const soundboardSlider = document.getElementById('soundboard-volume');
    if (soundboardSlider) {
        soundboardSlider.addEventListener('input', function(event) {
            const volume = event.target.value;
            SoundBoard.setVolume(volume);
        });
    } else {
        console.error("Volume slider element with ID soundboardSlider' not found.");
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
            
            console.log('Switched to Site Music');
        } else {
            // Switch to Spotify - automatically connect if not authenticated
            if (!spotifyService.isAuthenticated()) {
                try {
                    // Show loading state
                    musicSourceToggle.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                    musicSourceToggle.disabled = true;
                    
                    // Redirect to Spotify auth
                    window.location.href = spotifyService.getAuthUrl();
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
    function checkSpotifyAuthReturn() {
        if (spotifyService.isAuthenticated() && !useSpotify) {
            // User just returned from Spotify auth, auto-switch to Spotify mode
            useSpotify = true;
            musicSourceLabel.textContent = 'Spotify';
            musicSourceToggle.innerHTML = '<i class="fas fa-music"></i> Switch to Site Music';
            musicSourceToggle.classList.add('button-primary-active');
            
            // Hide site music controls
            document.getElementById('progressBar').style.display = 'none';
            document.getElementById('nextButton').style.display = 'none';
            
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
    
    // Function to generate buttons dynamically based on sound files
    async function fetchSoundData() {
        try {
            await AmbianceSounds.loadAmbianceButtons();
            await SoundBoard.loadSoundboardButtons();
            await BackgroundMusic.preloadBackgroundSounds();
            GoogleLogin.initGoogleIdentityServices();
            GoogleLogin.updateLoginButton();
            
            // Load music source preference
            loadMusicSourcePreference();
            
            // Check if returning from Spotify auth
            checkSpotifyAuthReturn();
        } catch (error) {
            console.error('Error fetching sound data:', error);
        }
    }

    // Call fetchSoundData
    fetchSoundData();
});

// Initialize modal functionalities
initModals();