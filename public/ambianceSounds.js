const AmbianceSounds = {

    currentAmbiances: {},
    audioContext : null,
    ambianceSounds : null, 
    selectedContext : "All",

    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return  this.audioContext;
    },

    async loadAmbianceButtons()
    {
        let response;
        if (GoogleLogin.userId) 
        {
            response = await fetch(`/ambianceSounds?userId=${GoogleLogin.userId}`);
        }
        else
        {
            response = await fetch(`/ambianceSounds`);
        }
        this.ambianceSounds = await response.json();
        this.generateAmbientButtons(this.ambianceSounds)
    },

    updatecontexts()
    {

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
            const soundBar = new SoundBar(ambianceSound);
            container.appendChild(soundBar.getElement());
            
            // Append the container to the section
            section.appendChild(container);
        });
    }
}