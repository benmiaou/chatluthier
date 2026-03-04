import { GoogleLogin } from './googleLogin.js'; // Newly added import

// Function to display the form for adding a new sound
function displayAddSoundForm() {
    const formContainer = document.getElementById('add-sound-form-container');
    formContainer.innerHTML = ''; // Clear existing content
    formContainer.style.display = 'flex';
    formContainer.style.justifyContent = 'flex-start'; // Align items to the left
    formContainer.style.alignItems = 'flex-start'; // Align items to the top
    formContainer.style.flexDirection = 'column';
    formContainer.style.width = '100%'; // Ensure full width for centering
    formContainer.style.boxSizing = 'border-box'; // Include padding in the element's total width and height

    const form = document.createElement('form');
    form.id = 'addSoundForm';
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.alignItems = 'flex-start'; // Align items to the left
    form.style.width = '100%'; // Full width for the form
    form.style.padding = '20px'; // Add padding for better spacing

    // Create form elements
    const categoryLabel = document.createElement('label');
    categoryLabel.textContent = 'Category:';
    categoryLabel.style.marginBottom = '5px';
    const categorySelect = document.createElement('select');
    categorySelect.className = "selector-primary";
    categorySelect.id = 'category';
    categorySelect.required = true;
    categorySelect.style.marginBottom = '20px';
    ['backgroundMusic', 'ambianceSounds', 'soundboard'].forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    const fileLabel = document.createElement('label');
    fileLabel.textContent = 'Select File:';
    fileLabel.style.marginBottom = '5px';
    fileLabel.style.display = 'block'; // Ensure the label takes the full width
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'fileInput';
    fileInput.accept = 'audio/*'; // Restrict to audio files
    fileInput.required = true;
    fileInput.style.marginBottom = '20px';
    fileInput.style.width = '100%'; // Ensure the input takes the full width

    const displayNameLabel = document.createElement('label');
    displayNameLabel.textContent = 'Display Name:';
    displayNameLabel.style.marginBottom = '5px';
    const displayNameInput = document.createElement('input');
    displayNameInput.type = 'text';
    displayNameInput.id = 'displayName';
    displayNameInput.required = true;
    displayNameInput.style.marginBottom = '20px';
    displayNameInput.style.width = '100%'; // Ensure the input takes the full width

    const contextsContainer = document.createElement('div');
    contextsContainer.id = 'contextsContainer';
    contextsContainer.style.marginBottom = '20px';
    contextsContainer.style.width = '100%';

    const contextLabel = document.createElement('label');
    contextLabel.textContent = 'Contexts:';
    contextLabel.style.marginBottom = '5px';

    const creditLabel = document.createElement('label');
    creditLabel.textContent = 'Credit:';
    creditLabel.style.marginBottom = '5px';
    const creditInput = document.createElement('input');
    creditInput.type = 'text';
    creditInput.id = 'credit';
    creditInput.style.marginBottom = '20px';
    creditInput.style.width = '100%'; // Ensure the input takes the full width

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Add Sound';
    submitButton.className = "button-primary";
    submitButton.style.display = 'block'; // Ensure the button takes the full width of its container
    submitButton.style.margin = '20px auto 0 auto'; // Center the button horizontally

    // Create separators
    const separator1 = document.createElement('hr');
    separator1.style.width = '100%';
    separator1.style.margin = '20px 0';

    const separator2 = document.createElement('hr');
    separator2.style.width = '100%';
    separator2.style.margin = '20px 0';

    const separator3 = document.createElement('hr');
    separator3.style.width = '100%';
    separator3.style.margin = '20px 0';

    const separator4 = document.createElement('hr');
    separator4.style.width = '100%';
    separator4.style.margin = '20px 0';

    const separator5 = document.createElement('hr');
    separator5.style.width = '100%';
    separator5.style.margin = '20px 0';

    // Append elements to the form
    form.appendChild(categoryLabel);
    form.appendChild(categorySelect);
    form.appendChild(separator1);
    form.appendChild(fileLabel);
    form.appendChild(fileInput);
    form.appendChild(separator2);
    form.appendChild(displayNameLabel);
    form.appendChild(displayNameInput);
    form.appendChild(separator3);
    form.appendChild(contextLabel);
    form.appendChild(contextsContainer);
    form.appendChild(separator4);
    form.appendChild(creditLabel);
    form.appendChild(creditInput);
    form.appendChild(separator5);
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

        if (selectedCategory === 'backgroundMusic') {
            displayBackgroundMusicContextEditor();
        } else if (selectedCategory === 'ambianceSounds') {
            displayAmbianceSoundsContextEditor();
        } else if (selectedCategory === 'soundboard') {
            displaySoundboardContextEditor();
        }
    }

    function displayBackgroundMusicContextEditor() {
        const contextsLabel = document.createElement('label');
        contextsLabel.textContent = 'Contexts :';
        contextsLabel.style.marginBottom = '5px';

        const addContextButton = document.createElement('button');
        addContextButton.type = 'button';
        addContextButton.textContent = 'Add Context';
        addContextButton.className = "button-primary";
        addContextButton.style.marginBottom = '20px';
        addContextButton.onclick = () => addContext('backgroundMusic');
        contextsContainer.appendChild(addContextButton);
    }

    function displayAmbianceSoundsContextEditor() {
        const contextsLabel = document.createElement('label');
        contextsLabel.textContent = 'Contexts (comma-separated):';
        contextsLabel.style.marginBottom = '5px';
        const contextsInput = document.createElement('input');
        contextsInput.type = 'text';
        contextsInput.id = 'contexts';
        contextsInput.required = true;
        contextsInput.style.marginBottom = '20px';
        contextsInput.style.width = '100%';

        const imageLabel = document.createElement('label');
        imageLabel.textContent = 'Select Image:';
        imageLabel.style.marginBottom = '5px';
        const imageInput = document.createElement('input');
        imageInput.type = 'file';
        imageInput.id = 'imageInput';
        imageInput.accept = 'image/*'; // Restrict to image files
        imageInput.style.marginBottom = '20px';

        contextsContainer.appendChild(contextsLabel);
        contextsContainer.appendChild(contextsInput);
        contextsContainer.appendChild(imageLabel);
        contextsContainer.appendChild(imageInput);
    }

    function displaySoundboardContextEditor() {
        const contextsLabel = document.createElement('label');
        contextsLabel.textContent = 'Contexts (comma-separated):';
        contextsLabel.style.marginBottom = '5px';
        const contextsInput = document.createElement('input');
        contextsInput.type = 'text';
        contextsInput.id = 'contexts';
        contextsInput.required = true;
        contextsInput.style.marginBottom = '20px';
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
        contextWrapper.style.marginBottom = '10px';

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
        contextInput.style.marginBottom = '0';

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
    let contexts = [];
    const credit = document.getElementById('credit').value;

    // Validate that all required fields are not empty
    if (!category) {
        alert('Please select a category.');
        return;
    }

    if (fileInput.files.length === 0) {
        alert('Please select a file.');
        return;
    }

    if (!displayName.trim()) {
        alert('Please enter a display name.');
        return;
    }

    if (category === 'ambianceSounds' || category === 'soundboard') {
        const contextsInput = document.getElementById('contexts').value;
        if (!contextsInput.trim()) {
            alert('Please enter contexts.');
            return;
        }
        contexts = contextsInput.split(',').map(context => context.trim());
    } else if (category === 'backgroundMusic') {
        const contextWrappers = document.querySelectorAll('#contextsContainer > div');
        if (contextWrappers.length === 0) {
            alert('Please add at least one context.');
            return;
        }
        contextWrappers.forEach(wrapper => {
            const typeSelect = wrapper.querySelector('select');
            const contextInput = wrapper.querySelector('input');
            if (typeSelect && contextInput) {
                contexts.push([typeSelect.value, contextInput.value]);
            }
        });
    }

    if (!credit.trim()) {
        alert('Please enter credit information.');
        return;
    }

    if (category === 'ambianceSounds') {
        const imageInput = document.getElementById('imageInput');
        if (imageInput.files.length === 0) {
            alert('Please select an image file.');
            return;
        }
    }

    console.log("contexts : " + JSON.stringify(contexts));

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('category', category);
    formData.append('file', file);
    formData.append('display_name', displayName);
    formData.append('contexts',  JSON.stringify(contexts)); // Ensure contexts is a JSON string
    formData.append('credit', credit);

    if (category === 'ambianceSounds') {
        const imageFile = imageInput.files[0];
        formData.append('imageFile', imageFile);
    }

    try {
        const response = await fetch('/add-sound', {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });

        const data = await response.json();
        if (response.ok) {
            console.log('Success:', data);
            alert('New sound entry added successfully!');
            displayAddSoundForm();
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
