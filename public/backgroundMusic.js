class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioElement = document.createElement('audio');
        document.body.appendChild(this.audioElement);  // Ensure the audio element is in the DOM
        this.isPlayBackgroundAllowed = true;
        this.pendingData = [];
        this.readerDone = false; // Initialization of readerDone
        this.audioElement.addEventListener('timeupdate', () => {
            this.manageBuffering();
        });
        this.audioElement.volume = 0.5;
    }

    playSound(fileOrHandle) {
        this.mediaSource = new MediaSource();
        this.audioElement.src = URL.createObjectURL(this.mediaSource);
        this.readerDone = false;
        this.mediaSource.addEventListener('sourceopen', () => {
            this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
            this.sourceBuffer.addEventListener('updateend', () => 
            {
                if (!this.sourceBuffer.updating && this.pendingData.length > 0 && !this.isBufferFull(this.sourceBuffer)) {
                    this.processQueue(this.sourceBuffer, this.mediaSource); // Process the queue after buffer updates
                }
            });
            this.updateCredit(fileOrHandle.credit);
            this.fetchAndProcessAudio("assets/background/" + fileOrHandle.filename, this.sourceBuffer, this.mediaSource);
        });
        this.play()
    }

    manageBuffering() {
      
        const bufferSafeThreshold = 5; // seconds ahead of current time to keep buffered
        const maxBufferAhead = 30; // maximum seconds to buffer ahead of the current time
    
        if (!this.mediaSource || this.mediaSource.readyState === 'ended' || !this.sourceBuffer) {
            return; // No active media source or media source is closed
        }

        let bufferedEnd = 0;
        try {
            if (this.sourceBuffer.buffered.length > 0) {
                bufferedEnd = this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1);
            }
        } catch {
            return; 
        }
    
        const currentTime = this.audioElement.currentTime;
        // Check if more data is needed
        if (bufferedEnd - currentTime < bufferSafeThreshold) {
            if (bufferedEnd < currentTime + maxBufferAhead && !this.readerDone) {
                // Time to fetch more data as buffer is running low
                console.log("Buffer running low, fetching more data.");
                this.readAndAppend(this.reader, this.sourceBuffer, this.mediaSource); // Assuming reader is available from initial fetch
            }
        }
    }

    fetchAndProcessAudio(url, sourceBuffer, mediaSource) {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.body.getReader();
            })
            .then(reader => {
                this.reader = reader;  // Store the reader in the class
                this.readAndAppend(this.reader, sourceBuffer, mediaSource);
            })
            .catch(e => console.error('Failed to fetch audio:', e));
    }

    readAndAppend(reader, sourceBuffer, mediaSource) {
        reader.read().then(({ done, value }) => {
            if (done) {
                this.readerDone = true;  // Set a flag when reader completes
                this.checkAndTriggerEndOfStream(sourceBuffer, mediaSource);
                return;
            }
            this.queueData(value, sourceBuffer);
            if (!sourceBuffer.updating) {
                this.processQueue(sourceBuffer, mediaSource);
            }
            // Remove recursive call here to allow managed buffering
        }).catch(error => console.error('Error reading from stream:', error));
    }
    queueData(chunk, sourceBuffer) {
        if (sourceBuffer.updating || this.pendingData.length > 0) {
            this.pendingData.push(chunk);
        } else {
            sourceBuffer.appendBuffer(chunk);
        }
    }
    checkAndTriggerEndOfStream(sourceBuffer, mediaSource) {
        if (!sourceBuffer.updating && this.pendingData.length === 0 && this.readerDone) {
            mediaSource.endOfStream();
        }
    }

    isBufferFull(sourceBuffer) {
        const buffered = sourceBuffer.buffered;
        if (buffered.length === 0) return false; // No data, buffer is definitely not full
    
        // Check if the buffer has 'enough' data queued - this is heuristic
        let totalBuffered = 0;
        for (let i = 0; i < buffered.length; i++) {
            totalBuffered += buffered.end(i) - buffered.start(i);
        }
        
        // Here, '10' is a threshold in seconds you might adjust based on your application's needs
        return totalBuffered > 10;
    }

processQueue(sourceBuffer, mediaSource) {
    console.log("Processing queue", this.pendingData.length);
    if (this.pendingData.length > 0 && !sourceBuffer.updating) {
        console.log("Appending from queue");
        sourceBuffer.appendBuffer(this.pendingData.shift());
    }
    if (this.pendingData.length === 0 && !sourceBuffer.updating &&  this.readerDone) {
        mediaSource.endOfStream();
        console.log("End of Stream");
    }
}

    setVolume(level) {
        this.audioElement.volume = level;
    }

    isCurrentlyPlaying() {
        return !this.audioElement.paused && !this.audioElement.ended;
    }
    
    updateCredit(credit) {
        const creditTitle = document.getElementById('background-music-Credit');
        creditTitle.innerHTML = credit;
    }

    setOnEndedCallback(callback) {
        this.audioElement.onended = callback;
    }

    pause() {
        this.audioElement.pause();
    }

    play() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log("AudioContext resumed successfully");
                this.audioElement.play().catch(e => console.error('Error playing audio:', e));
            });
        } else {
            this.audioElement.play().catch(e => console.error('Error playing audio:', e));
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
    isPlayBackgroundAllowed: true, // Flag to indicate if play is allowed
    audioManager: new AudioManager(), // Initialize AudioManager

    setBackgroundVolume(volume) {
        const gainValue = volume / 100;
        this.audioManager.setVolume(gainValue)
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
        if (this.audioManager.isCurrentlyPlaying()) 
        {
            this.audioManager.pause()
            if(this.filesToPlay.length == 0)
            {
                const creditTitle = document.getElementById('background-music-Credit'); 
                creditTitle.innerHTML  = "---";
                this.backgroundButton.classList.remove('button-play');
                this.backgroundButton.classList.add('button-stop');
            }
            else
            {
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
        // Prevent overlapping sounds
       
         // Disable play to prevent rapid clicks
         this.isPlayBackgroundAllowed = false;

        const creditTitle = document.getElementById('background-music-Credit'); 
        creditTitle.innerHTML  = "---";
        if (this.audioManager.isCurrentlyPlaying()) 
        {
            this.audioManager.pause()
            this.backgroundButton.classList.remove('button-play');
            this.backgroundButton.classList.add('button-stop');
            if (type === this.type) 
            {
                this.isPlayBackgroundAllowed = true; // Allow playing again
                return;
            }
        }
        this.type = type;
        this.filesToPlay =  this.findSoundsByTypeAndContext();
        if(this.filesToPlay.length == 0)
         {
            this.isPlayBackgroundAllowed = true; // Allow playing again
            return;
         }
        this.backgroundButton = button;
        button.classList.add('button-play');
        button.classList.remove('button-stop');
        this.backGroundSoundLoop();
    },
}
BackgroundMusic.init();