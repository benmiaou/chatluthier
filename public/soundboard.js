const Soundboard = {
    soundboardList: {},
    audioContext: null,
    currentVolume: 0.5,
    soundboardItems: null,
    selectedContext: "All",

    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    },

    async loadSoundboardButtons() {
        let response;
        if (GoogleLogin.userId) {
            response = await fetch(`/soundboard?userId=${GoogleLogin.userId}`);
        } else {
            response = await fetch(`/soundboard`);
        }
        this.soundboardItems = await response.json();
        this.generateSoundboardButtons(this.soundboardItems);
    },

    updateContexts() {
        // Update context-related logic if any
    },

    generateSoundboardButtons(soundboardItems) {
        const section = document.getElementById("soundboard");
        section.innerHTML = '';  // Clear existing content

        soundboardItems.forEach(soundboardItem => {
            // Create a button for each soundboard item
            const button = document.createElement('button');
            button.textContent = soundboardItem.display_name;

            // Create an AudioPlayer instance
            let audioPlayer = new AudioPlayer();
            audioPlayer.playSound("assets/soundboard/" + soundboardItem.filename);

            let clickCount = 0;
            let clickTimer;
            // Set the on ended callback for the audio player
            audioPlayer.setOnEndedCallback(() => {
                if (!audioPlayer.isLooping()) {
                    clickCount = 0;
                    button.classList.remove('button-play');
                    button.classList.add('button-stop');
                }
            });
            // Function to handle the click event
            const handleClick = () => {
                clickCount++;
                
                if (clickCount === 1) {
                    // First click: start playing the audio
                    audioPlayer.play();
                    button.classList.add('button-play');
                    button.classList.remove('button-stop');
                    createModal(soundboardItem.credit); 
                } else if (clickCount === 2) {
                    // Second click: set the audio to loop
                    audioPlayer.setLoop(true);
                    button.classList.add('button-loop');
                } else if (clickCount === 3) {
                    // Third click: stop the audio and reset loop
                    audioPlayer.setLoop(false);
                    audioPlayer.stop();
                    button.classList.remove('button-play', 'button-loop');
                    button.classList.add('button-stop');
                    clickCount = 0;  // Reset the click count
                }
            };

            // Attach the click event handler to the button
            button.addEventListener('click', handleClick);

            // Set the initial classes for the button
            button.classList.add('button-stop', 'button');

            // Store the audio player instance in the soundboard list
            this.soundboardList[soundboardItem.display_name] = audioPlayer;

            // Append the button to the section
            section.appendChild(button);
        });
    },

    setVolume(volume) {
        const gainValue = volume / 100;
        this.currentVolume = gainValue;
        Object.values(this.soundboardList).forEach(sound => {
            sound.setVolume(gainValue);
        });
    },
};