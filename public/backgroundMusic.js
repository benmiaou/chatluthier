class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.audioContext.createGain(); // Create a GainNode for volume control
        this.gainNode.connect(this.audioContext.destination); // Connect the GainNode to the destination
        this.gainNode.gain.value = 0.5;
        this.sourceNode = null; // Currently active source node
        this.audioBuffer = null; // Buffer holding decoded audio data
        this.isPlaying = false;
        this.startOffset = 0; // Track where playback was paused
        this.onEndedCallback = null; // Custom callback for when playback ends naturally
        this.fetchController = new AbortController(); // For cancelling fetch requests
        this.userStopped = false; // Flag to check if stop was initiated by the user
        this.isProcessing = false; // Flag to check if a song is currently being processed
    }

    async playSound(fileOrHandle) {
        if (this.isProcessing) return; // Early exit if another song is currently being processed
        this.isProcessing = true; // Set processing flag

        const url = "assets/background/" + fileOrHandle.filename;

        // If something is playing or loading, stop it before starting a new sound
        this.stop();

        // Fetch and process the audio
        try {
            const response = await fetch(url, { signal: this.fetchController.signal });
            const arrayBuffer = await response.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            this.createSourceNode();
            this.sourceNode.start(0, this.startOffset % this.audioBuffer.duration);
            this.isPlaying = true;
            this.updateCredit(fileOrHandle.credit);
        } catch (error) {
            console.error("Error fetching or decoding audio:", error);
        }
        this.isProcessing = false; // Reset processing flag after setup is complete
    }

    createSourceNode() {
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        this.sourceNode.connect(this.gainNode); // Connect source to gain node instead of directly to destination
        this.sourceNode.onended = () => {
            if (!this.userStopped) {
                this.isPlaying = false;
                this.startOffset = 0; // Reset start offset when playback finishes naturally
                if (this.onEndedCallback) {
                    this.onEndedCallback(); // Call the registered callback if set
                }
            }
            this.userStopped = false; // Reset the flag after handling onended
        };
    }

    setOnEndedCallback(callback) {
        this.onEndedCallback = callback;
    }

    pause() {
        if (!this.isPlaying || !this.sourceNode) return;

        this.sourceNode.stop();
        this.startOffset += this.audioContext.currentTime;
        this.isPlaying = false;
    }

    resume() {
        if (this.isPlaying || !this.audioBuffer) return;

        this.createSourceNode();
        this.sourceNode.start(0, this.startOffset % this.audioBuffer.duration);
        this.isPlaying = true;
    }

    stop() {
        this.userStopped = true; // Set flag to indicate the stop was user-initiated
        if (this.sourceNode) {
            this.sourceNode.stop();
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        this.fetchController.abort(); // Abort any ongoing fetch
        this.fetchController = new AbortController(); // Reset controller for next request
        this.isPlaying = false;
        this.startOffset = 0;
    }

    setVolume(level) {
        this.gainNode.gain.value = level; // Adjust the gain value to control the volume
    }

    isCurrentlyPlaying() {
        return this.isPlaying;
    }

    updateCredit(credit) {
        const creditTitle = document.getElementById('background-music-Credit');
        if (creditTitle) {
            creditTitle.innerHTML = credit;
        }
    }
}




const BackgroundMusic = {
    DEFAULT_CONTEXT : "default",
    audioContext : null,
    soundFiles: null,
    type: null,
    context : "default",
    categories: {
        background: {},
        ambiance: {},
        soundboard: {}
    },
    backgroundMusicFilesToPlay : [],
    backgroundMusicArray : [],
    backgroundButton: null,
    soundIndex : 0,
    creditsMap : null,
    audioManager: new AudioManager(), // Initialize AudioManager

    setBackgroundVolume(volume) {
        const gainValue = volume / 100;
       this.audioManager.setVolume(gainValue);
    },

    init () 
    {
        this.audioManager.setOnEndedCallback(() => {
            this.backGroundSoundLoop();
        });
    },

    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return  this.audioContext;
    },

    addOptionTocontextSelector(subType)
    {
        const contextSelector = document.getElementById('contextSelector');
        const option = document.createElement('option');
        option.value = subType;
        option.textContent = subType;
        contextSelector.appendChild(option);
    },

    updatecontexts()
    {
        const uniqueOptions = new Set(); // Set for unique options excluding "default"
        uniqueOptions.add(this.DEFAULT_CONTEXT);
        // Add new contexts to uniqueOptions
        for (let music of this.backgroundMusicArray) {
            for (let subType of music.contexts) {
                if (!uniqueOptions.has(subType)) {
                    console.log(subType)
                    console.log(music.filename)
                    uniqueOptions.add(subType);
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
            this.updatecontexts();
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
        if(this.context !== this.DEFAULT_CONTEXT)
        {
            return this.backgroundMusicArray.filter(sound => 
            sound.types.includes(this.type) && sound.contexts.includes(this.context)
            );
        }
        else
        {
            return this.backgroundMusicArray.filter(sound => sound.types.includes(this.type));
        }
    },

    backGroundSoundLoop() {
        if (this.soundIndex >= this.filesToPlay.length) {
            this.soundIndex = 0;  // Reset index if it exceeds the array
        }
        const fileToPlay = this.filesToPlay[this.soundIndex++];
        if(fileToPlay)
            this.audioManager.playSound(fileToPlay);
    },

    // Function to capitalize the first letter of a string
    capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1); // Capitalize first letter, keep rest unchanged
    },

    updateButton(typeName)
    {
        let result = this.backgroundMusicArray.filter(sound => 
            sound.types.includes(typeName) && sound.contexts.includes(this.context))
        let button = document.getElementById(typeName+'Button'); 
        if (result.length === 0) {
            button.disabled = true; // Disable the button if the array is empty
            button.textContent  = "Play " + this.capitalizeFirstLetter(typeName) + " (0)"
          } else {
            button.disabled = false; // Enable the button if the array is not empty
            button.textContent  = "Play " + this.capitalizeFirstLetter(typeName) + " ("+result.length+")"
          }
    },

    setContext(newContext)
    {
        this.context = newContext;
        this.filesToPlay =  this.findSoundsByTypeAndContext();
        this.updateButton("calm")
        this.updateButton("dynamic")
        this.updateButton("intense")
        if(this.audioManager.isCurrentlyPlaying())
        {
            if(this.filesToPlay.length == 0)
            {
                this.audioManager.stop();
                const creditTitle = document.getElementById('background-music-Credit'); 
                creditTitle.innerHTML  = "---";
                this.backgroundButton.classList.remove('button-play');
                this.backgroundButton.classList.add('button-stop');
            }
            else
            {
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


    async playBackgroundSound(type, button) {
        if(this.audioManager.isProcessing) return;
        const creditTitle = document.getElementById('background-music-Credit'); 
        creditTitle.innerHTML  = "---";
        if (this.audioManager.isCurrentlyPlaying()) 
        {
            this.audioManager.stop();
            this.backgroundButton.classList.remove('button-play');
            this.backgroundButton.classList.add('button-stop');
            if (type === this.type) 
            {
                return;
            }
        }
        this.type = type;
        this.filesToPlay =  this.findSoundsByTypeAndContext();
        if(this.filesToPlay.length == 0)
         {
            return;
         }
        this.backgroundButton = button;
        button.classList.add('button-play');
        button.classList.remove('button-stop');
        this.backGroundSoundLoop();
    },
}

BackgroundMusic.init();
