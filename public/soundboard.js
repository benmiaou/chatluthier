const Soundboard = {
    soundboardList: {},
    audioContext : null,
    currentvolume : 0.5,
    soundboardItems : null,

    getAudioContext() 
    {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return  this.audioContext;
    },

    async loadSoundboardButtons()
    {
        const response = await fetch(`/soundboard`);
        this.soundboardItems = await response.json();
        this.generateSoundboardButtons(this.soundboardItems)
    },

    generateSoundboardButtons(soundboardItems) 
    {
        const section = document.getElementById("soundboard");
        section.innerHTML = '';  // Clear existing content

        soundboardItems.forEach(soundboardItem =>
        {
            // Determine if the item is a file handle or a string based on `isLocal`
            const button = document.createElement('button');
            button.textContent = soundboardItem.display_name;
            // If not local, the item is treated as a string path
            button.onclick = () => {
                this.toggleSoundboardSound(soundboardItem, false, button);
            };
            button.classList.add('button-stop', 'button');
            section.appendChild(button);
        });
    },

    toggleSoundboardSound(soundboardItem, loop, button)
    {
        let sound = this.soundboardList[soundboardItem];
        this.createSound(soundboardItem, loop, button);
    },

    createSound(soundboardItem, loop, button, type) 
    {
        const context = this.getAudioContext();
        if (context.state === 'suspended') {
            context.resume();
        }
        
        const source = context.createBufferSource();
        const gainNode = context.createGain();
        gainNode.gain.value = this.currentvolume; // Set the initial volume
    
        const processAudioBuffer = (arrayBuffer) => {
            context.decodeAudioData(arrayBuffer)
                .then(audioBuffer => {
                    source.buffer = audioBuffer;
                    source.loop = loop;
                    source.connect(gainNode);
                    gainNode.connect(context.destination);
                    source.start(0);
    
                    source.onended = () => {
                        delete this.soundboardList[soundboardItem];
                        if (button) {
                            button.classList.remove('button-play');
                            button.classList.add('button-stop');
                        }
                    };
    
                    this.soundboardList[soundboardItem] = { source, gainNode };
                    if (button) {
                        button.classList.add('button-play');
                        button.classList.remove('button-stop');
                    }
                })
                .catch(e => console.error('Error with decoding audio data:', e));
        };
        fetch("assets/soundboard/" + soundboardItem.filename)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => processAudioBuffer(arrayBuffer))
            .catch(e => console.error('Error fetching or decoding audio data:', e));
    },

    setVolume(volume) {
        const gainValue = volume / 100;
        this.currentvolume = gainValue;
        Object.values(this.soundboardList).forEach(sound => {
            if (sound.gainNode) {
                sound.gainNode.gain.value = gainValue;
            }
        });
    },

}