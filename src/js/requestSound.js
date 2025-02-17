// Function to display the form for adding a new sound
function displayAddSoundForm() {
    const formContainer = document.getElementById('request-sound-form-container');
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
    categoryLabel.textContent = 'Type of Sound:';
    categoryLabel.style.marginBottom = '5px';
    const categorySelect = document.createElement('select');
    categorySelect.className = "selector-primary";
    categorySelect.id = 'category';
    categorySelect.required = true;
    categorySelect.style.marginBottom = '20px';
    ['Background Music', 'Ambiance Sounds', 'Soundboard'].forEach(category => {
        const option = document.createElement('option');
        option.value = category.replace(' ', '').toLowerCase();
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    const fileLabel = document.createElement('label');
    fileLabel.textContent = 'Link to Sound:';
    fileLabel.style.marginBottom = '5px';
    const fileInput = document.createElement('input');
    fileInput.type = 'url';
    fileInput.id = 'fileInput';
    fileInput.required = true;
    fileInput.style.marginBottom = '20px';
    fileInput.style.width = '100%'; // Ensure the input takes the full width

    const contextLabel = document.createElement('label');
    contextLabel.textContent = 'Informations :';
    contextLabel.style.marginBottom = '5px';
    const contextInput = document.createElement('textarea');
    contextInput.id = 'contexts';
    contextInput.required = true;
    contextInput.placeholder = 'Contexts';
    contextInput.style.marginBottom = '20px';
    contextInput.style.width = '100%'; // Ensure the input takes the full width
    contextInput.rows = 4; // Set the number of rows for the textarea

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Request Sound';
    submitButton.className = "button-primary";
    submitButton.style.display = 'block'; // Ensure the button takes the full width of its container
    submitButton.style.margin = '20px auto 0 auto'; // Center the button horizontally

    // Append elements to the form
    form.appendChild(categoryLabel);
    form.appendChild(categorySelect);
    form.appendChild(fileLabel);
    form.appendChild(fileInput);
    form.appendChild(contextLabel);
    form.appendChild(contextInput);
    form.appendChild(submitButton);

    // Append form to the container
    formContainer.appendChild(form);

    // Add event listener for form submission
    form.addEventListener('submit', handleAddSoundFormSubmit);
}

// Function to handle form submission
async function handleAddSoundFormSubmit(event) {
    event.preventDefault();

    const category = document.getElementById('category').value;
    const fileInput = document.getElementById('fileInput').value;
    const contexts = document.getElementById('contexts').value;

    // Validate that all required fields are not empty
    if (!category) {
        alert('Please select a type of sound.');
        return;
    }

    if (!fileInput.trim()) {
        alert('Please enter a link to the sound.');
        return;
    }

      const updatedData = {
        category: category,
        file: fileInput,
        contexts: contexts,
        };
    try {
        const response = await fetch('/request-sound', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body:  JSON.stringify(updatedData),
        });

        const data = await response.json();
        if (response.ok) {
            console.log('Success:', data);
        } else {
            console.error('Error:', data);
            alert('There was an error adding the request.');
        }
    } catch (error) {
        console.error('Network error:', error);
        alert('There was a network error. Please try again.');
        return
    }
    displayAddSoundForm();
}

// Function to open the add sound modal
function openRequestSoundModal() {
    const modal = document.getElementById('request-sound-modal');
    modal.style.display = 'flex'; // Show the modal
    displayAddSoundForm(); // Display the form
}

// Function to close the add sound modal
function closeRequestSoundModal() {
    const modal = document.getElementById('request-sound-modal');
    modal.style.display = 'none'; // Hide the modal
}

export { openRequestSoundModal, closeRequestSoundModal };
