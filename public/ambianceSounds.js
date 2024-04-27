const AmbianceSounds = {

    currentAmbiances: {},
    audioContext : null,
    ambianceSounds : null, 

    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return  this.audioContext;
    },

    async loadAmbianceButtons()
    {
        const response = await fetch(`/ambianceSounds`);
        this.ambianceSounds = await response.json();
        this.generateAmbientButtons(this.ambianceSounds)
    },

    generateAmbientButtons(ambianceSounds) {
        const section = document.getElementById("ambiance");
        section.innerHTML = ''; // Clear existing content
    
        ambianceSounds.forEach(ambianceSound => {
            const container = document.createElement('div');
            container.className = 'sound-container';
    
            // Create a div for the sound bar
            const soundBarDiv = document.createElement('div');
            soundBarDiv.id = `sound-bar-${ambianceSound.filename}`; // Set a unique ID for the sound bar
            soundBarDiv.className = 'sound-bar'; // Apply styling to the sound bar
    
            // Append the sound bar div to the container
            container.appendChild(soundBarDiv);
            let isRunning = false;
            // Assuming 'soundBar' is the object exported from 'soundBar.js'
            const progressBarContainer = soundBar.createProgressBar(ambianceSound);
            progressBarContainer.addEventListener('soundBarValueChanged', () => 
            {
                const sound = this.currentAmbiances[ambianceSound.filename];
                if(!isRunning && !sound && soundBar.getVolumeFromProgressBar(progressBarContainer) > 0)
                {
                    isRunning = true;
                    this.toggleAmbientSound(ambianceSound, progressBarContainer);
                }
                else if(sound && soundBar.getVolumeFromProgressBar(progressBarContainer) == 0)
                {
                    isRunning = false;
                    this.toggleAmbientSound(ambianceSound, progressBarContainer);
                }
                else if (sound?.gainNode) 
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

    toggleAmbientSound(ambianceSound, soundBarContainer) 
    {
        let sound = this.currentAmbiances[ambianceSound.filename];
        if (sound?.source) 
        {
            sound.source.stop();
            delete this.currentAmbiances[ambianceSound.filename];
        } 
        // Find the parent container of the button, which should contain the sound bar
        else  if (soundBarContainer) 
        {
            // Retrieve the volume value from the sound bar
            const soundBarValue = soundBar.getVolumeFromProgressBar(soundBarContainer);
            // Use the sound bar value as the initial volume
            this.createSound(ambianceSound, null, 'ambiance', soundBarValue);
        } 
        else 
        {
            console.error('Sound bar container not found.');
        }
    },

    createSound(ambianceSound, initialVolume) 
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
                    source.loop = true;
                    source.connect(gainNode);
                    gainNode.connect(context.destination);
                    source.start(0);
                    this.currentAmbiances[ambianceSound.filename] = { source, gainNode };
                })
                .catch(e => console.error('Error with decoding audio data:', e));
        };
        fetch("assets/ambiance/" + ambianceSound.filename)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => processAudioBuffer(arrayBuffer))
            .catch(e => console.error('Error fetching or decoding audio data:', e));
    },
}