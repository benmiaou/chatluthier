let currentEditArray = null; // Global variable to keep track of the current audio
let currentSoundType = 'backgroundMusic';
let currentPath = 'background'
// Function to display sound data based on sound type
function displaySounds(soundType) {
    const soundsList = document.getElementById('sounds-list'); // Container to display sound data

    soundsList.innerHTML = ''; // Clear existing content

    // Determine which method to call based on the sound type
    switch (soundType) {
        case 'backgroundMusic':
            currentEditArray = BackgroundMusic.backgroundMusicArray; // Display background music
            currentSoundType = 'backgroundMusic';
            currentPath = 'background'
            break;
        case 'ambianceSounds':
            currentEditArray = AmbianceSounds.ambianceSounds; // Display ambiance sounds
            currentSoundType = 'ambianceSounds';
            currentPath = 'ambiance'
            break;
        case 'soundboard':
            currentEditArray = Soundboard.soundboardItems; // Display soundboard
            currentSoundType = 'soundboard';
            currentPath = 'soundboard'
            break;
        default:
            console.error('Unknown sound type'); // Handle unexpected sound types
    }
    displayAllBackgroundMusic();
}

function displayAllBackgroundMusic() {
    const soundsList = document.getElementById('sounds-list');
    soundsList.innerHTML = ''; // Clear existing content

    if(!currentEditArray)
        currentEditArray = BackgroundMusic.backgroundMusicArray;
    currentEditArray.forEach((sound, index) => {
        const soundItem = document.createElement('div');
        soundItem.className = 'sound-item'; // Unique class for sound items

        const contextsLabel = document.createElement('label');
        contextsLabel.textContent = "Contexts:";
        contextsLabel.setAttribute('for', `contexts-input-${index}`);

        const contextsInput = document.createElement('input');
        contextsInput.type = 'text';
        contextsInput.value = sound.contexts.join(', '); // Display existing contexts

        const typeLabel = document.createElement('label');
        typeLabel.textContent = "Type:";
        typeLabel.setAttribute('for', `type-select-${index}`);

        const typeSelect = document.createElement('select');
        if(sound.types)
        {
            const types = ['calm', 'dynamic', 'intense']; // Example sound types
            types.forEach((type) => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                if (sound.types.includes(type)) {
                    option.selected = true; // Select the current type
                }
                typeSelect.appendChild(option);
            });
        }
        const progressBar = document.createElement('input');
        progressBar.value = 0;
        progressBar.type = "range";
        progressBar.min = 0;
        progressBar.max = 100;
        progressBar.step = 1;
        progressBar.addEventListener('input', () => {
            seekSound(sound.filename, progressBar.value); // Allow seeking
        });


        const updateButton = document.createElement('button');
        updateButton.className = 'update-button'; // Apply the class to style the button
        updateButton.textContent = "Update"; // Set the text for the button
        updateButton.onclick = () => updateSound(index, contextsInput.value, typeSelect.value); // Set the click event

        const playerControls = document.createElement('div');
        playerControls.className = 'sound-player-controls'; // Flex layout for player controls
        
        const playButton = document.createElement('button');
        playButton.innerHTML = '▶'; // Unicode symbol for play
        playButton.onclick = () => togglePlayPause(playButton, sound.filename, progressBar); // Set the play action
        
        const stopButton = document.createElement('button');
        stopButton.innerHTML = '⏹'; // Unicode symbol for stop
        stopButton.onclick = () => stopSound(sound.filename); // Set the stop action
        
        playerControls.append(playButton, stopButton);
        const typeContainer = document.createElement('div'); // New container for type and update button
        typeContainer.className = 'type-container'; // Apply custom CSS class
        typeContainer.append(typeLabel, typeSelect, updateButton); // Add elements to the new container

        soundItem.innerHTML = `
            <h3>${sound.display_name}</h3>
            <p><strong>Credit:</strong> ${sound.credit}</p>
        `;
        soundItem.append(contextsLabel, contextsInput, typeContainer, playerControls, progressBar); // Add elements to the sound item
        soundsList.appendChild(soundItem);
    });
}
let currentAudio = null; // Global variable to keep track of the current audio

function updateSound(index, newContexts, newType) {
    // Update contexts and type for the given index
    if (index >= 0 && index < currentEditArray.length) {
        const contexts = newContexts.split(',').map((c) => c.trim()); // Split and trim contexts
        currentEditArray[index].contexts = contexts;

        currentEditArray[index].types = [newType]; // Update the type
        BackgroundMusic.updatecontexts();
        Soundboard.updatecontexts();
        AmbianceSounds.updatecontexts();
        console.log('Updated sound:', currentEditArray[index]); // Debug output
    }

    displayAllBackgroundMusic(); // Refresh the display
     // Send the updated array to the server with the Google User ID
     if (GoogleLogin.userId) {
        const updatedData = {
            userId: GoogleLogin.userId,
            sounds: currentEditArray,
            soundsType : currentSoundType,
        };

        fetch('/update-user-sounds', {
            method: 'POST', // HTTP POST method to send data to the server
            headers: {
                'Content-Type': 'application/json', // JSON content type
            },
            body: JSON.stringify(updatedData), // Convert the data to a JSON string
        })
        .then((response) => {
            if (response.ok) {
                console.log('Data sent to server successfully');
            } else {
                console.error('Error sending data to server');
            }
        })
        .catch((error) => {
            console.error('Network error:', error);
        });
    } else {
        console.error('User ID is not available'); // Handle cases where user ID is missing
    }
}

function togglePlayPause(playButton, filename, progressBar) {
    if (currentAudio && currentAudio.src.includes(filename)) {
        if (currentAudio.paused) {
            currentAudio.play(); // Resume playing if paused
            playButton.innerHTML = '⏸'; // Change button icon to "Pause"
        } else {
            currentAudio.pause(); // Pause if playing
            playButton.innerHTML = '▶'; // Change button icon to "Play"
        }
    } else {
        playSound(filename, progressBar); // Play the sound if not playing
        playButton.innerHTML = '⏸'; // Change button icon to "Pause"
    }
}

function playSound(filename, progressBar) {
    if (currentAudio) {
        stopCurrentSound(); // Stop any currently playing sound
    }

    const audio = new Audio(`assets/${currentPath}/${filename}`);
    currentAudio = audio;

    audio.play(); // Start playing the sound
    updateProgressBar(audio, progressBar); // Update the progress bar
    audio.addEventListener('ended', () => {
        currentAudio = null; // Reset when the sound ends
    });
}

function pauseSound(filename) {
    if (currentAudio && currentAudio.src.includes(filename)) {
        currentAudio.pause(); // Pause the sound
    }
}

function stopSound(filename) {
    if (currentAudio && currentAudio.src.includes(filename)) {
        currentAudio.pause();
        currentAudio.currentTime = 0; // Reset to the beginning
        currentAudio = null;
    }
}

function seekSound(filename, progress) {
    if (currentAudio && currentAudio.src.includes(filename)) {
        const duration = currentAudio.duration;
        const newTime = (progress / 100) * duration; // Calculate the new playback time
        currentAudio.currentTime = newTime; // Set the audio to the new time
    }
}

function stopCurrentSound() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0; // Reset to the beginning
        currentAudio = null; // Reset the current audio
    }
}

function updateProgressBar(audio, progressBar) {
    if (!progressBar) {
        console.warn('Progress bar not defined'); // Log warning if undefined
        return; // Exit if not defined
    }


    const updateProgress = () => {
        if (audio.ended) return; // Stop updating if the audio ends

        let progress = (audio.currentTime / audio.duration) * 100;
        if (isNaN(progress) || progress === 0) { // Handle invalid progress values
            progress = 0; // Set to zero if NaN or invalid
        }
        progressBar.value = progress; // Update the progress bar

        requestAnimationFrame(updateProgress); // Continue updating
    };

    requestAnimationFrame(updateProgress); // Start the update loop
}

function openEditSoundModal() {
    const modal = document.getElementById('edit-sound-modal');
    modal.style.display = 'flex'; // Show the modal
    displayAllBackgroundMusic(); // Populate the content with sounds
}

function closeEditSoundModal() {
    const modal = document.getElementById('edit-sound-modal');
    modal.style.display = 'none'; // Hide the modal
}