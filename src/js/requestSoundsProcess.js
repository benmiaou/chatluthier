import { GoogleLogin } from './googleLogin.js'; // Newly added import
import {openAddSoundModal } from './addSound.js'

// Function to display one request at a time
function displayRequest(request) {
    const requestDisplayContainer = document.getElementById('request-sound-form-container-admin');
    requestDisplayContainer.innerHTML = ''; // Clear existing content
    requestDisplayContainer.style.display = 'flex';
    requestDisplayContainer.style.flexDirection = 'column';
    requestDisplayContainer.style.alignItems = 'flex-start';
    requestDisplayContainer.style.width = '100%';
    requestDisplayContainer.style.boxSizing = 'border-box';

    const requestElement = document.createElement('div');
    requestElement.style.display = 'flex';
    requestElement.style.flexDirection = 'column';
    requestElement.style.alignItems = 'flex-start'; // Align items to the left
    requestElement.style.width = '100%'; // Full width for the form
    requestElement.style.padding = '20px'; // Add padding for better spacing

    // Function to create a styled label-value pair
    function createLabelValuePair(labelText, valueText, isLink = false) {
        const labelElement = document.createElement('strong');
        labelElement.textContent = `${labelText}: `;
        labelElement.style.fontWeight = 'bold';
        labelElement.style.marginRight = '5px';
        labelElement.style.color = '#FFFFFF'; // White color for labels

        const valueElement = document.createElement(isLink ? 'a' : 'span');
        valueElement.textContent = valueText;
        if (isLink) {
            valueElement.href = valueText;
            valueElement.target = '_blank';
            valueElement.style.color = '#FFD700'; // Gold color for links
            valueElement.style.textDecoration = 'underline';
        } else {
            valueElement.style.color = '#FFFFFF'; // White color for values
        }

        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.marginBottom = '10px';
        container.appendChild(labelElement);
        container.appendChild(valueElement);

        return container;
    }

    // Create and append the "Add Sound" button
    const addSoundButton = document.createElement('button');
    addSoundButton.textContent = "Add Sound"
    addSoundButton.className = "button-primary";
    addSoundButton.addEventListener('click',  openAddSoundModal);

    // Create and append the "Add Sound" button
    const closeRequestButton = document.createElement('button');
    closeRequestButton.textContent = "Close request"
    closeRequestButton.className = "button-primary";
    closeRequestButton.addEventListener('click', () => {closeRequest(request.timestamp); fetchAndDisplayRequests()});

    // Create and append label-value pairs
    requestElement.appendChild(createLabelValuePair('Category', request.category));
    requestElement.appendChild(createLabelValuePair('Link to Sound', request.file, true));
    requestElement.appendChild(createLabelValuePair('Contexts', request.contexts));

    // Format the timestamp for better readability
    const timestamp = new Date(request.timestamp).toLocaleString();
    requestElement.appendChild(createLabelValuePair('Timestamp', timestamp));
    requestElement.appendChild(addSoundButton);
    requestElement.appendChild(closeRequestButton);

    requestDisplayContainer.appendChild(requestElement);
}

// Function to retrieve and display requests
async function fetchAndDisplayRequests() {
    try {
        const response = await fetch('/get-requests', {
            method: 'GET',
            credentials: 'include', 
        });
        const requests = await response.json();
        if (response.ok) {
            if (requests.length > 0) {
                displayRequest(requests[0]); // Display the first request
            } else {
                alert('No requests available.');
            }
        } else {
            console.error('Error:', requests);
            alert('There was an error retrieving the requests.');
        }
    } catch (error) {
        console.error('Network error:', error);
        alert('There was a network error. Please try again.');
    }
}

// Function to update (remove) a request
async function closeRequest(requestId) {
    const updatedData = {
        requestId: requestId,
        };

    try {
        const response = await fetch('/close-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body:  JSON.stringify(updatedData),
            credentials: 'include', 
        });

        const data = await response.json();
        if (response.ok) {
            console.log('Success:', data);
            alert('Request closed successfully!');
            fetchAndDisplayRequests(); // Refresh the displayed requests
        } else {
            console.error('Error:', data);
            alert('There was an error updating the request.');
        }
    } catch (error) {
        console.error('Network error:', error);
        alert('There was a network error. Please try again.');
    }
}

// Function to open the add sound modal
function openRequestSoundModalAdmin() {
    const modal = document.getElementById('request-sound-modal-admin');
    modal.style.display = 'flex'; // Show the modal
    fetchAndDisplayRequests(); // Display the form
}

// Function to close the add sound modal
function closeRequestSoundModalAdmin() {
    const modal = document.getElementById('request-sound-modal-admin');
    modal.style.display = 'none'; // Hide the modal
}

export { openRequestSoundModalAdmin, closeRequestSoundModalAdmin };
