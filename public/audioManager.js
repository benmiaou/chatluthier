const AudioManager = {
    // Define audio context globally, initially as null
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

    addOptionToSubtypeSelector(subType)
    {
        const subtypeSelector = document.getElementById('subtypeSelector');
        const option = document.createElement('option');
        option.value = subType;
        option.textContent = subType;
        subtypeSelector.appendChild(option);
    },
    
    async preloadBackgroundSounds() {
        console.log("preloadBackgroundSounds : ")
        const existingOptions = new Set(Array.from(subtypeSelector.options).map(opt => opt.value));
        existingOptions.add(this.DEFAULT_CONTEXT);
        try {
                const response = await fetch(`/backgroundMusic`);
                this.backgroundMusicArray = await response.json();
                this.backgroundMusicArray = this.shuffleArray(this.backgroundMusicArray)
                for (let music of this.backgroundMusicArray) 
                {
                    //Add option comboBox
                    for (let subType of music.contexts) 
                    {
                        if (!existingOptions.has(subType)) 
                        {
                            this.addOptionToSubtypeSelector(subType);
                            existingOptions.add(subType);
                        }
                    }
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

        this.context = subtypeSelector.value;

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
        console.log( this.filesToPlay);
        console.log(fileToPlay);

        if (this.filesToPlay.length == 0) {
            alert("No sounds found for this combination : " + this.type + " " + this.context);
        }

        this.playSound(fileToPlay);
    },

    adjustVolume() {
        const dataArray = new Uint8Array(this.activeBackgroundSound.analyser.frequencyBinCount);
        this.activeBackgroundSound.analyser.getByteTimeDomainData(dataArray);
    
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const value = (dataArray[i] / 128) - 1;
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
                   // updateGain(); //WIP
                })
                .catch(e => console.error('Error decoding audio data:', e));
        };
    
        // Determine if it's a file handle or URL
        if (fileOrHandle instanceof FileSystemFileHandle) {
            fileOrHandle.getFile()
                .then(file => file.arrayBuffer())
                .then(arrayBuffer => processAudioBuffer(arrayBuffer))
                .catch(e => console.error('Error reading local file:', e));
        } else {
            const creditTitle = document.getElementById('background-music-Credit'); 
            creditTitle.innerHTML  = fileOrHandle.credit;
            fetch("assets/background/" + fileOrHandle.filename)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => processAudioBuffer(arrayBuffer))
                .catch(e => console.error('Error fetching audio data:', e));
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
         setTimeout(() => {
             this.isPlayBackgroundAllowed = true; // Allow play after 1 second
         }, 1000); // 1-second delay

        const creditTitle = document.getElementById('background-music-Credit'); 
        creditTitle.innerHTML  = "---";
        if (this.activeBackgroundSound) {
            this.activeBackgroundSound.source.onended = null;
            this.activeBackgroundSound.source.stop();
            this.activeBackgroundSound = null;
            this.backgroundButton.classList.remove('button-play');
            this.backgroundButton.classList.add('button-stop');
            if (type === this.type) return;
        }
        this.backgroundButton = button;
        button.classList.add('button-play');
        button.classList.remove('button-stop');
        this.type = type;
    
        this.filesToPlay =  this.findSoundsByTypeAndContext();
        if(this.filesToPlay.length > 0)
            this.backGroundSoundLoop();
    },

    setBackgroundVolume(volume) {
        const gainValue = volume / 100;
        if (this.activeBackgroundSound && this.activeBackgroundSound.gainNode) {
            this.activeBackgroundSound.gainNode.gain.value = gainValue;
        }
    },

    toggleAmbientSound(fileHandleOrPath, loop, soundBarContainer) {
        let sound = this.categories.ambiance[fileHandleOrPath];
        if (sound && sound.source) 
        {
            sound.source.stop();
            delete this.categories.ambiance[fileHandleOrPath];
        } 
        else 
        {
            // Find the parent container of the button, which should contain the sound bar
            if (soundBarContainer) {
                // Retrieve the volume value from the sound bar
                const soundBarValue = soundBar.getVolumeFromProgressBar(soundBarContainer);
                // Use the sound bar value as the initial volume
                this.createSound(fileHandleOrPath, loop, null, 'ambiance', soundBarValue);
            } else {
                console.error('Sound bar container not found.');
            }
        }
    },

    generateAmbientButtons(soundFiles, sectionId, isLocal = false) {
        const section = document.getElementById(sectionId);
        section.innerHTML = ''; // Clear existing content
    
        soundFiles.forEach(item => {
            const fileName = isLocal ? item.name.replace('.mp3', '') : item.replace('.mp3', '');
            const container = document.createElement('div');
            container.className = 'sound-container';
    
            // Create a div for the sound bar
            const soundBarDiv = document.createElement('div');
            soundBarDiv.id = `sound-bar-${fileName}`; // Set a unique ID for the sound bar
            soundBarDiv.className = 'sound-bar'; // Apply styling to the sound bar
    
            // Append the sound bar div to the container
            container.appendChild(soundBarDiv);
            let isRunning = false;
            // Assuming 'soundBar' is the object exported from 'soundBar.js'
            const progressBarContainer = soundBar.createProgressBar(fileName);
            progressBarContainer.addEventListener('soundBarValueChanged', () => {
                // If local, the item is a file handle
                fileHandleOrPath = null
                if(isLocal)
                {
                    fileHandleOrPath = item;
                }
                else
                {
                    fileHandleOrPath = `assets/ambiance/${item}`;
                }
                const sound = this.categories.ambiance[fileHandleOrPath];
                if(!isRunning && !sound && soundBar.getVolumeFromProgressBar(progressBarContainer) > 0)
                {
                    isRunning = true;
                    this.toggleAmbientSound(fileHandleOrPath, true, progressBarContainer);
                }
                else if(sound && soundBar.getVolumeFromProgressBar(progressBarContainer) == 0)
                {
                    isRunning = false;
                    this.toggleAmbientSound(fileHandleOrPath, true, progressBarContainer);
                }
                else if (sound && sound.gainNode) 
                {
                    sound.gainNode.gain.value = soundBar.getVolumeFromProgressBar(progressBarContainer);
                }
            });
            // Append progress bar container to the container
            container.appendChild(progressBarContainer);
            
            // Append the container to the section
            section.appendChild(container);
        });
    },

    createSound(urlOrHandle, loop, button, type, initialVolume) 
    {
        const context = this.getAudioContext();
        if (context.state === 'suspended') {
            context.resume();
        }
    
        const source = context.createBufferSource();
        const gainNode = context.createGain();
        gainNode.gain.value = initialVolume; // Set the initial volume
    
        const processAudioBuffer = (arrayBuffer) => {
            context.decodeAudioData(arrayBuffer)
                .then(audioBuffer => {
                    source.buffer = audioBuffer;
                    source.loop = loop;
                    source.connect(gainNode);
                    gainNode.connect(context.destination);
                    source.start(0);
    
                    source.onended = () => {
                        delete this.categories[type][urlOrHandle];
                        if (button) {
                            button.classList.remove('button-play');
                            button.classList.add('button-stop');
                        }
                    };
    
                    this.categories[type][urlOrHandle] = { source, gainNode };
                    if (button) {
                        button.classList.add('button-play');
                        button.classList.remove('button-stop');
                    }
                })
                .catch(e => console.error('Error with decoding audio data:', e));
        };
    
        // Check if urlOrHandle is a file handle
        if (urlOrHandle instanceof FileSystemFileHandle) {
            urlOrHandle.getFile().then(file => {
                file.arrayBuffer().then(arrayBuffer => {
                    processAudioBuffer(arrayBuffer);
                }).catch(e => console.error('Error reading file arrayBuffer:', e));
            }).catch(e => console.error('Error getting file:', e));
        } else {
            // Assume urlOrHandle is a URL
            fetch(urlOrHandle)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => processAudioBuffer(arrayBuffer))
                .catch(e => console.error('Error fetching or decoding audio data:', e));
        }
    },

    setVolume(type, volume) {
        const gainValue = volume / 100;
        Object.values(this.categories[type]).forEach(sound => {
            if (sound.gainNode) {
                sound.gainNode.gain.value = gainValue;
            }
        });
    },

    async loadLocalSoundFiles() {
        const directory = await LocalDirectory.getDirectory();
        if (!directory) {
            console.error("Directory handle is not set.");
            return;
        }
    
        const soundboardDir = await directory.getDirectoryHandle('soundboard', { create: true });
        const localFiles = await LocalDirectory.listMP3Files(soundboardDir);
        // Pass file handles directly to the button generator
        this.generateSoundboardButtons(localFiles, 'soundboardLocal', true);

        const AmbientDir = await directory.getDirectoryHandle('ambiance', { create: true });
        const localAmbianceFiles = await LocalDirectory.listMP3Files(AmbientDir);
        // Pass file handles directly to the button generator
        this.generateAmbientButtons(localAmbianceFiles, 'ambianceLocal', true);

        this.updateLocalBackgroundMusic();
    },

    async updateLocalBackgroundMusic() {
        const rootDir = await LocalDirectory.getDirectory();
        if (!rootDir) {
            console.error("Root directory handle is not set.");
            return;
        }
    
        function getSubtypeName(path) {
            const parts = path.split('/');
            return parts[parts.length - 1];
        }
    
        const types = [ 'background/battle', 'background/exploration'];
        const backgroundDir = await rootDir.getDirectoryHandle('background', { create: true });
        const existingOptions = new Set(Array.from(subtypeSelector.options).map(opt => opt.value));
    
        for (let type of types) {
            try {
                const typeDir = await backgroundDir.getDirectoryHandle(getSubtypeName(type), { create: true });
                const subTypeHandles = [];
    
                // Get all subdirectories (subtypes)
                for await (const entry of typeDir.values()) {
                    if (entry.kind === 'directory') {
                        subTypeHandles.push(entry);
                    }
                }
    
                // Ensure `this.categories[type]` is initialized
                if (!this.categories[type]) {
                    this.categories[type] = {}; // Initialize if missing
                }
    
                const existingSubtypes = new Set(Object.keys(this.categories[type]));
    
                for (let subTypeHandle of subTypeHandles) {
                    const subTypeName = subTypeHandle.name;
  
                    // Ensure subtype is initialized
                    if (!Array.isArray(this.categories[type][subTypeName])) {
                        this.categories[type][subTypeName] = []; // Initialize as an array
                    }
    
                    if (!existingOptions.has(subTypeName) && subTypeName !== this.DEFAULT_CONTEXT) 
                    {
                        this.addOptionToSubtypeSelector(subTypeName);
                        existingOptions.add(subTypeName);
                    }
                    const files = await LocalDirectory.listMP3Files(subTypeHandle);
                    const existingFiles = new Set(
                        this.categories[type][subTypeName].map(file => file.name)
                    );
    
                    // Add new files only if they don't already exist
                    for (let fileHandle of files) {
                        if (!existingFiles.has(fileHandle.name)) {
                            this.categories[type][subTypeName].push(fileHandle);
                            existingFiles.add(fileHandle.name);  // Keep track of added files
                        }
                    }
                }
            } catch (e) {
                console.error(`Error scanning ${type}:`, e);
            }
        }
    },

    generateSoundboardButtons(items, sectionId, isLocal = false) {
        const section = document.getElementById(sectionId);
        section.innerHTML = '';  // Clear existing content
    
        items.forEach(item => {
            // Determine if the item is a file handle or a string based on `isLocal`
            const fileName = isLocal ? item.name.replace('.mp3', '') : item.replace('.mp3', '');
            const button = document.createElement('button');
            button.textContent = fileName;
    
            if (isLocal) {
                // If local, the item is a file handle
                button.onclick = () => {
                    this.toggleSoundboardSound(item, false, button);
                };
            } else {
                // If not local, the item is treated as a string path
                const filePath = `assets/soundboard/${item}`;
                button.onclick = () => {
                    this.toggleSoundboardSound(filePath, false, button);
                };
            }
    
            button.classList.add('button-stop', 'button');
            section.appendChild(button);
        });
    },

    findVolumeControl(button) {
        // Tries to find the slider associated with the button, assuming each button might be part of a larger control group.
        let parent = button.parentNode;
        while (parent && !parent.querySelector('.slider')) {
            parent = parent.parentNode;  // Traverse up until you find a container with a slider
        }
        return parent ? parent.querySelector('.slider') : null;
    },

    toggleSoundboardSound(fileHandleOrPath, loop, button) {
        let sound = this.categories.soundboard[fileHandleOrPath];
        if (sound && sound.source) {
            sound.source.stop();
            delete this.categories.soundboard[fileHandleOrPath];
            button.classList.remove('button-play');
            button.classList.add('button-stop');
        } else {
            const slider = this.findVolumeControl(button);
            const initialVolume = slider ? slider.value / 100 : 1;
            this.createSound(fileHandleOrPath, loop, button, 'soundboard', initialVolume);
        }
    },
}
