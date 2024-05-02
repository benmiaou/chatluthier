const AUDIO_CACHE_NAME = 'audio-cache';

class AudioManager 
{
    constructor() 
    {
        this.audioElement = document.createElement('audio');
        this.audioElement.hidden = true;
        this.audioElement.controls = true; // Optionally add controls
        document.body.appendChild(this.audioElement); // Append the audio element to the body

        this.isPlaying = false;
        this.isProcessing = false;
        this.onEndedCallback = null; // Custom callback for when playback ends naturally
        this.fetchQueue = [];
        this.isFetching = false;
    }

    async playSound(fileOrHandle) {
        this.isProcessing = true;
        if (this.isPlaying) this.stop(); // Stop any currently playing audio
    
        const audioUrl = "assets/background/" + fileOrHandle.filename;
        this.updateCredit(fileOrHandle.credit);
    
        try {
            const cache = await caches.open(AUDIO_CACHE_NAME);
            let response = await cache.match(audioUrl);
            if (!response) {
                console.log("Not found in cache. Fetching and streaming...");
                // Start streaming immediately without waiting for the cache
                this.audioElement.src = audioUrl;
                this.audioElement.play().then(() => {
                    this.isPlaying = true;
                    console.log("Playback started successfully.");
                }).catch(error => {
                    console.error("Error playing audio:", error);
                });
                this.enqueueFetch(audioUrl); // Queue the fetch operation
                // Handle caching in the background
                fetch(audioUrl).then(async response => {
                    if (response.ok) {
                        const cacheResponse = response.clone();
                        await cache.put(audioUrl, cacheResponse);
                        console.log("Audio cached : " + audioUrl);
                    } else {
                        console.error("Failed to fetch audio file.");
                    }
                }).catch(error => {
                    console.error("Error fetching and caching audio:", error);
                });
            } else {
                console.log("Found in cache. Loading from cache...");
                // If the audio is in the cache, use it directly
                this.audioElement.src = URL.createObjectURL(await response.blob());
                this.audioElement.play().then(() => {
                    this.isPlaying = true;
                    console.log("Playback started successfully.");
                }).catch(error => {
                    console.error("Error playing audio:", error);
                });
            }

        } catch (error) {
            console.error("Error playing or caching audio:", error);
        }
    
        this.audioElement.onended = () => {
            this.isPlaying = false;
            if (this.onEndedCallback) {
                this.onEndedCallback(); // Call the registered callback if set
            }
            console.log("Playback finished.");
            URL.revokeObjectURL(this.audioElement.src); // Clean up the object URL to release memory
        };
    
        this.isProcessing = false;
    }

    preload(fileOrHandle) {
        const audioUrl = "assets/background/" + fileOrHandle.filename;
        this.fetchQueue.push(audioUrl);
        this.processFetchQueue(); // Start processing the queue if not already started
    }
    
    enqueueFetch(audioUrl) {
        this.fetchQueue.push(audioUrl);
        this.processFetchQueue(); // Start processing the queue if not already started
    }

    async processFetchQueue() {
        console.log("this.isFetching " + this.isFetching)
        console.log(" this.fetchQueue " + this.fetchQueue)
        if (this.isFetching || this.fetchQueue.length === 0) {
            return; // Exit if a fetch is already in process or the queue is empty
        }

        this.isFetching = true;
        const url = this.fetchQueue.shift();
        try {
            const cache = await caches.open(AUDIO_CACHE_NAME);
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response);
                console.log("Audio file cached successfully:", url);
            } else {
                console.error("Failed to fetch the file for caching:", url);
            }
        } catch (error) {
            console.error("Error fetching and caching audio:", error);
        } finally {
            this.isFetching = false;
            this.processFetchQueue(); // Recursively process the next item in the queue
        }
    }

    setOnEndedCallback(callback) {
        this.onEndedCallback = callback;
    }

    pause() {
        this.audioElement.pause();
        console.log("Playback has been paused.");
    }

    resume() {
        this.audioElement.play();
        console.log("Playback has resumed.");
    }

    stop() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.isPlaying = false;
        console.log("Playback has been stopped.");
    }

    setVolume(level) {
        this.audioElement.volume = level;
        console.log(`Volume set to ${level}.`);
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
        let fileToPlay = this.filesToPlay[this.soundIndex];
        if(fileToPlay)
            this.audioManager.playSound(fileToPlay);

        //Preload next
        this.soundIndex++;
        fileToPlay = this.filesToPlay[this.soundIndex];
        this.audioManager.preload(fileToPlay)
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
