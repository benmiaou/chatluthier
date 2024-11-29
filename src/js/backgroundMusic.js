// src/js/backgroundMusic.js

import { AudioPlayer } from './audioPlayer.js'; // Adjust the path based on your directory structure
import { PreLoader } from './preloader.js';
import { sendBackgroundVolumeChangeMessage, sendBackgroundMusicChangeMessage, sendBackgroundStopMessage } from './socket-client.js';
import { GoogleLogin } from './googleLogin.js'; // Adjust the path if necessary

export class AudioManager {
    constructor() {
        this.audioPlayer = new AudioPlayer(); // Now AudioPlayer is defined
        this.currentButton = null;
        this.isProcessing = false;
    }

    getPlayer() {
        return this.audioPlayer.getPlayer();
    }

    async playSound(fileOrHandle, type) {
        this.isProcessing = true;
        this.stop(); // Stop any currently playing audio

        this.currentButton = document.getElementById(type + 'Button'); 
        this.currentButton.classList.add('button-play');
        this.currentButton.classList.remove('button-stop');

        const audioUrl = "assets/background/" + fileOrHandle.filename;
        this.updateCredit(fileOrHandle.credit);
        await this.audioPlayer.playSound(audioUrl);
        this.audioPlayer.play();
        this.isProcessing = false;
    }

    preload(fileOrHandle) {
        const audioUrl = "assets/background/" + fileOrHandle.filename;
        PreLoader.enqueueFetch(audioUrl);
    }

    setOnEndedCallback(callback) {
        this.audioPlayer.setOnEndedCallback(callback);
    }

    stop(sendEvent = false) {
        if(this.audioPlayer.isPlaying) {
            this.audioPlayer.stop();
            console.log("Playback has been stopped.");
        }
       
        this.updateCredit("---");
        if(this.currentButton) {
            this.currentButton.classList.remove('button-play');
            this.currentButton.classList.add('button-stop');
            this.currentButton = null;
        }
        if(sendEvent) sendBackgroundStopMessage();
    }

    setVolume(level) {
        this.audioPlayer.setVolume(level);
    }

    isCurrentlyPlaying() {
        return  this.audioPlayer.isPlaying;
    }

    updateCredit(credit) {
        const creditTitle = document.getElementById('background-music-Credit');
        if (creditTitle) {
            creditTitle.innerHTML = credit;
        }
    }
}

export const BackgroundMusic = {
    DEFAULT_CONTEXT : "default",
    type: null,
    context : "default",
    backgroundMusicArray : [],
    soundIndex : 0,
    audioManager: new AudioManager(), // Initialize AudioManager
    isClickable : true,

    getPlayer() {
        return this.audioManager.getPlayer();
    },

    setBackgroundVolume(volume) {
        const gainValue = volume / 100;
        this.audioManager.setVolume(gainValue);
        // **Send message to other clients about the volume change**
        sendBackgroundVolumeChangeMessage(gainValue);
    },

    init () {
        this.audioManager.setOnEndedCallback(() => {
            this.backGroundSoundLoop();
        });
    },

    addOptionTocontextSelector(subType) {
        const contextSelector = document.getElementById('contextSelector');
        const option = document.createElement('option');
        option.value = subType;
        option.textContent = subType;
        contextSelector.appendChild(option);
    },

    updateContexts() {
        const uniqueOptions = new Set(); // Set for unique options excluding "default"
        uniqueOptions.add(this.DEFAULT_CONTEXT);
    
        // Add new contexts to uniqueOptions
        for (let music of this.backgroundMusicArray) {
            for (let [type, context] of music.contexts) { 
                if (!uniqueOptions.has(context)) {
                    uniqueOptions.add(context);
                }
            }
        }
    
        // Convert uniqueOptions to an array and sort alphabetically
        let sortedOptions = Array.from(uniqueOptions).sort((a, b) => a.localeCompare(b));
    
        // Ensure "default" stays at the top
        if (sortedOptions.includes(this.DEFAULT_CONTEXT)) {
            sortedOptions = sortedOptions.filter(opt => opt !== this.DEFAULT_CONTEXT);
            sortedOptions.unshift(this.DEFAULT_CONTEXT);
        }
    
        // Clear the contextSelector and add sorted options
        contextSelector.innerHTML = ""; // Clear existing options
        for (let option of sortedOptions) {
            this.addOptionTocontextSelector(option);
        }
    },

    async stopReceivedBackgroundSound(musicData) {
        this.audioManager.stop();
    },

    async playReceivedBackgroundSound(musicData) {
        console.log("Playing " + musicData)
        // Stop current playback
        if (this.audioManager.isCurrentlyPlaying()) {
            this.audioManager.stop();
        }
    
        // Update the type and context
        this.type = musicData.type;
        this.context = musicData.context;
        this.filesToPlay = this.findSoundsByTypeAndContext();
    
        // Find the specific file to play
        const fileToPlay = this.filesToPlay.find(file => file.filename === musicData.filename);
    
        if (fileToPlay) {
            // Update soundIndex to the correct position
            this.soundIndex = this.filesToPlay.indexOf(fileToPlay);
    
            // Play the received sound
            console.log("Playing " + fileToPlay)
            await this.audioManager.playSound(fileToPlay, this.type);
    
            // Update the credit information
            this.audioManager.updateCredit(musicData.credit);
        } else {
            console.error('Received music file not found in playlist:', musicData.filename);
        }
    },

    setVolumeFromSocket(level) {
        this.audioManager.setVolume(level);
        const volumeSlider = document.getElementById('music-volume');
        if (volumeSlider) {
            volumeSlider.value = level*100;
        }
    },
    
    async preloadBackgroundSounds() {
        try {
            let response;
            if (GoogleLogin.userId) 
            {
                response = await fetch(`/backgroundMusic?userId=${GoogleLogin.userId}`);
            }
            else
            {
                response = await fetch(`/backgroundMusic`);
            }
            this.backgroundMusicArray = await response.json();
            this.backgroundMusicArray = this.shuffleArray(this.backgroundMusicArray);
            this.updateContexts();
        } catch (e) {
            console.error(`Error fetching files from server:`, e);
        }
    },

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    findSoundsByTypeAndContext() {
        if (!Array.isArray(this.backgroundMusicArray)) {
            throw new Error("Input data is not an array.");
        }
    
        if (this.context !== this.DEFAULT_CONTEXT) {
            return this.backgroundMusicArray.filter(sound =>
                sound.contexts.some(([type, context]) => type === this.type && context === this.context)
            );
        } else {
            return this.backgroundMusicArray.filter(sound =>
                sound.contexts.some(([type]) => type === this.type)
            );
        }
    },

    backGroundSoundLoop() {
        if (this.soundIndex >= this.filesToPlay.length) {
            this.soundIndex = 0;  // Reset index if it exceeds the array
        }
        let fileToPlay = this.filesToPlay[this.soundIndex];
        if(fileToPlay)
            this.audioManager.playSound(fileToPlay, this.type);
        // **Send message to other clients about the music change**
        sendBackgroundMusicChangeMessage({
            filename: fileToPlay.filename,
            type: this.type,
            context: this.context,
            credit: fileToPlay.credit,
        });

        //Preload next
        this.soundIndex++;
        fileToPlay = this.filesToPlay[this.soundIndex];
        if(fileToPlay)
            this.audioManager.preload(fileToPlay)
    },

    // Function to capitalize the first letter of a string
    capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1); // Capitalize first letter, keep rest unchanged
    },

    capitalize(str) {
        return str.toUpperCase(); // Capitalize first letter, keep rest unchanged
    },

    updateButton(typeName) {
        let result = this.backgroundMusicArray.filter(sound =>
            sound.contexts.some(([type, context]) => type === typeName && context === this.context)
        );
    
        let button = document.getElementById(typeName + 'Button');
        if (result.length === 0) {
            button.disabled = true; // Disable the button if the array is empty
            button.classList.add('disabledMusicButton');
            button.querySelector('span').textContent = this.capitalize(typeName) + " (0)";
        } else {
            button.disabled = false; // Enable the button if the array is not empty
            button.classList.remove('disabledMusicButton');
            button.querySelector('span').textContent = this.capitalize(typeName) + " (" + result.length + ")";
        }
    },

    setContext(newContext) {
        this.context = newContext;
        this.filesToPlay =  this.findSoundsByTypeAndContext();
        this.updateButton("calm")
        this.updateButton("dynamic")
        this.updateButton("intense")
        if(this.audioManager.isCurrentlyPlaying()) {
            if(this.filesToPlay.length == 0) {
                this.audioManager.stop(true);
            }
            else {
                this.audioManager.stop();
                this.backGroundSoundLoop();
            }
        }
    },

    // Function to get the filename from a file path or a file handle
    getFilename(fileOrHandle) {
        if (typeof fileOrHandle === 'string') {
            // If it's a file path, extract the filename
            return fileOrHandle.split('/').pop(); // Get the last segment
        } else if (fileOrHandle.name) {
            // If it's a file handle, use the .name property
            return fileOrHandle.name;
        } else {
            throw new Error('Unknown file type');
        }
    },


    async playBackgroundSound(type) {
        if (this.audioManager.isProcessing || !this.isClickable) return;
        this.isClickable = false;
        setTimeout(() => {
            this.isClickable = true;
        }, 250);
        if (this.audioManager.isCurrentlyPlaying()) {
            this.audioManager.stop(true);
            if (type === this.type) return;
        }
        this.type = type;
        this.filesToPlay = this.findSoundsByTypeAndContext();
        if (this.filesToPlay.length == 0) {
            return;
        }
        this.backGroundSoundLoop();
    
        // **Send message to other clients about the music change**
        const currentFile = this.filesToPlay[this.soundIndex - 1];
        sendBackgroundMusicChangeMessage({
            filename: currentFile.filename,
            type: this.type,
            context: this.context,
            credit: currentFile.credit,
        });
    }
}

BackgroundMusic.init();