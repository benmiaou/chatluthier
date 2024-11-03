// editSounds.js
import { BackgroundMusic } from './backgroundMusic.js';
import { AmbianceSounds } from './ambianceSounds.js';
import { SoundBoard } from './soundboard.js';


let currentEditArray = null; // Global variable to keep track of the current audio
let currentSoundType = 'backgroundMusic';
let currentPath = 'background';
let currentVolume = 0.5;
let currentAudio = null; // Global variable to keep track of the current audio

// Function to display sound data based on sound type
function displaySounds(soundType) {
    const soundsList = document.getElementById('sounds-list'); // Container to display sound data

    soundsList.innerHTML = ''; // Clear existing content

    // Determine which method to call based on the sound type
    if (!currentEditArray || currentSoundType !== soundType) {
        switch (soundType) {
            case 'backgroundMusic':
                currentEditArray = BackgroundMusic.backgroundMusicArray; // Display background music
                currentSoundType = 'backgroundMusic';
                currentPath = 'background';
                break;
            case 'ambianceSounds':
                currentEditArray = AmbianceSounds.ambianceSounds; // Display ambiance sounds
                currentSoundType = 'ambianceSounds';
                currentPath = 'ambiance';
                break;
            case 'soundboard':
                currentEditArray = SoundBoard.soundboardItems; // Display soundboard
                currentSoundType = 'soundboard';
                currentPath = 'soundboard';
                break;
            default:
                console.error('Unknown sound type'); // Handle unexpected sound types
        }
    }

    displayAllBackgroundMusic();
}

function displayAllBackgroundMusic() {
    const soundsList = document.getElementById('sounds-list');
    soundsList.innerHTML = ''; // Clear existing content

    if (!currentEditArray) currentEditArray = BackgroundMusic.backgroundMusicArray;

    currentEditArray.forEach((sound, index) => {
        const soundItem = document.createElement('div');
        soundItem.className = 'sound-item'; // Unique class for sound items

        const contextsLabel = document.createElement('label');
        contextsLabel.textContent = "Contexts:";

        const contextsContainer = document.createElement('div');
        contextsContainer.className = 'contexts-container';

        sound.contexts.forEach((context, contextIndex) => {
            const contextWrapper = document.createElement('div');
            contextWrapper.className = 'context-wrapper';

            const typeSelect = document.createElement('select');
            const types = ['calm', 'dynamic', 'intense']; // Example sound types
            types.forEach((type) => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                if (context[0] === type) {
                    option.selected = true; // Select the current type
                }
                typeSelect.appendChild(option);
            });

            const contextInput = document.createElement('input');
            contextInput.type = 'text';
            contextInput.value = context[1]; // Display existing context

            // Create the "Remove Context" button
            const removeContextButton = document.createElement('button');
            removeContextButton.textContent = "Remove";
            removeContextButton.onclick = () => removeContext(contextWrapper);

            // Append elements to the context wrapper
            contextWrapper.appendChild(typeSelect);
            contextWrapper.appendChild(contextInput);
            contextWrapper.appendChild(removeContextButton);

            // Append the context wrapper to the contexts container
            contextsContainer.appendChild(contextWrapper);
        });

        const addContextButton = document.createElement('button');
        addContextButton.textContent = "Add Context";
        addContextButton.onclick = () => addContext(contextsContainer);

        const updateButton = document.createElement('button');
        updateButton.className = 'update-button'; // Apply the class to style the button
        updateButton.textContent = "Update"; // Set the text for the button
        updateButton.onclick = () => updateSound(index, contextsContainer); // Set the click event

        // Player controls and progress bar
        const progressBar = document.createElement('input');
        progressBar.value = 0;
        progressBar.type = "range";
        progressBar.min = 0;
        progressBar.max = 100;
        progressBar.step = 1;
        progressBar.addEventListener('input', () => {
            seekSound(sound.filename, progressBar.value); // Allow seeking
        });

        const playerControls = document.createElement('div');
        playerControls.className = 'sound-player-controls'; // Flex layout for player controls

        const playButton = document.createElement('button');
        playButton.innerHTML = '▶'; // Unicode symbol for play
        playButton.onclick = () => togglePlayPause(playButton, sound.filename, progressBar); // Set the play action

        const stopButton = document.createElement('button');
        stopButton.innerHTML = '⏹'; // Unicode symbol for stop
        stopButton.onclick = () => stopSound(sound.filename); // Set the stop action

        playerControls.append(playButton, stopButton);

        soundItem.innerHTML = `
            <h3>${sound.display_name}</h3>
            <p><strong>Credit:</strong> ${sound.credit}</p>
        `;
        soundItem.append(contextsLabel, contextsContainer, addContextButton, updateButton, playerControls, progressBar); // Add elements to the sound item
        soundsList.appendChild(soundItem);
    });
}

// Function to remove a context
function removeContext(contextWrapper) {
    // Remove the context from the UI
    contextWrapper.parentNode.removeChild(contextWrapper);
    // The context will be removed from the data when "Update" is clicked
}

function addContext(contextsContainer) {
    const contextWrapper = document.createElement('div');
    contextWrapper.className = 'context-wrapper';

    const typeSelect = document.createElement('select');
    const types = ['calm', 'dynamic', 'intense']; // Example sound types
    types.forEach((type) => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
    });

    const contextInput = document.createElement('input');
    contextInput.type = 'text';

    // Create the "Remove Context" button
    const removeContextButton = document.createElement('button');
    removeContextButton.textContent = "Remove";
    removeContextButton.onclick = () => removeContext(contextWrapper);

    contextWrapper.appendChild(typeSelect);
    contextWrapper.appendChild(contextInput);
    contextWrapper.appendChild(removeContextButton);

    contextsContainer.appendChild(contextWrapper);
}

function updateSound(index, contextsContainer) {
    if (index >= 0 && index < currentEditArray.length) {
        const newContexts = [];
        const contextWrappers = contextsContainer.children;

        for (let i = 0; i < contextWrappers.length; i++) {
            const contextWrapper = contextWrappers[i];
            const typeSelect = contextWrapper.querySelector('select');
            const contextInput = contextWrapper.querySelector('input[type="text"]');

            // Ensure elements are found before accessing their values
            if (typeSelect && contextInput) {
                newContexts.push([typeSelect.value, contextInput.value]);
            } else {
                console.warn('Type select or context input not found in contextWrapper:', contextWrapper);
            }
        }

        currentEditArray[index].contexts = newContexts;

        // Update the main data arrays
        if (currentSoundType === 'backgroundMusic') {
            BackgroundMusic.backgroundMusicArray = currentEditArray;
        } else if (currentSoundType === 'ambianceSounds') {
            AmbianceSounds.ambianceSounds = currentEditArray;
        } else if (currentSoundType === 'soundboard') {
            SoundBoard.soundboardItems = currentEditArray;
        }

        console.log('Updated sound:', currentEditArray[index]); // Debug output
    }

    displayAllBackgroundMusic(); // Refresh the display

    // Send the updated array to the server with the Google User ID
    if (GoogleLogin.userId) {
        const updatedData = {
            userId: GoogleLogin.userId,
            sounds: currentEditArray,
            soundsType: currentSoundType,
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
    if (currentAudio && decodeURIComponent(currentAudio.src).includes(decodeURIComponent(filename))) {
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

// Function to set the volume
function setEditVolume(volume) {
    const gainValue = volume / 100; // Convert to a range between 0 and 1
    currentVolume = gainValue; // Update the current volume
    if (currentAudio) {
        currentAudio.volume = gainValue; // Set the gain value
    }
}

// Function to play a sound
function playSound(filename, progressBar) {
    if (currentAudio) {
        stopCurrentSound(); // Stop any currently playing sound
    }

    const audio = new Audio(`assets/${currentPath}/${filename}`);
    currentAudio = audio;
    currentAudio.volume = currentVolume;
    audio.play(); // Start playing the sound
    updateProgressBar(audio, progressBar); // Update the progress bar
    audio.addEventListener('ended', () => {
        currentAudio = null; // Reset when the sound ends
    });
}

function pauseSound(filename) {
    if (currentAudio && decodeURIComponent(currentAudio.src).includes(decodeURIComponent(filename))) {
        currentAudio.pause(); // Pause the sound
    }
}

function stopSound(filename) {
    if (currentAudio && decodeURIComponent(currentAudio.src).includes(decodeURIComponent(filename))) {
        currentAudio.pause();
        currentAudio.currentTime = 0; // Reset to the beginning
        currentAudio = null;
    }
}

function seekSound(filename, progress) {
    if (currentAudio && decodeURIComponent(currentAudio.src).includes(decodeURIComponent(filename))) {
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


export {openEditSoundModal, closeEditSoundModal}