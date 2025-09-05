// src/js/main.js

import '../css/styles.css';
import '../css/spotify.css'; 

import { GoogleLogin } from './googleLogin.js'; // Adjust the path if necessary
import { AudioPlayer } from './audioPlayer.js';
import { AudioManager, BackgroundMusic } from './backgroundMusic.js';
import { AmbianceSounds } from './ambianceSounds.js'; // Ensure default export
import { SoundBoard } from './soundboard.js'; 

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

// Global state for music source - default to site music
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
    const musicSourceContainer = document.getElementById('music-source-container');

    
                                       if (calmButton) {
           calmButton.addEventListener('click', function() {
               BackgroundMusic.playBackgroundSound('calm');
           });
       }
 
                       if (dynamicButton) {
           dynamicButton.addEventListener('click', function() {
               BackgroundMusic.playBackgroundSound('dynamic');
           });
       }
 
                       if (intenseButton) {
           intenseButton.addEventListener('click', function() {
               BackgroundMusic.playBackgroundSound('intense');
           });
       }
                       if (allButton) {
           allButton.addEventListener('click', function() {
               BackgroundMusic.playBackgroundSound('all');
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
                     
                     // Redirect to Spotify auth
                    window.location.href = authUrl;
                    return; // Don't continue, page will redirect
                } catch (error) {
                    console.error('Error connecting to Spotify:', error);
                    alert('Failed to connect to Spotify. Please try again.');
                    spotifyToggleButton.innerHTML = '<i class="fab fa-spotify"></i> Connect to Spotify';
                    spotifyToggleButton.disabled = false;
                    return;
                }
            } else {
                // If already authenticated, disconnect from Spotify
                try {
                    spotifyService.disconnect();
                    updateSpotifyStatusDisplay();
                    // Force back to site music
                    useSpotify = false;
                    localStorage.setItem('music_source_preference', 'site');
                } catch (error) {
                    console.error('Error disconnecting from Spotify:', error);
                }
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

    // Function to update music source UI visibility
    function updateMusicSourceUIVisibility() {
        if (spotifyService.isAuthenticated()) {
            // Show the music source toggle when Spotify is connected
            if (musicSourceContainer) {
                musicSourceContainer.style.display = 'flex';
            }
        } else {
            // Hide the music source toggle when Spotify is not connected
            if (musicSourceContainer) {
                musicSourceContainer.style.display = 'none';
            }
            // Force back to site music when Spotify disconnects
            useSpotify = false;
            if (musicSourceLabel) musicSourceLabel.textContent = 'Site Music';
            if (musicSourceToggle) {
                musicSourceToggle.innerHTML = '<i class="fab fa-spotify"></i> Switch to Spotify';
                musicSourceToggle.classList.remove('button-primary-active');
            }
            
            // Show site music controls
            const progressBar = document.getElementById('progressBar');
            const nextButton = document.getElementById('nextButton');
            if (progressBar) progressBar.style.display = 'block';
            if (nextButton) nextButton.style.display = 'block';
            
            // Show background music manager
            const backgroundMusicSection = document.getElementById('background-music');
            if (backgroundMusicSection) {
                backgroundMusicSection.style.display = 'block';
            }
            
            // Hide Spotify container
            if (spotifyUI.container) {
                spotifyUI.container.style.display = 'none';
            }
        }
    }

    // Function to toggle between site music and Spotify
    async function toggleMusicSource() {
        if (useSpotify) {
            // Switch back to site music
            useSpotify = false;
            if (musicSourceLabel) musicSourceLabel.textContent = 'Site Music';
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
            
            // Hide Spotify container
            if (spotifyUI.container) {
                spotifyUI.container.style.display = 'none';
            }
            
        } else {
            // Switch to Spotify - only if already authenticated
            if (!spotifyService.isAuthenticated()) {
                // Show message that user needs to connect to Spotify first
                alert('Please connect to Spotify first using the Spotify toggle button above.');
                return;
            }
           
            // If already authenticated, switch to Spotify
            useSpotify = true;
            if (musicSourceLabel) musicSourceLabel.textContent = 'Spotify';
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
            
            // Show Spotify UI using the proper method
            spotifyUI.show();
            
            // Sync background music volume with Spotify volume
            const backgroundMusicVolumeSlider = document.getElementById('music-volume');
            if (backgroundMusicVolumeSlider) {
                const currentVolume = backgroundMusicVolumeSlider.value;
                // Update Spotify volume to match current background music volume
                if (spotifyService.isAuthenticated()) {
                    spotifyService.setVolume(currentVolume);
                }
            }
            
            
        }
        
        // Save preference to localStorage
        localStorage.setItem('music_source_preference', useSpotify ? 'spotify' : 'site');
    }
    
         // Load music source preference from localStorage
     function loadMusicSourcePreference() {
         // Always start with site music as default
         useSpotify = false;
         
         // Update UI visibility based on Spotify connection status
         updateMusicSourceUIVisibility();
         
         // Only switch to Spotify if user explicitly had that preference AND Spotify is connected
         const preference = localStorage.getItem('music_source_preference');
         if (preference === 'spotify' && spotifyService.isAuthenticated()) {
             useSpotify = true;
            if (musicSourceLabel) musicSourceLabel.textContent = 'Spotify';
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
            
            // Show Spotify container
            const spotifyContainer = document.getElementById('spotify-container');
            if (spotifyContainer) {
                spotifyContainer.style.display = 'block';
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
        } else {
            // Ensure site music controls are visible
            const progressBar = document.getElementById('progressBar');
            const nextButton = document.getElementById('nextButton');
            if (progressBar) progressBar.style.display = 'block';
            if (nextButton) nextButton.style.display = 'block';
            
            // Ensure background music manager is visible
            const backgroundMusicSection = document.getElementById('background-music');
            if (backgroundMusicSection) {
                backgroundMusicSection.style.display = 'block';
            }
            
            // Hide Spotify container
            const spotifyContainer = document.getElementById('spotify-container');
            if (spotifyContainer) {
                spotifyContainer.style.display = 'none';
            }
            
            // Update UI to show site music mode
            if (musicSourceLabel) musicSourceLabel.textContent = 'Site Music';
            if (musicSourceToggle) {
                musicSourceToggle.innerHTML = '<i class="fab fa-spotify"></i> Switch to Spotify';
                musicSourceToggle.classList.remove('button-primary-active');
            }
        }
        
    }
    
         // Check if returning from Spotify auth and auto-switch
     async function checkSpotifyAuthReturn() {
         // Check if we have search params (returning from auth)
         const urlParams = new URLSearchParams(window.location.search);
         if (urlParams.has('code') || urlParams.has('state')) {
             try {
                 // Handle the auth callback
                 const authResult = await spotifyService.handleAuthCallback();
                 if (authResult) {
                     // The spotifyAuthenticated event will handle UI updates
                 }
             } catch (error) {
                 console.error('Main.js: Error handling Spotify auth callback:', error);
             }
         }
        
        // Don't auto-switch to Spotify - let user choose explicitly
        // Just update the UI visibility based on connection status
        updateMusicSourceUIVisibility();
    }
    
         // Function to update Spotify status display
     function updateSpotifyStatusDisplay() {
         const isAuthenticated = spotifyService.isAuthenticated();
         
         if (isAuthenticated) {
            // Update UI to show Spotify is connected
            if (spotifyToggleButton) {
                spotifyToggleButton.innerHTML = '<i class="fab fa-spotify"></i> Disconnect Spotify';
                spotifyToggleButton.disabled = false;
            }
        } else {
            // Update UI to show Spotify is disconnected
            if (spotifyToggleButton) {
                spotifyToggleButton.innerHTML = '<i class="fab fa-spotify"></i> Connect to Spotify';
                spotifyToggleButton.disabled = false;
            }
        }
        
        // Update music source UI visibility
        updateMusicSourceUIVisibility();
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
         // Wait a bit for everything to initialize
         setTimeout(async () => {
             await checkSpotifyAuthReturn();
         }, 100);
     });
    
         // Listen for Spotify authentication events
     window.addEventListener('spotifyAuthenticated', async (event) => {
         // Don't automatically switch to Spotify - just update UI visibility
         // User can choose to switch manually using the toggle button
         
        // Update UI visibility first
        updateMusicSourceUIVisibility();
        
        // Keep current music source preference (don't force Spotify)
        // Only update UI elements if user was already using Spotify
        if (useSpotify) {
            if (musicSourceLabel) musicSourceLabel.textContent = 'Spotify';
            if (musicSourceToggle) {
                musicSourceToggle.innerHTML = '<i class="fas fa-music"></i> Switch to Site Music';
                musicSourceToggle.classList.add('button-primary-active');
            }
        }
        
        // Only update UI if user was already using Spotify
        if (useSpotify) {
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
            
            // Show Spotify container
            const spotifyContainer = document.getElementById('spotify-container');
            if (spotifyContainer) {
                spotifyContainer.style.display = 'block';
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
        }
        
        // Update Spotify toggle button
        if (spotifyToggleButton) {
            spotifyToggleButton.innerHTML = '<i class="fab fa-spotify"></i> Disconnect Spotify';
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