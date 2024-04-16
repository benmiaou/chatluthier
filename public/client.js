const AudioManager = {
    audioContext: new (window.AudioContext || window.webkitAudioContext)(),
    activeBackgroundSound: null,
    soundFiles: null,
    type : null,
    categories: {
        background: {},
        ambiance: {},
        soundboard: {}
    },
    backgroudButton : null,

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

    backGroundSoundLoop()
    {
        const soundDirectory = this.type === 'exploration' ? 'assets/background/exploration/' : 'assets/background/battle/';
        const randomFile = this.soundFiles[Math.floor(Math.random() * this.soundFiles.length)];
        const url = soundDirectory + randomFile;
        const playSound = (file) => {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
    
            fetch(file)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    source.buffer = audioBuffer;
                    source.loop = false;
                    source.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);

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
        if (this.activeBackgroundSound) 
        {
            this.activeBackgroundSound.source.onended  = null;
            this.activeBackgroundSound.source.stop();
            this.activeBackgroundSound = null;
            this.backgroudButton.classList.remove('button-play');
            this.backgroudButton.classList.add('button-stop');
            if(type == this.type)
            return;
        }
        this.backgroudButton = button
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

    toggleAmbientSound(url, loop, button) {
        let sound = this.categories.ambiance[url];
        if (sound && sound.source) {
            sound.source.stop();
            delete this.categories.ambiance[url];
            button.classList.remove('button-play');
            button.classList.add('button-stop');
        } else {
            var slider = button.nextElementSibling;  // Assuming the slider is the next sibling in the DOM
            if (!slider) { // If we cannot find the slider, we look for it if inside the element
                slider = button.querySelector('input');
            }
            
            const initialVolume = slider.value / 100;  // Convert slider value to volume level
            this.createSound(url, loop, button, 'ambiance', initialVolume);
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
            this.createSound(url, loop, button, 'soundboard', 1);
        }
    },
    
    createSound(url, loop, button, type, initialVolume) {
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
    
        // Set the initial volume based on the slider's current value
        gainNode.gain.value = initialVolume;
    
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                source.buffer = audioBuffer;
                source.loop = loop;
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                source.start(0);
    
                source.onended = () => {
                    delete this.categories[type][url];
                    button.classList.remove('button-play');
                    button.classList.add('button-stop');
                };
    
                this.categories[type][url] = { source, gainNode };
                button.classList.add('button-play');
                button.classList.remove('button-stop');
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

            const button = document.createElement('button');
            button.textContent = `${fileName}`;
            button.onclick = (e) => {
                //Make sure we're not clicking the slider
                if (e.target.localName != 'input') {
                    this.toggleAmbientSound(`assets/${sectionId}/${file}`, true, button)
                }
            };
            button.classList.add('button-stop', 'button');
    
            const icon = document.createElement('img');
            icon.classList.add('icon');
            icon.setAttribute('src', 'assets/images/icons/'+fileName+'.svg');

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = 0;
            slider.max = 100;
            slider.value = 50;  // Default value, you might want to store this per sound in future
            slider.className = 'volume-slider';
            slider.oninput = () => {
                const sound = this.categories[sectionId][`assets/${sectionId}/${file}`];
                if (sound && sound.gainNode) {
                    sound.gainNode.gain.value = slider.value / 100;
                }
            };
    
            container.appendChild(button);
            button.appendChild(icon);
            button.appendChild(slider);
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