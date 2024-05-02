class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioElement = document.createElement('audio');
        document.body.appendChild(this.audioElement);  // Ensure the audio element is in the DOM
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
            console.log("this.play()");
            this.play()
        });

    }

    manageBuffering() {
        const bufferSafeThreshold = 5; // seconds ahead of current time to keep buffered
        const maxBufferAhead = 30; // maximum seconds to buffer ahead of the current time
        if (!this.mediaSource || this.mediaSource.readyState === 'ended' || !this.sourceBuffer) return;
    
        let bufferedEnd = 0;
        try {
            bufferedEnd = this.sourceBuffer.buffered.length > 0 ? 
                this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1) : 0;
        } catch {
            return;
        }
    
        const currentTime = this.audioElement.currentTime;
        if (bufferedEnd - currentTime < bufferSafeThreshold) {
            if (bufferedEnd < currentTime + maxBufferAhead && !this.readerDone) {
                console.log("Buffer running low, fetching more data.");
                this.readAndAppend(this.reader, this.sourceBuffer, this.mediaSource);
            }
            if (bufferedEnd - currentTime < 1 && !this.audioElement.paused) {
                console.log("Buffer underrun");
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

    play() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log("AudioContext resumed successfully");
                return this.audioElement.play();
            }).then(() => {
                this.isPlaying = true;
                console.log("Playback has started successfully.");
            }).catch(e => {
                console.error('Error playing audio:', e);
            });
        } else if (!this.isPlaying) {
            this.audioElement.play().then(() => {
                this.isPlaying = true;
                console.log("Playback has started successfully.");
            }).catch(e => {
                console.error('Error playing audio:', e);
            });
        }
    }

    pause() {
        if (this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
            console.log("Playback has been paused.");
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
        if(this.audioManager.isCurrentlyPlaying())
        {
            if(this.filesToPlay.length == 0)
            {
                this.audioManager.pause();
                const creditTitle = document.getElementById('background-music-Credit'); 
                creditTitle.innerHTML  = "---";
                this.backgroundButton.classList.remove('button-play');
                this.backgroundButton.classList.add('button-stop');
            }
            else
            {
                this.audioManager.pause();
                this.backGroundSoundLoop();
            }
        }
    },

    playSound(fileOrHandle) {
        const context = this.getAudioContext();
        if (context.state === 'suspended') {
            context.resume();
        }
    
        const source = context.createBufferSource();
        const gainNode = context.createGain();
        const analyser = context.createAnalyser();
    
        const processAudioBuffer = (arrayBuffer) => {
            context.decodeAudioData(arrayBuffer)
                .then(audioBuffer => {
                    source.buffer = audioBuffer;
                    source.loop = false;
                    source.connect(analyser);
                    analyser.connect(gainNode);
                    gainNode.connect(context.destination);
    
                    const volume = document.getElementById('music-volume').value;
                    gainNode.gain.value = volume / 100; // Set initial volume
                    source.start(0);
    
                    const updateGain = () => {
                        this.adjustVolume(); // If you have an adjustVolume function
                        if (!source.ended) { // Instead of paused, check if source has ended
                            requestAnimationFrame(updateGain); // Recursively update gain
                        }
                    };
    
                    source.onended = () => {
                        console.log('Sound ended, looping to next.');
                        this.backGroundSoundLoop(); // Set up loop logic
                    };
                    this.setBackgroundSound({ source, gainNode, analyser }); // Store active sound
                   // updateGain(); //WIP
                })
               // Allow playing again
                .catch(e => {console.error('Error decoding audio data:', e); });
        };
    
        // Determine if it's a file handle or URL
        if (fileOrHandle instanceof FileSystemFileHandle) {
            fileOrHandle.getFile()
                .then(file => file.arrayBuffer())
                .then(arrayBuffer => processAudioBuffer(arrayBuffer))
                .catch(e => {console.error('Error reading local file:', e);});
        } else {
            const creditTitle = document.getElementById('background-music-Credit'); 
            creditTitle.innerHTML  = fileOrHandle.credit;
            fetch("assets/background/" + fileOrHandle.filename)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => processAudioBuffer(arrayBuffer))
                .catch(e => {console.error('Error fetching audio data:', e);});
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
        const creditTitle = document.getElementById('background-music-Credit'); 
        creditTitle.innerHTML  = "---";
        if (this.audioManager.isCurrentlyPlaying()) 
        {
            this.audioManager.pause();
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
