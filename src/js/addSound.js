import { GoogleLogin } from './googleLogin.js'; // Newly added import


// Function to display the form for adding a new sound
function displayAddSoundForm() {
    const formContainer = document.getElementById('add-sound-form-container');
    formContainer.innerHTML = ''; // Clear existing content
    formContainer.style.display = 'flex';
    formContainer.style.justifyContent = 'center';
    formContainer.style.alignItems = 'flex-start'; // Align items to the top
    formContainer.style.flexDirection = 'column';
    formContainer.style.width = '100%'; // Ensure full width for centering
    formContainer.style.boxSizing = 'border-box'; // Include padding in the element's total width and height

    const form = document.createElement('form');
    form.id = 'addSoundForm';
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.alignItems = 'center';
    form.style.width = '300px'; // Fixed width for the form
    form.style.margin = '0 auto'; // Center the form horizontally within the container

    // Create form elements
    const categoryLabel = document.createElement('label');
    categoryLabel.textContent = 'Category:';
    categoryLabel.style.marginBottom = '10px';
    const categorySelect = document.createElement('select');
    categorySelect.id = 'category';
    categorySelect.required = true;
    categorySelect.style.marginBottom = '10px';
    ['Background Music', 'Ambiance Sounds', 'Soundboard'].forEach(category => {
        const option = document.createElement('option');
        option.value = category.replace(' ', '').toLowerCase();
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    const fileLabel = document.createElement('label');
    fileLabel.textContent = 'Select File:';
    fileLabel.style.marginBottom = '10px';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'fileInput';
    fileInput.accept = 'audio/*'; // Restrict to audio files
    fileInput.required = true;
    fileInput.style.marginBottom = '10px';

    const displayNameLabel = document.createElement('label');
    displayNameLabel.textContent = 'Display Name:';
    displayNameLabel.style.marginBottom = '10px';
    const displayNameInput = document.createElement('input');
    displayNameInput.type = 'text';
    displayNameInput.id = 'displayName';
    displayNameInput.required = true;
    displayNameInput.style.marginBottom = '10px';

    const contextsContainer = document.createElement('div');
    contextsContainer.id = 'contextsContainer';
    contextsContainer.style.marginBottom = '10px';
    contextsContainer.style.width = '100%';

    const creditLabel = document.createElement('label');
    creditLabel.textContent = 'Credit:';
    creditLabel.style.marginBottom = '10px';
    const creditInput = document.createElement('input');
    creditInput.type = 'text';
    creditInput.id = 'credit';
    creditInput.style.marginBottom = '20px';

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Add Sound';
    submitButton.className = "button-primary";

    // Append elements to the form
    form.appendChild(categoryLabel);
    form.appendChild(categorySelect);
    form.appendChild(fileLabel);
    form.appendChild(fileInput);
    form.appendChild(displayNameLabel);
    form.appendChild(displayNameInput);
    form.appendChild(contextsContainer);
    form.appendChild(creditLabel);
    form.appendChild(creditInput);
    form.appendChild(submitButton);

    // Append form to the container
    formContainer.appendChild(form);

    // Add event listener for form submission
    form.addEventListener('submit', handleAddSoundFormSubmit);

    // Add event listener for category change
    categorySelect.addEventListener('change', updateContextEditor);

    // Initialize context editor based on the default category
    updateContextEditor();

    function updateContextEditor() {
        const selectedCategory = categorySelect.value;
        contextsContainer.innerHTML = ''; // Clear existing context editor

        if (selectedCategory === 'backgroundmusic') {
            displayBackgroundMusicContextEditor();
        } else if (selectedCategory === 'ambiancesounds') {
            displayAmbianceSoundsContextEditor();
        } else if (selectedCategory === 'soundboard') {
            displaySoundboardContextEditor();
        }
    }

    function displayBackgroundMusicContextEditor() {
        const contextsLabel = document.createElement('label');
        contextsLabel.textContent = 'Contexts (format: type - context, separated by commas):';
        contextsLabel.style.marginBottom = '10px';
        const contextsInput = document.createElement('textarea');
        contextsInput.id = 'contexts';
        contextsInput.rows = 4;
        contextsInput.required = true;
        contextsInput.style.marginBottom = '10px';
        contextsInput.style.width = '100%';

        const addContextButton = document.createElement('button');
        addContextButton.textContent = 'Add Context';
        addContextButton.className = "button-primary";
        addContextButton.style.marginBottom = '10px';
        addContextButton.onclick = () => addContext('backgroundmusic');
        contextsContainer.appendChild(addContextButton);
    }

    function displayAmbianceSoundsContextEditor() {
        const contextsLabel = document.createElement('label');
        contextsLabel.textContent = 'Contexts (comma-separated):';
        contextsLabel.style.marginBottom = '10px';
        const contextsInput = document.createElement('input');
        contextsInput.type = 'text';
        contextsInput.id = 'contexts';
        contextsInput.required = true;
        contextsInput.style.marginBottom = '10px';
        contextsInput.style.width = '100%';

        const imageLabel = document.createElement('label');
        imageLabel.textContent = 'Select Image:';
        imageLabel.style.marginBottom = '10px';
        const imageInput = document.createElement('input');
        imageInput.type = 'file';
        imageInput.id = 'imageInput';
        imageInput.accept = 'image/*'; // Restrict to image files
        imageInput.style.marginBottom = '10px';

        contextsContainer.appendChild(contextsLabel);
        contextsContainer.appendChild(contextsInput);
        contextsContainer.appendChild(imageLabel);
        contextsContainer.appendChild(imageInput);
    }

    function displaySoundboardContextEditor() {
        const contextsLabel = document.createElement('label');
        contextsLabel.textContent = 'Contexts (comma-separated):';
        contextsLabel.style.marginBottom = '10px';
        const contextsInput = document.createElement('input');
        contextsInput.type = 'text';
        contextsInput.id = 'contexts';
        contextsInput.required = true;
        contextsInput.style.marginBottom = '10px';
        contextsInput.style.width = '100%';

        contextsContainer.appendChild(contextsLabel);
        contextsContainer.appendChild(contextsInput);
    }

    function addContext(category) {
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
            typeSelect.appendChild(option);
        });

        const contextInput = document.createElement('input');
        contextInput.type = 'text';
        contextInput.className = "text-input";

        const removeContextButton = document.createElement('button');
        removeContextButton.textContent = "Remove";
        removeContextButton.className = "button-primary";
        removeContextButton.style.width = '100px';
        removeContextButton.onclick = () => removeContext(contextWrapper);

        contextWrapper.appendChild(typeSelect);
        contextWrapper.appendChild(contextInput);
        contextWrapper.appendChild(removeContextButton);
        contextsContainer.appendChild(contextWrapper);
    }

    function removeContext(contextWrapper) {
        contextsContainer.removeChild(contextWrapper);
    }
}

// Function to handle form submission
async function handleAddSoundFormSubmit(event) {
    event.preventDefault();

    const category = document.getElementById('category').value;
    const fileInput = document.getElementById('fileInput');
    const displayName = document.getElementById('displayName').value;
    const contexts = document.getElementById('contexts').value;
    const credit = document.getElementById('credit').value;

    if (fileInput.files.length === 0) {
        alert('Please select a file.');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('category', category);
    formData.append('file', file);
    formData.append('display_name', displayName);
    formData.append('contexts', contexts);
    formData.append('credit', credit);
    formData.append('userId', GoogleLogin.userId);
    formData.append('idToken', GoogleLogin.idToken);
    if (category === 'ambiancesounds') {
        const imageInput = document.getElementById('imageInput');
        if (imageInput.files.length > 0) {
            const imageFile = imageInput.files[0];
            formData.append('imageFile', imageFile);
        }
    }

    try {
        const response = await fetch('/add-sound', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            console.log('Success:', data);
            alert('New sound entry added successfully!');
            // Optionally, clear the form or update the UI
        } else {
            console.error('Error:', data);
            alert('There was an error adding the sound entry.');
        }
    } catch (error) {
        console.error('Network error:', error);
        alert('There was a network error. Please try again.');
    }
}

// Function to open the add sound modal
function openAddSoundModal() {
    const modal = document.getElementById('add-sound-modal');
    modal.style.display = 'flex'; // Show the modal
    displayAddSoundForm(); // Display the form
}

// Function to close the add sound modal
function closeAddSoundModal() {
    const modal = document.getElementById('add-sound-modal');
    modal.style.display = 'none'; // Hide the modal
}

export { openAddSoundModal, closeAddSoundModal };
