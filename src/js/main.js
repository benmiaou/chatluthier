// src/js/main.js
import '../css/tailwind.css';

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
import { svgPause, svgDefault } from './constants.js'

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
    const gradientSlider = document.getElementById('music-volume');

    if (gradientSlider) {
        gradientSlider.addEventListener('input', function () {
            const value = gradientSlider.value;

        // Update the background
    gradientSlider.style.background = `
        linear-gradient(to right, 
        #ec4899 0%, 
        #a855f7 ${value}%, 
        #a855f7 ${value}%, 
        #3b82f6 ${value}%, 
        #e2e8f0 ${value}%)
    `;
    });}


    function handleButtonClick(button, soundType, spanClassToggles, otherButtons, svgPause, svgDefault) {
        if (button) {
            button.addEventListener('click', function () {
                // Play the background sound
                BackgroundMusic.playBackgroundSound(soundType, this);

                // Reset toggles and SVGs on other buttons
                otherButtons.forEach(otherButton => {
                    const otherSpan = otherButton.querySelector('span');
                    const otherSvg = otherButton.querySelector('svg');

                    // Remove toggled classes
                    if (otherSpan) {
                        spanClassToggles.forEach(className => {
                            otherSpan.classList.remove(className);
                        });
                    }

                    // Revert SVG to the default icon
                    if (otherSvg) {
                        otherSvg.outerHTML = svgDefault;
                    }
                });

                // Toggle classes on the clicked button's span
                const spanChild = button.querySelector('span');
                if (spanChild) {
                    spanClassToggles.forEach(className => {
                        spanChild.classList.toggle(className);
                    });
                }

                // Change the SVG to the "pause" icon
                const svgChild = button.querySelector('svg');
                if (svgChild) {
                    svgChild.outerHTML = svgPause;
                }
            });
        }
    }

    // Attach event listeners with reset logic for other buttons
    // Attach event listeners with reset logic and SVG updates
    handleButtonClick(
        calmButton,
        'calm',
        ['neon', 'animate-gradient-move', 'font-medium', 'font-black'],
        [dynamicButton, intenseButton],
        svgPause,
        svgDefault
    );

    handleButtonClick(
        dynamicButton,
        'dynamic',
        ['neon', 'animate-gradient-move', 'font-medium', 'font-black'],
        [calmButton, intenseButton],
        svgPause,
        svgDefault
    );

    handleButtonClick(
        intenseButton,
        'intense',
        ['neon', 'animate-gradient-move', 'font-medium', 'font-black'],
        [calmButton, dynamicButton],
        svgPause,
        svgDefault
    );


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