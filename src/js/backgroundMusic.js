// src/js/backgroundMusic.js

import { AudioPlayer } from './audioPlayer.js'; // Adjust the path based on your directory structure
import { PreLoader } from './preloader.js';
import { sendBackgroundMusicChangeMessage, sendBackgroundStopMessage } from './socket-client.js';
import { GoogleLogin } from './googleLogin.js'; // Adjust the path if necessary

export class AudioManager {
    constructor() {
        this.audioPlayer = new AudioPlayer(); // Now AudioPlayer is defined
        this.currentButton = null;
        this.isProcessing = false;
        this.debounceTimeout = null; // Debounce timeout for network messages
    }

    getPlayer() {
        return this.audioPlayer.getPlayer();
    }

    async playSound(fileOrHandle, type) {
        this.isProcessing = true;

        // Debounce network-initiated playback requests
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        this.debounceTimeout = setTimeout(async () => {
            this.stop(); // Stop any currently playing audio

            this.currentButton = document.getElementById(type + 'Button');
            if (this.currentButton) {
                this.currentButton.classList.add('button-primary-active');
                this.currentButton.classList.remove('button-primary');
            }

            const audioUrl = "assets/background/" + fileOrHandle.filename;
            this.updateCredit(fileOrHandle.credit);
            await this.audioPlayer.playSound(audioUrl, false);
            this.audioPlayer.play();
            this.isProcessing = false;
        },100); // Debounce delay for network requests
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
            this.currentButton.classList.remove('button-primary-active');
            this.currentButton.classList.add('button-primary');
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
    type: null,
    context: "default",
    backgroundMusicArray: [],
    soundIndex: 0,
    audioManager: new AudioManager(),
    isClickable: true,
    isFirstSender: false,

    getPlayer() {
        return this.audioManager.getPlayer();
    },

    setBackgroundVolume(volume) {
        const gainValue = volume / 100;
        this.audioManager.setVolume(gainValue);
    },

    init() {
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
        const uniqueOptions = new Set();

        for (let music of this.backgroundMusicArray) {
            for (let [type, context] of music.contexts) {
                if (!uniqueOptions.has(context)) {
                    uniqueOptions.add(context);
                }
            }
        }

        let sortedOptions = Array.from(uniqueOptions).sort((a, b) => a.localeCompare(b));

        const contextSelector = document.getElementById('contextSelector');
        contextSelector.innerHTML = "";
        for (let option of sortedOptions) {
            this.addOptionTocontextSelector(option);
        }
        this.setContext(sortedOptions[0]);
    },

    async stopReceivedBackgroundSound(musicData) {
        this.audioManager.stop();
    },

    async playReceivedBackgroundSound(musicData) {
        console.log("Playing " + musicData);

        if (this.audioManager.isCurrentlyPlaying()) {
            this.audioManager.stop();
        }

        this.type = musicData.type;
        this.context = musicData.context;
        this.filesToPlay = this.findSoundsByTypeAndContext();

        const fileToPlay = this.filesToPlay.find(file => file.filename === musicData.filename);

        if (fileToPlay) {
            this.soundIndex = this.filesToPlay.indexOf(fileToPlay);

            console.log("Playing " + fileToPlay);
            await this.audioManager.playSound(fileToPlay, this.type);

            this.audioManager.updateCredit(musicData.credit);

            this.updateButton("calm");
            this.updateButton("dynamic");
            this.updateButton("intense");
            this.updateButton("all");

            const contextSelector = document.getElementById('contextSelector');
            contextSelector.value = this.context;
        } else {
            console.error('Received music file not found in playlist:', musicData.filename);
        }
    },

    async preloadBackgroundSounds() {
        try {
            // Load the main background music file
            let mainResponse = await fetch('/backgroundMusic');
            let mainBackgroundMusic = await mainResponse.json();
    
            // If the user is logged in, load the user-specific background music file
            let userBackgroundMusic = [];
            if (GoogleLogin.userId) {
                let userResponse = await fetch(`/backgroundMusic?userId=${GoogleLogin.userId}`);
                userBackgroundMusic = await userResponse.json();
            }
    
            // Merge the user-specific changes with the main background music
            const backgroundMusicArray = mainBackgroundMusic.map(mainSound => {
                const userSound = userBackgroundMusic.find(userSound => userSound.filename === mainSound.filename);
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
    
            // Shuffle the merged background music array
            this.backgroundMusicArray = this.shuffleArray(backgroundMusicArray);
    
            // Update contexts using the merged background music array
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
    
        return this.backgroundMusicArray.filter(sound => {
            // Check if the sound's contexts match the type and context
            return sound.contexts.some(([type, context]) => {
                const typeMatches = type === this.type || this.type === "all";
                const contextMatches = context === this.context;
                const isEnabledMatches = sound.isEnabled !== false; // Ensure the sound is enabled
                return typeMatches && contextMatches && isEnabledMatches;
            });
        });
    },

    backGroundSoundLoop() {
        if (this.soundIndex >= this.filesToPlay.length) {
            this.soundIndex = 0;
        }
        let fileToPlay = this.filesToPlay[this.soundIndex];
        if (fileToPlay) {
            this.audioManager.playSound(fileToPlay, this.type);
        }
        console.log("sendBackgroundMusicChangeMessage");
        sendBackgroundMusicChangeMessage({
            filename: fileToPlay.filename,
            type: this.type,
            context: this.context,
            credit: fileToPlay.credit,
        });

        this.soundIndex++;
        fileToPlay = this.filesToPlay[this.soundIndex];
        if (fileToPlay) {
            this.audioManager.preload(fileToPlay);
        }
    },

    capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    updateButton(typeName) {
        let result = this.backgroundMusicArray.filter(sound =>
            (sound.isEnabled || sound.isEnabled === undefined) && // Check if the sound is enabled
            sound.contexts.some(([type, context]) => (type === typeName || typeName === "all") && context === this.context)
        );
    
        let button = document.getElementById(typeName + 'Button');
        if (result.length === 0) {
            button.disabled = true;
            button.textContent = "Play " + this.capitalizeFirstLetter(typeName) + " (0)";
        } else {
            button.disabled = false;
            button.textContent = "Play " + this.capitalizeFirstLetter(typeName) + " (" + result.length + ")";
        }
    },

    setContext(newContext) {
        this.context = newContext;
        this.filesToPlay = this.findSoundsByTypeAndContext();
        this.updateButton("calm");
        this.updateButton("dynamic");
        this.updateButton("intense");
        this.updateButton("all");
        if (this.audioManager.isCurrentlyPlaying()) {
            if (this.filesToPlay.length == 0) {
                this.audioManager.stop(true);
            } else {
                this.audioManager.stop();
                this.backGroundSoundLoop();
            }
        }
    },

    getFilename(fileOrHandle) {
        if (typeof fileOrHandle === 'string') {
            return fileOrHandle.split('/').pop();
        } else if (fileOrHandle.name) {
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
    }
};

BackgroundMusic.init();
