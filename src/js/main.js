// src/js/main.js

import '../css/styles.css'; // Adjust the path based on your project structure
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
import { openEditSoundModal,  closeEditSoundModal } from  './editSounds.js';
import './socket-client.js';

// Initialize and attach to window if necessary (for inline handlers)
const audioPlayer = new AudioPlayer();
window.AudioPlayer = audioPlayer;

const audioManager = new AudioManager(); // Corrected variable name
window.AudioManager = audioManager;

// Add Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const calmButton = document.getElementById('calmButton');
    const dynamicButton = document.getElementById('dynamicButton');
    const intenseButton = document.getElementById('intenseButton');
    const nextButton = document.getElementById('nextButton');
    const resetAmbient = document.getElementById('resetAmbient');
    const openEditSoundModalButton = document.getElementById('openEditSoundModal');
    const toggleMenuButton = document.getElementById('toggleMenu');
    const closeExternalModalButton = document.getElementById('closeExternalModal');
    const closeModalButton = document.getElementById('closeModal');
    const closeEditSoundModalButton = document.getElementById('closeEditSoundModal');
    const showAllCreditsButton = document.getElementById('showAllCredits');
    
    if (calmButton) {
        calmButton.addEventListener('click', function() {
            BackgroundMusic.playBackgroundSound('calm', this);
        });
    }

    if (dynamicButton) {
        dynamicButton.addEventListener('click', function() {
            BackgroundMusic.playBackgroundSound('dynamic', this);
        });
    }

    if (intenseButton) {
        intenseButton.addEventListener('click', function() {
            BackgroundMusic.playBackgroundSound('intense', this);
        });
    }
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            BackgroundMusic.backGroundSoundLoop();
        });
    }
    if (resetAmbient) {
        resetAmbient.addEventListener('click', function() {
            AmbianceSounds.resetAmbientSounds();
        });
    }
    if (openEditSoundModalButton) {
        openEditSoundModalButton.addEventListener('click', function() {
            openEditSoundModal();
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
            closeEditSoundModal();
        });
    }
    if (showAllCreditsButton) {
        showAllCreditsButton.addEventListener('click', function() {
            showAllCredits();
        });
    }
    

    // Integrate the new script functionalities here
    const audio = BackgroundMusic.getPlayer();
    const progressBar = document.getElementById('progressBar');
    const progress = document.getElementById('progress');

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


    // Context Selector Change Event
    const contextSelector = document.getElementById('contextSelector');
    if (contextSelector) {
        contextSelector.addEventListener('change', function() {
            BackgroundMusic.setContext(this.value);
        });
    } else {
        console.error("Context selector element with ID 'contextSelector' not found.");
    }

    // Function to generate buttons dynamically based on sound files
    async function fetchSoundData() {
        try {
            await AmbianceSounds.loadAmbianceButtons();
            await SoundBoard.loadSoundboardButtons();
            await BackgroundMusic.preloadBackgroundSounds();
            GoogleLogin.initGoogleIdentityServices();
            GoogleLogin.updateLoginButton();
        } catch (error) {
            console.error('Error fetching sound data:', error);
        }
    }

    // Call fetchSoundData
    fetchSoundData();
});

// Initialize modal functionalities
initModals();