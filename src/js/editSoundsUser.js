import { BackgroundMusic } from './backgroundMusic.js';
import { AmbianceSounds } from './ambianceSounds.js';
import { SoundBoard } from './soundboard.js';
import { GoogleLogin } from './googleLogin.js';

let currentEditArray = null;
let currentSoundType = 'backgroundMusic';
let currentPath = 'background';
let currentVolume = 0.5;
let currentAudio = null;

// Function to display sound data based on sound type
function displaySoundsUser(soundType) {
    const soundsList = document.getElementById('sounds-list');
    soundsList.innerHTML = '';

    if (!currentEditArray || currentSoundType !== soundType) {
        switch (soundType) {
            case 'backgroundMusic':
                currentEditArray = BackgroundMusic.backgroundMusicArray;
                currentSoundType = 'backgroundMusic';
                currentPath = 'background';
                break;
            case 'ambianceSounds':
                currentEditArray = AmbianceSounds.ambianceSounds;
                currentSoundType = 'ambianceSounds';
                currentPath = 'ambiance';
                break;
            case 'soundboard':
                currentEditArray = SoundBoard.soundboardItems;
                currentSoundType = 'soundboard';
                currentPath = 'soundboard';
                break;
            default:
                console.error('Unknown sound type');
        }
    }

    displayAllSounds();
}

function displayAllSounds() {
    const soundsList = document.getElementById('sounds-list');
    soundsList.innerHTML = '';

    switch (currentSoundType) {
        case 'backgroundMusic':
            currentEditArray = BackgroundMusic.backgroundMusicArray;
            break;
        case 'ambianceSounds':
            currentEditArray = AmbianceSounds.ambianceSounds;
            break;
        case 'soundboard':
            currentEditArray = SoundBoard.soundboardItems;
            break;
    }
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

    currentEditArray.forEach((sound, index) => {
        if(sound.isEnabled === undefined)
            sound.isEnabled = true;
        const soundItem = document.createElement('div');
        soundItem.className = 'sound-item';

        const contextsContainer = document.createElement('div');
        contextsContainer.className = 'contexts-container';

        // Display name
        const displayName = document.createElement('div');
        displayName.textContent = `Display Name: ${sound.display_name}`;
        displayName.style.marginBottom = '10px';

        // Credits
        const credits = document.createElement('div');
        credits.innerHTML = `Credit: ${sound.credit}`;
        credits.style.marginBottom = '10px';

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

        const updateButton = document.createElement('button');
        updateButton.className = 'update-button';
        updateButton.textContent = "Update";
        updateButton.style.width = '100px';
        updateButton.onclick = () => updateSound(index, contextsContainer);

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

        const progressBar = document.createElement('input');
        progressBar.type = "range";
        progressBar.min = 0;
        progressBar.max = 100;
        progressBar.value = 0;
        progressBar.step = 1;
        progressBar.style.marginTop = '10px';
        progressBar.addEventListener('input', () => seekSound(sound.filename, progressBar.value));

        soundItem.append(displayName, credits, contextsContainer, buttonWrapper, enableToggleWrapper, updateButton, playerControls, progressBar);
        soundsList.appendChild(soundItem);
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

async function updateSound(index, contextsContainer) {
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

        if (currentSoundType === 'backgroundMusic') {
            BackgroundMusic.backgroundMusicArray = currentEditArray;
        } else if (currentSoundType === 'ambianceSounds') {
            AmbianceSounds.ambianceSounds = currentEditArray;
        } else if (currentSoundType === 'soundboard') {
            SoundBoard.soundboardItems = currentEditArray;
        }

        console.log('Updated sound:', currentEditArray[index]);

        // Send only the changes for the specific index
        const updatedData = {
            userId: GoogleLogin.userId,
            filename: currentEditArray[index].filename,
            isEnabled: currentEditArray[index].isEnabled,
            contexts: newContexts,
            soundsType: currentSoundType,
        };

        fetch('/update-user-sound', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData),
        })
        .then((response) => {
            if (response.ok) {
                console.log('Changes sent to server successfully');
            } else {
                console.error('Error sending changes to server');
            }
        })
        .catch((error) => {
            console.error('Network error:', error);
        });
    }
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

function openEditSoundModalUser() {
    const modal = document.getElementById('edit-sound-modal');
    modal.style.display = 'flex';
    displayAllSounds();
}

function closeEditSoundModalUser() {
    const modal = document.getElementById('edit-sound-modal');
    modal.style.display = 'none';
}

export { displaySoundsUser, openEditSoundModalUser, closeEditSoundModalUser };
