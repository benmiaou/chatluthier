const BackgroundMusic = {
    DEFAULT_CONTEXT : "default",
    audioContext : null,
    activeBackgroundSound: null,
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
    
    async preloadBackgroundSounds() {
        const existingOptions = new Set(Array.from(contextSelector.options).map(opt => opt.value));
        const uniqueOptions = new Set(); // Set for unique options excluding "default"
        
        uniqueOptions.add(this.DEFAULT_CONTEXT);
    
        try {
            const response = await fetch(`/backgroundMusic`);
            this.backgroundMusicArray = await response.json();
            this.backgroundMusicArray = this.shuffleArray(this.backgroundMusicArray);
    
            // Add new contexts to uniqueOptions
            for (let music of this.backgroundMusicArray) {
                for (let subType of music.contexts) {
                    if (!existingOptions.has(subType) && !uniqueOptions.has(subType)) {
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
        this.playSound(fileToPlay);
    },

    adjustVolume() {
        const dataArray = new Uint8Array(this.activeBackgroundSound.analyser.frequencyBinCount);
        this.activeBackgroundSound.analyser.getByteTimeDomainData(dataArray);
    
        let sum = 0;
        for (const element of dataArray) {
            const value = (element / 128) - 1;
            sum += value * value;
        }
        const rms = Math.sqrt(sum / dataArray.length);
     
        const desiredRMS = 0.01;
        const noiseThreshold = desiredRMS / 4; // Threshold to determine what is considered noise
    
        if (rms === 0) {
            this.activeBackgroundSound.gainNode.gain.setValueAtTime(0.1, this.getAudioContext().currentTime);
            return;
        }
        if (rms < noiseThreshold) {
            this.activeBackgroundSound.gainNode.gain.setValueAtTime(0, this.getAudioContext().currentTime);
            return;
        }
    
        let newGainValue = Math.min(desiredRMS / rms, 1.5); // Capping the gain to prevent distortion
        if (isFinite(newGainValue) && newGainValue > 0) {
            // Smooth transition using exponential ramp to the new gain value
            this.activeBackgroundSound.gainNode.gain.exponentialRampToValueAtTime(newGainValue, this.getAudioContext().currentTime + 0.1);
        }
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
        if(this.activeBackgroundSound)
        {
            if(this.filesToPlay.length == 0)
            {
                const creditTitle = document.getElementById('background-music-Credit'); 
                creditTitle.innerHTML  = "---";
                this.activeBackgroundSound.source.onended = null;
                this.activeBackgroundSound.source.stop();
                this.activeBackgroundSound = null;
                this.backgroundButton.classList.remove('button-play');
                this.backgroundButton.classList.add('button-stop');
            }
            else
            {
            this.activeBackgroundSound.source.stop();
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
    
                    this.activeBackgroundSound = { source, gainNode, analyser }; // Store active sound
                    this.isPlayBackgroundAllowed = true; // Allow playing again
                   // updateGain(); //WIP
                })
               // Allow playing again
                .catch(e => {console.error('Error decoding audio data:', e);  this.isPlayBackgroundAllowed = true; });
        };
    
        // Determine if it's a file handle or URL
        if (fileOrHandle instanceof FileSystemFileHandle) {
            fileOrHandle.getFile()
                .then(file => file.arrayBuffer())
                .then(arrayBuffer => processAudioBuffer(arrayBuffer))
                .catch(e => {console.error('Error reading local file:', e);  this.isPlayBackgroundAllowed = true; });
        } else {
            const creditTitle = document.getElementById('background-music-Credit'); 
            creditTitle.innerHTML  = fileOrHandle.credit;
            fetch("assets/background/" + fileOrHandle.filename)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => processAudioBuffer(arrayBuffer))
                .catch(e => {console.error('Error fetching audio data:', e);  this.isPlayBackgroundAllowed = true; });
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
        if (!this.isPlayBackgroundAllowed) 
        {
            return;
        }
         // Disable play to prevent rapid clicks
         this.isPlayBackgroundAllowed = false;

        const creditTitle = document.getElementById('background-music-Credit'); 
        creditTitle.innerHTML  = "---";
        if (this.activeBackgroundSound) 
        {
            this.activeBackgroundSound.source.onended = null;
            this.activeBackgroundSound.source.stop();
            this.activeBackgroundSound = null;
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

    setBackgroundVolume(volume) {
        const gainValue = volume / 100;
        if (this.activeBackgroundSound?.gainNode) {
            this.activeBackgroundSound.gainNode.gain.value = gainValue;
        }
    },

}