// src/js/soundboard.js
import { GoogleLogin } from './googleLogin.js'; // Adjust the path if necessary
import { AudioPlayer } from './audioPlayer.js';
import { createModal } from './modalCredits.js'; // Import createModal
import { sendPlaySoundboardSoundMessage } from './socket-client.js'

export const SoundBoard = {
    soundboardList: {},
    audioContext: null,
    currentVolume: 0.5,
    soundboardItems: null,
    selectedContext: "All",

    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    },

    async loadSoundboardButtons() {
        try {
            // Load the main soundboard file
            let mainResponse = await fetch('/soundboard');
            let mainSoundboardItems = await mainResponse.json();
    
            // If the user is logged in, load the user-specific soundboard file
            let userSoundboardItems = [];
            if (GoogleLogin.userId) {
                let userResponse = await fetch(`/soundboard?userId=${GoogleLogin.userId}`);
                userSoundboardItems = await userResponse.json();
            }
    
            // Merge the user-specific changes with the main soundboard items
            const soundboardItems = mainSoundboardItems.map(mainSound => {
                const userSound = userSoundboardItems.find(userSound => userSound.filename === mainSound.filename);
                if (userSound) {
                    // Apply user-specific contexts and isEnabled status
                    return {
                        ...mainSound,
                        contexts: userSound.contexts,
                        isEnabled: userSound.isEnabled
                    };
                }
                return mainSound;
            });
    
            // Generate soundboard buttons using the merged soundboard items
            this.soundboardItems = soundboardItems;
            this.generateSoundboardButtons(this.soundboardItems);
        } catch (e) {
            console.error(`Error fetching files from server:`, e);
        }
    },
    

    updateContexts() {
        // Update context-related logic if any
    },

    generateSoundboardButtons(soundboardItems) {
        const section = document.getElementById("soundboard");
        section.innerHTML = '';  // Clear existing content

        soundboardItems.forEach(soundboardItem => {
            if (soundboardItem.isEnabled === undefined) {
                soundboardItem.isEnabled = true;
            }
        
            if (!soundboardItem.isEnabled) return;
            // Create a button for each soundboard item
            const button = document.createElement('button');
            button.textContent = soundboardItem.display_name;

            // Create an AudioPlayer instance
            let audioPlayer = new AudioPlayer();
           
            // Set the on ended callback for the audio player
            audioPlayer.setOnEndedCallback(() => {
                if (!audioPlayer.isLooping()) {
                    button.classList.remove('button-primary-active');
                    button.classList.add('button-primary');
                }
            });

            // Function to handle the click event
            const handleClick = () => {
                // First click: start playing the audio
                if(!audioPlayer.isReady())audioPlayer.playSound("assets/soundboard/" + soundboardItem.filename, true);
               
                audioPlayer.play();
                button.classList.add('button-primary-active');
                button.classList.remove('button-primary'); 
                createModal(soundboardItem.credit); 

                // Send WebSocket message to notify other clients
                if (sendPlaySoundboardSoundMessage) {
                    sendPlaySoundboardSoundMessage(soundboardItem.filename);
                }
            };

            // Attach the click event handler to the button
            button.addEventListener('click', handleClick);

            // Set the initial classes for the button
            button.classList.add('button-primary', 'button');

            // Store the audio player instance in the soundboard list
            this.soundboardList[soundboardItem.display_name] = audioPlayer;

            // Append the button to the section
            section.appendChild(button);
        });
    },

    setVolume(volume) {
        const gainValue = volume / 100;
        this.currentVolume = gainValue;
        Object.values(this.soundboardList).forEach(sound => {
            sound.setVolume(gainValue);
        });
    },

    /**
     * Plays a soundboard item triggered by a remote message.
     * @param {string} filename - The filename of the sound to play.
     */
    playSoundRemote(filename) {
        // Find the soundboard item by filename
        const soundboardItem = this.soundboardItems.find(item => item.filename === filename);
        if (!soundboardItem) {
            console.warn(`Soundboard item with filename "${filename}" not found.`);
            return;
        }

        const audioPlayer = this.soundboardList[soundboardItem.display_name];
        if (!audioPlayer) {
            console.warn(`AudioPlayer for "${soundboardItem.display_name}" not found.`);
            return;
        }

        // Play the sound without sending a WebSocket message
        if(!audioPlayer.isReady())audioPlayer.playSound("assets/soundboard/" + soundboardItem.filename, true);
        audioPlayer.play();
        
        // Optionally, update the button UI to reflect the play state
        const buttons = document.querySelectorAll('#soundboard button');
        buttons.forEach(button => {
            if (button.textContent === soundboardItem.display_name) {
                button.classList.add('button-primary-active');
                button.classList.remove('button-primary');
            }
        });
    }
};
