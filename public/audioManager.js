const AudioManager = {
    // Define audio context globally, initially as null
     audioContext : null,

    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return  this.audioContext;
    },

    activeBackgroundSound: null,
    soundFiles: null,
    type: null,
    categories: {
        background: {},
        ambiance: {},
        soundboard: {}
    },
    backgroundButton: null,

    fetchSoundFiles() {
        return fetch(`http://127.0.0.1:3000/list-sounds/${this.type}`)
            .then(response => response.json())
            .then(data => {
                this.soundFiles = data;
                if (!this.soundFiles.length) {
                    console.error('No sound files found.');
                }
                return this.soundFiles;
            })
            .catch(e => {
                console.error('Error fetching sound file list from server:', e);
                return null;
            });
    },

    backGroundSoundLoop() {
        const soundDirectory = this.type === 'exploration' ? 'assets/background/exploration/' : 'assets/background/battle/';
        const randomFile = this.soundFiles[Math.floor(Math.random() * this.soundFiles.length)];
        const url = soundDirectory + randomFile;

        const playSound = (file) => {
            const source = this.getAudioContext().createBufferSource();
            const gainNode = this.getAudioContext().createGain();

            fetch(file)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => this.getAudioContext().decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    source.buffer = audioBuffer;
                    source.loop = false;
                    source.connect(gainNode);
                    gainNode.connect(this.getAudioContext().destination);

                    let volume = document.getElementById('music-volume').value;
                    gainNode.gain.value = volume / 100;
                    source.start(0);

                    source.onended = () => this.backGroundSoundLoop();

                    this.activeBackgroundSound = { source, gainNode };
                })
                .catch(e => console.error('Error with decoding audio data', e));
        };

        playSound(url);
    },

    async playBackgroundSound(type, button) {
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
        await this.fetchSoundFiles();
        if (!this.soundFiles) {
            console.error('Sound files not loaded.');
            return;
        }

        this.backGroundSoundLoop();
    },

    setBackgroundVolume(volume) {
        const gainValue = volume / 100;
        if (this.activeBackgroundSound && this.activeBackgroundSound.gainNode) {
            this.activeBackgroundSound.gainNode.gain.value = gainValue;
        }
    },

    toggleAmbientSound(url, loop, soundBarContainer) {
        let sound = this.categories.ambiance[url];
        if (sound && sound.source) 
        {
            sound.source.stop();
            delete this.categories.ambiance[url];
        } 
        else 
        {
            // Find the parent container of the button, which should contain the sound bar
            if (soundBarContainer) {
                // Retrieve the volume value from the sound bar
                const soundBarValue = soundBar.getVolumeFromProgressBar(soundBarContainer);
                // Use the sound bar value as the initial volume
                this.createSound(url, loop, null, 'ambiance', soundBarValue);
            } else {
                console.error('Sound bar container not found.');
            }
        }
    },

    generateAmbientButtons(soundFiles, sectionId) {
        const section = document.getElementById(sectionId);
        section.innerHTML = ''; // Clear existing content
    
        soundFiles.forEach(file => {
            const fileName = file.replace('.mp3', '');
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
                const sound = this.categories[sectionId][`assets/${sectionId}/${file}`];
                if(!isRunning && !sound && soundBar.getVolumeFromProgressBar(progressBarContainer) > 0)
                {
                    isRunning = true;
                    this.toggleAmbientSound(`assets/${sectionId}/${file}`, true, progressBarContainer);
                }
                else if(sound && soundBar.getVolumeFromProgressBar(progressBarContainer) == 0)
                {
                    isRunning = false;
                    this.toggleAmbientSound(`assets/${sectionId}/${file}`, true, progressBarContainer);
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
        const soundKey = fileHandleOrPath.name || fileHandleOrPath; // Use the file name or path as key
        let sound = this.categories.soundboard[soundKey];
        if (sound && sound.source) {
            sound.source.stop();
            delete this.categories.soundboard[soundKey];
            button.classList.remove('button-play');
            button.classList.add('button-stop');
        } else {
            const slider = this.findVolumeControl(button);
            const initialVolume = slider ? slider.value / 100 : 1;
            this.createSound(fileHandleOrPath, loop, button, 'soundboard', initialVolume);
        }
    },
}
