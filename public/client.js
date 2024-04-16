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
            console.log("Stop")
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

    toggleSoundboardSound(url, loop, button) {
        let sound = this.categories.soundboard[url];
        if (sound && sound.source) {
            sound.source.stop();
            delete this.categories.soundboard[url];
            button.classList.remove('button-play');
            button.classList.add('button-stop');
        } else {
            const slider = document.getElementById('soundboard-volume'); // Assuming the slider is the next sibling in the DOM
            if (!slider) { // If we cannot find the slider, we look for it if inside the element
                slider = button.querySelector('input');
            }
            const initialVolume = slider.value / 100; // Convert slider value to volume level
            this.createSound(url, loop, button, 'soundboard', initialVolume);
        }
    },

    createSound(url, loop, button, type, initialVolume) {
        const context = this.getAudioContext();
        if (context.state === 'suspended') {
            context.resume();
        }
        const source = this.getAudioContext().createBufferSource();
        const gainNode = this.getAudioContext().createGain();

        // Set the initial volume based on the slider's current value
        gainNode.gain.value = initialVolume;

        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.getAudioContext().decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                source.buffer = audioBuffer;
                source.loop = loop;
                source.connect(gainNode);
                gainNode.connect(this.getAudioContext().destination);
                source.start(0);

                source.onended = () => {
                    delete this.categories[type][url];
                    if(button)
                    {
                        button.classList.remove('button-play');
                        button.classList.add('button-stop');
                    }
                };

                this.categories[type][url] = { source, gainNode };
                if(button)
                {
                    button.classList.add('button-play');
                    button.classList.remove('button-stop');
                }
            })
            .catch(e => console.error('Error with decoding audio data', e));
    },


    setVolume(type, volume) {
        const gainValue = volume / 100;
        Object.values(this.categories[type]).forEach(sound => {
            if (sound.gainNode) {
                sound.gainNode.gain.value = gainValue;
            }
        });
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

    
    
    generateSoundboardButtons(soundFiles, sectionId) {
        const section = document.getElementById(sectionId);
        section.innerHTML = ''; // Clear existing content

        soundFiles.forEach(file => {
            const fileName = file.replace('.mp3', '');
            const button = document.createElement('button');
            button.textContent = fileName;
            button.onclick = () => this.toggleSoundboardSound(`assets/${sectionId}/${file}`, false, button);
            button.classList.add('button-stop', 'button');
            section.appendChild(button);
        });
    },
}
