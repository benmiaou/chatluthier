import { BackgroundMusic } from './backgroundMusic.js';
import { AmbianceSounds } from './ambianceSounds.js';
import { SoundBoard } from './soundboard.js';
import { GoogleLogin } from './googleLogin.js';

let currentEditArray = null;
let currentSoundType = 'backgroundMusic';
let currentPath = 'background';
let currentVolume = 0.5;
let currentAudio = null;
let isAdminEditVisible = false;

// Function to display sound data based on sound type
function displaySoundsAdmin(soundType) {
    currentSoundType = soundType;
    const soundsList = document.getElementById('sounds-list');
    soundsList.innerHTML = '';
    displayAllSounds();
}

async function loadSounds(soundType) {
    let soundsArray = [];
    try {
        let response = await fetch(`/${soundType}`);
        soundsArray = await response.json();
    } catch (e) {
        console.error(`Error fetching files from server:`, e);
    }
    return soundsArray;
}

async function displayAllSounds() {
    const soundsList = document.getElementById('sounds-list');
    soundsList.innerHTML = '';
    currentEditArray = await loadSounds(currentSoundType);

    currentEditArray.forEach((sound, index) => {
        if (sound.isEnabled === undefined)
            sound.isEnabled = true;

        // Sort currentEditArray by display_name in alphabetical order
        currentEditArray.sort((a, b) => {
            const nameA = a.display_name.toUpperCase(); // Ignore case
            const nameB = b.display_name.toUpperCase(); // Ignore case
            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }
            return 0;
        });

        const soundItem = document.createElement('div');
        soundItem.className = 'sound-item';

        const contextsContainer = document.createElement('div');
        contextsContainer.className = 'contexts-container';

        // Display name input
        const displayNameInput = document.createElement('input');
        displayNameInput.type = 'text';
        displayNameInput.className = 'text-input';
        displayNameInput.value = sound.display_name;
        displayNameInput.style.marginBottom = '10px';
        displayNameInput.style.width = 'calc(100% - 22px)'; // Adjust width to fit within container

        // Credits input
        const creditsInput = document.createElement('input');
        creditsInput.type = 'text';
        creditsInput.className = 'text-input';
        creditsInput.value = sound.credit;
        creditsInput.style.marginBottom = '10px';
        creditsInput.style.width = 'calc(100% - 22px)'; // Adjust width to fit within container

        // Image input for ambiance sounds
        let imageInput = null;
        if (currentSoundType === 'ambianceSounds') {
            const imageContainer = document.createElement('div');
            imageContainer.style.display = 'flex';
            imageContainer.style.alignItems = 'center';
            imageContainer.style.gap = '10px';
            imageContainer.style.marginBottom = '10px';

            const imageLabel = document.createElement('label');
            imageLabel.textContent = 'Image:';
            imageLabel.style.width = '120px';

            imageInput = document.createElement('input');
            imageInput.type = 'file';
            imageInput.accept = 'image/*';
            imageInput.className = 'text-input';
            imageInput.style.flexGrow = '1';

            const currentImage = document.createElement('img');
            currentImage.src = `assets/images/backgrounds/${sound.imageFile}`;
            currentImage.style.width = '50px';
            currentImage.style.height = '50px';
            currentImage.style.marginLeft = '10px';

            imageContainer.appendChild(imageLabel);
            imageContainer.appendChild(imageInput);
            imageContainer.appendChild(currentImage);
            contextsContainer.appendChild(imageContainer);
        }

        if (currentSoundType === 'backgroundMusic') {
            sound.contexts.forEach((context) => {
                const contextWrapper = document.createElement('div');
                contextWrapper.style.display = 'flex';
                contextWrapper.style.justifyContent = 'space-between';
                contextWrapper.style.alignItems = 'center';
                contextWrapper.style.gap = '10px';

                const typeSelect = document.createElement('select');
                typeSelect.className = "selector-primary";
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
                contextInput.className = "text-input";
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
        } else {
            sound.contexts.forEach((context) => {
                const contextWrapper = document.createElement('div');
                contextWrapper.style.display = 'flex';
                contextWrapper.style.justifyContent = 'space-between';
                contextWrapper.style.alignItems = 'center';
                contextWrapper.style.gap = '10px';

                const contextInput = document.createElement('input');
                contextInput.type = 'text';
                contextInput.className = "text-input";
                contextInput.value = context;

                const removeContextButton = document.createElement('button');
                removeContextButton.textContent = "Remove";
                removeContextButton.className = "button-primary";
                removeContextButton.style.width = '100px';
                removeContextButton.onclick = () => removeContext(contextWrapper);

                contextWrapper.appendChild(contextInput);
                contextWrapper.appendChild(removeContextButton);
                contextsContainer.appendChild(contextWrapper);
            });
        }

        const buttonWrapper = document.createElement('div');
        buttonWrapper.style.display = 'flex';
        buttonWrapper.style.justifyContent = 'center';
        buttonWrapper.style.alignItems = 'center';
        buttonWrapper.style.marginTop = '10px';

        const addContextButton = document.createElement('button');
        addContextButton.textContent = "Add Context";
        addContextButton.className = "button-primary";
        addContextButton.style.width = '120px';
        addContextButton.onclick = () => addContext(contextsContainer, currentSoundType);
        buttonWrapper.appendChild(addContextButton);

        const updateWrapper = document.createElement('div');
        updateWrapper.style.display = 'flex';
        updateWrapper.style.justifyContent = 'center';
        updateWrapper.style.alignItems = 'center';
        updateWrapper.style.marginTop = '10px';

        const updateButton = document.createElement('button');
        updateButton.className = 'update-button';
        updateButton.textContent = "Update";
        updateButton.style.width = '100px';
        updateButton.onclick = () => updateSound(index, contextsContainer, displayNameInput, creditsInput, imageInput);
        updateWrapper.appendChild(updateButton);

        const playerControls = document.createElement('div');
        playerControls.style.display = 'flex';
        playerControls.style.justifyContent = 'center';
        playerControls.style.alignItems = 'center';
        playerControls.style.gap = '10px';
        playerControls.style.marginTop = '10px';

        const playButton = document.createElement('button');
        playButton.innerHTML = '▶';
        playButton.className = "button-primary";
        playButton.style.width = '50px';
        playButton.style.height = '50px';
        playButton.style.display = 'flex';
        playButton.style.justifyContent = 'center';
        playButton.style.alignItems = 'center';
        playButton.onclick = () => togglePlayPause(playButton, sound.filename, progressBar);

        const stopButton = document.createElement('button');
        stopButton.innerHTML = '⏹';
        stopButton.className = "button-primary";
        stopButton.style.width = '50px';
        stopButton.style.height = '50px';
        stopButton.style.display = 'flex';
        stopButton.style.justifyContent = 'center';
        stopButton.style.alignItems = 'center';
        stopButton.onclick = () => stopSound(sound.filename);

        playerControls.appendChild(playButton);
        playerControls.appendChild(stopButton);

        const progressBar = document.createElement('input');
        progressBar.type = "range";
        progressBar.min = 0;
        progressBar.max = 100;
        progressBar.value = 0;
        progressBar.step = 1;
        progressBar.style.marginTop = '10px';
        progressBar.addEventListener('input', () => seekSound(sound.filename, progressBar.value));

        const enableToggleWrapper = document.createElement('div');
        enableToggleWrapper.style.display = 'flex';
        enableToggleWrapper.style.justifyContent = 'center';
        enableToggleWrapper.style.alignItems = 'center';
        enableToggleWrapper.style.marginTop = '10px';

        const enableLabel = document.createElement('label');
        enableLabel.textContent = 'Enabled: ';
        enableLabel.style.marginRight = '10px';

        const enableCheckbox = document.createElement('input');
        enableCheckbox.type = 'checkbox';
        enableCheckbox.checked = sound.isEnabled !== false;
        enableCheckbox.onclick = () => toggleEnableSound(index, enableCheckbox, soundItem);

        enableToggleWrapper.appendChild(enableLabel);
        enableToggleWrapper.appendChild(enableCheckbox);

        soundItem.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <label style="width: 120px;">Display Name:</label>
                    <input type="text" class="text-input" style="flex-grow: 1;">
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <label style="width: 120px;"><strong>Credit:</strong></label>
                    <input type="text" class="text-input" style="flex-grow: 1;">
                </div>
            </div>
        `;

        // Append the actual input elements to the corresponding placeholders
        const displayNameInputPlaceholder = soundItem.querySelector('div:nth-child(1) input');
        displayNameInputPlaceholder.replaceWith(displayNameInput);

        const creditsInputPlaceholder = soundItem.querySelector('div:nth-child(2) input');
        creditsInputPlaceholder.replaceWith(creditsInput);

        const deleteButton = document.createElement('button');
        deleteButton.className = "button-primary";
        deleteButton.textContent = "Delete";
        deleteButton.style.alignItems = 'center';
        deleteButton.style.width = '100px';
        deleteButton.onclick = () => deleteSound(index);

        // Create a div for the progress bar
        const progressBarContainer = document.createElement('div');
        progressBarContainer.style.marginTop = '10px';
        progressBarContainer.appendChild(progressBar);

        // Create a div for the delete button
        const deleteButtonContainer = document.createElement('div');
        deleteButtonContainer.style.marginTop = '10px';
        deleteButtonContainer.style.textAlign = 'center';
        deleteButtonContainer.style.display = 'flex';
        deleteButtonContainer.style.justifyContent = 'center'; 
        deleteButtonContainer.style.alignItems = 'center';
        deleteButtonContainer.appendChild(deleteButton);

        // Append elements to the soundItem
        soundItem.append(contextsContainer, buttonWrapper, enableToggleWrapper, updateWrapper, playerControls, progressBarContainer, deleteButtonContainer);
        soundsList.appendChild(soundItem);

        // Adjust the styling of the soundItem based on its enabled state
        if (currentEditArray[index].isEnabled) {
            soundItem.style.filter = 'grayscale(0)';
        } else {
            soundItem.style.filter = 'grayscale(50%)';
        }
    });
}

function removeContext(contextWrapper) {
    contextWrapper.parentNode.removeChild(contextWrapper);
}

function addContext(contextsContainer, soundType) {
    const contextWrapper = document.createElement('div');
    contextWrapper.className = 'context-wrapper';
    contextWrapper.style.display = 'flex';
    contextWrapper.style.justifyContent = 'space-between';
    contextWrapper.style.alignItems = 'center';
    contextWrapper.style.gap = '10px';
    contextWrapper.style.marginBottom = '10px';

    if (soundType === 'backgroundMusic') {
        const typeSelect = document.createElement('select');
        typeSelect.className = "selector-primary";
        const types = ['calm', 'dynamic', 'intense'];
        types.forEach((type) => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
        });

        const contextInput = document.createElement('input');
        contextInput.type = 'text';
        contextInput.placeholder = 'Enter context...';
        contextInput.className = 'text-input';

        const removeContextButton = document.createElement('button');
        removeContextButton.textContent = "Remove";
        removeContextButton.className = 'button-primary';
        removeContextButton.style.width = '100px';
        removeContextButton.onclick = () => removeContext(contextWrapper);

        contextWrapper.appendChild(typeSelect);
        contextWrapper.appendChild(contextInput);
        contextWrapper.appendChild(removeContextButton);
    } else {
        const contextInput = document.createElement('input');
        contextInput.type = 'text';
        contextInput.placeholder = 'Enter context...';
        contextInput.className = 'text-input';

        const removeContextButton = document.createElement('button');
        removeContextButton.textContent = "Remove";
        removeContextButton.className = 'button-primary';
        removeContextButton.style.width = '100px';
        removeContextButton.onclick = () => removeContext(contextWrapper);

        contextWrapper.appendChild(contextInput);
        contextWrapper.appendChild(removeContextButton);
    }

    contextsContainer.appendChild(contextWrapper);
}

function updateMainPlaylist(currentEditArray, currentSoundType) {
    const updatedData = {
        sounds: currentEditArray,
        soundsType: currentSoundType,
    };
    fetch('/update-main-playlist', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
        credentials: 'include',
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            console.log('Changes sent to server successfully');
        } else {
            console.error('Error updating main playlist:', data.error);
        }
    })
    .catch(error => {
        console.error('Network error:', error);
    });
}

function updateSound(index, contextsContainer, displayNameInput, creditsInput, imageInput) {
    if (index >= 0 && index < currentEditArray.length) {
        let newContexts;
        const contextWrappers = contextsContainer.children;

        if (currentSoundType === 'backgroundMusic') {
            newContexts = [];
            for (const element of contextWrappers) {
                const contextWrapper = element;
                const typeSelect = contextWrapper.querySelector('select');
                const contextInput = contextWrapper.querySelector('input[type="text"]');

                if (typeSelect && contextInput) {
                    newContexts.push([typeSelect.value, contextInput.value]);
                } else {
                    console.warn('Type select or context input not found in contextWrapper:', contextWrapper);
                }
            }
        } else {
            newContexts = [];
            for (const element of contextWrappers) {
                const contextWrapper = element;
                const contextInput = contextWrapper.querySelector('input[type="text"]');

                if (contextInput) {
                    newContexts.push(contextInput.value);
                } else {
                    console.warn('Context input not found in contextWrapper:', contextWrapper);
                }
            }
        }

        currentEditArray[index].contexts = newContexts;
        currentEditArray[index].display_name = displayNameInput.value; // Update display name
        currentEditArray[index].credit = creditsInput.value; // Update credits

        if (currentSoundType === 'ambianceSounds' && imageInput && imageInput.files.length > 0) {
            const file = imageInput.files[0];
            currentEditArray[index].imageFile = file.name; // Update image file name
        }

        if (currentSoundType === 'backgroundMusic') {
            BackgroundMusic.backgroundMusicArray = currentEditArray;
        } else if (currentSoundType === 'ambianceSounds') {
            AmbianceSounds.ambianceSounds = currentEditArray;
        } else if (currentSoundType === 'soundboard') {
            SoundBoard.soundboardItems = currentEditArray;
        }

        console.log('Updated sound:', currentEditArray[index]);
    }

    if (GoogleLogin.userId)
    {
        updateMainPlaylist(currentEditArray, currentSoundType);
    } else {
        console.error('User ID is not available');
    }
}

function deleteSound(index) {
    if (index >= 0 && index < currentEditArray.length) {
        const soundToDelete = currentEditArray[index];
        fetch('/delete-sound', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                soundType: currentSoundType,
                filename: soundToDelete.filename,
            }),
            credentials: 'include',
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                console.log(data.message);
                currentEditArray.splice(index, 1);
                displayAllSounds();
            } else {
                console.error('Error deleting sound:', data.error);
            }
        })
        .catch(error => {
            console.error('Network error:', error);
        });
    }
}

function togglePlayPause(playButton, filename, progressBar) {
    if (currentAudio && decodeURIComponent(currentAudio.src).includes(decodeURIComponent(filename))) {
        if (currentAudio.paused) {
            currentAudio.play();
            playButton.innerHTML = '⏸';
        } else {
            currentAudio.pause();
            playButton.innerHTML = '▶';
        }
    } else {
        playSound(filename, progressBar);
        playButton.innerHTML = '⏸';
    }
}

function setEditVolume(volume) {
    const gainValue = volume / 100;
    currentVolume = gainValue;
    if (currentAudio) {
        currentAudio.volume = gainValue;
    }
}

function playSound(filename, progressBar) {
    if (currentAudio) {
        stopCurrentSound();
    }

    const audio = new Audio(`assets/${currentPath}/${filename}`);
    currentAudio = audio;
    currentAudio.volume = currentVolume;
    audio.play();
    updateProgressBar(audio, progressBar);
    audio.addEventListener('ended', () => {
        currentAudio = null;
    });
}

function pauseSound(filename) {
    if (currentAudio && decodeURIComponent(currentAudio.src).includes(decodeURIComponent(filename))) {
        currentAudio.pause();
    }
}

function stopSound(filename) {
    if (currentAudio && decodeURIComponent(currentAudio.src).includes(decodeURIComponent(filename))) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}

function seekSound(filename, progress) {
    if (currentAudio && decodeURIComponent(currentAudio.src).includes(decodeURIComponent(filename))) {
        const duration = currentAudio.duration;
        const newTime = (progress / 100) * duration;
        currentAudio.currentTime = newTime;
    }
}

function stopCurrentSound() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}

function updateProgressBar(audio, progressBar) {
    if (!progressBar) {
        console.warn('Progress bar not defined');
        return;
    }

    const updateProgress = () => {
        if (audio.ended) return;

        let progress = (audio.currentTime / audio.duration) * 100;
        if (isNaN(progress) || progress === 0) {
            progress = 0;
        }
        progressBar.value = progress;

        requestAnimationFrame(updateProgress);
    };

    requestAnimationFrame(updateProgress);
}

function openEditSoundModalAdmin() {
    const modal = document.getElementById('edit-sound-modal');
    modal.style.display = 'flex';
    isAdminEditVisible = true;
    displayAllSounds();
}

function closeEditSoundModalAdmin() {
    const modal = document.getElementById('edit-sound-modal');
    modal.style.display = 'none';
    isAdminEditVisible = false;
}

function toggleEnableSound(index, enableCheckbox, soundItem) {
    if (index >= 0 && index < currentEditArray.length) {
        currentEditArray[index].isEnabled = enableCheckbox.checked;

        // Adjust the styling of the soundItem based on its enabled state
        if (currentEditArray[index].isEnabled) {
            soundItem.style.filter = 'grayscale(0)';
        } else {
            soundItem.style.filter = 'grayscale(50%)';
        }
    }
}

export {  openEditSoundModalAdmin, closeEditSoundModalAdmin, displaySoundsAdmin, isAdminEditVisible };
