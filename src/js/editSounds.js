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
        soundItem.className = 'sound-item';

        const contextsContainer = document.createElement('div');
        contextsContainer.className = 'contexts-container';

        // Display contexts with "Remove" buttons
        sound.contexts.forEach((context) => {
            const contextWrapper = document.createElement('div');
            contextWrapper.style.display = 'flex';
            contextWrapper.style.justifyContent = 'space-between';
            contextWrapper.style.alignItems = 'center';
            contextWrapper.style.gap = '10px';

            const typeSelect = document.createElement('select');
            typeSelect.className = "selector-primary"
            const types = ['calm', 'dynamic', 'intense'];
            types.forEach((type) => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                if (context[0] === type) {
                    option.selected = true;
                }
                typeSelect.appendChild(option);
            });

            const contextInput = document.createElement('input');
            contextInput.type = 'text';
            contextInput.className = "text-input"
            contextInput.value = context[1];

            const removeContextButton = document.createElement('button');
            removeContextButton.textContent = "Remove";
            removeContextButton.className = "button-primary";
            removeContextButton.style.width = '100px';
            removeContextButton.onclick = () => removeContext(contextWrapper);

            contextWrapper.appendChild(typeSelect);
            contextWrapper.appendChild(contextInput);
            contextWrapper.appendChild(removeContextButton);
            contextsContainer.appendChild(contextWrapper);
        });

        // Create "Add Context" button (centered)
        const buttonWrapper = document.createElement('div');
        buttonWrapper.style.display = 'flex';
        buttonWrapper.style.justifyContent = 'center';
        buttonWrapper.style.alignItems = 'center';
        buttonWrapper.style.marginTop = '10px';

        const addContextButton = document.createElement('button');
        addContextButton.textContent = "Add Context";
        addContextButton.className = "button-primary";
        addContextButton.style.width = '120px';
        addContextButton.onclick = () => addContext(contextsContainer);
        buttonWrapper.appendChild(addContextButton);

        // Create "Update" button (centered)
        const updateWrapper = document.createElement('div');
        updateWrapper.style.display = 'flex';
        updateWrapper.style.justifyContent = 'center';
        updateWrapper.style.alignItems = 'center';
        updateWrapper.style.marginTop = '10px';

        const updateButton = document.createElement('button');
        updateButton.className = 'update-button';
        updateButton.textContent = "Update";
        updateButton.style.width = '100px';
        updateButton.onclick = () => updateSound(index, contextsContainer);
        updateWrapper.appendChild(updateButton);

        // Player controls and progress bar
        const playerControls = document.createElement('div');
        playerControls.style.display = 'flex';
        playerControls.style.justifyContent = 'center';
        playerControls.style.alignItems = 'center';
        playerControls.style.gap = '10px';
        playerControls.style.marginTop = '10px';

        const playButton = document.createElement('button');
        playButton.innerHTML = '▶';
        playButton.style.width = '50px';
        playButton.style.height = '50px';
        playButton.style.display = 'flex';
        playButton.style.justifyContent = 'center';
        playButton.style.alignItems = 'center';
        playButton.onclick = () => togglePlayPause(playButton, sound.filename, progressBar);

        const stopButton = document.createElement('button');
        stopButton.innerHTML = '⏹';
        stopButton.style.width = '50px';
        stopButton.style.height = '50px';
        stopButton.style.display = 'flex';
        stopButton.style.justifyContent = 'center';
        stopButton.style.alignItems = 'center';
        stopButton.onclick = () => stopSound(sound.filename);

        playerControls.appendChild(playButton);
        playerControls.appendChild(stopButton);

        // Create progress bar
        const progressBar = document.createElement('input');
        progressBar.type = "range";
        progressBar.min = 0;
        progressBar.max = 100;
        progressBar.value = 0;
        progressBar.step = 1;
        progressBar.style.marginTop = '10px';
        progressBar.addEventListener('input', () => seekSound(sound.filename, progressBar.value));

        // Append elements to sound item
        soundItem.innerHTML = `
            <h3>${sound.display_name}</h3>
            <p><strong>Credit:</strong> ${sound.credit}</p>
        `;
        soundItem.append(contextsContainer, buttonWrapper, updateWrapper, playerControls, progressBar);
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
    contextWrapper.style.display = 'flex';
    contextWrapper.style.justifyContent = 'space-between';
    contextWrapper.style.alignItems = 'center';
    contextWrapper.style.gap = '10px';
    contextWrapper.style.marginBottom = '10px'; // Spacing between contexts

    // Create select input for types
    const typeSelect = document.createElement('select');
    const types = ['calm', 'dynamic', 'intense'];
    typeSelect.className = "selector-primary"
    
    types.forEach((type) => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
    });

    // Create input for context description
    const contextInput = document.createElement('input');
    contextInput.type = 'text';
    contextInput.placeholder = 'Enter context...';
    contextInput.className = 'text-inpu'

    // Create the "Remove" button
    const removeContextButton = document.createElement('button');
    removeContextButton.textContent = "Remove";
    removeContextButton.className = 'button-primary';
    removeContextButton.style.width = '100px';
    removeContextButton.style.display = 'flex';
    removeContextButton.style.justifyContent = 'center';
    removeContextButton.style.alignItems = 'center';
    removeContextButton.onclick = () => removeContext(contextWrapper);

    // Append elements to the context wrapper
    contextWrapper.appendChild(typeSelect);
    contextWrapper.appendChild(contextInput);
    contextWrapper.appendChild(removeContextButton);

    // Add the context to the container
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