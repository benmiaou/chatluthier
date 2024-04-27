// Object to track active modals and their timeout IDs
let activeModals = {}; 
const modalStackOffset = 60; // Initial offset for modal stacking

function createModal(creditText) {
    if (activeModals[creditText]) {
        // Reset the timeout for the existing modal
        setModalTimeout(creditText);
        return;
    }

    const modalTemplate = document.getElementById("credit-modal-template");

    // Create a new modal from the template
    const newModal = modalTemplate.cloneNode(true);
    newModal.style.display = "block"; // Display the modal
    newModal.id = "modal-" + creditText.replace(/\s+/g, '-'); // Create a unique ID based on credit text

    // Set the credit text
    const creditDetails = newModal.querySelector(".credit-details");
    creditDetails.innerHTML = creditText;

    // Position the new modal with a top offset
    const numOfActiveModals = Object.keys(activeModals).length;
    newModal.style.top = (numOfActiveModals * modalStackOffset) + "px"; // Stack modals with an offset

    // Append the new modal to the document body
    document.body.appendChild(newModal);

    // Set the timer to auto-close after 10 seconds
    setModalTimeout(creditText);
}

function setModalTimeout(modalId) {
    // Clear any existing timeout for this modal
    if (activeModals[modalId]) {
        clearTimeout(activeModals[modalId]);
    }

    // Set a new timeout to close the modal after 10 seconds
    activeModals[modalId] = setTimeout(() => {
        closeModalById(modalId); // Auto-close the modal
    }, 10000); // 10,000 milliseconds = 10 seconds
}

function closeModalById(modalId) {
    const modal = document.getElementById("modal-" + modalId.replace(/\s+/g, '-'));
    if (modal) {
        modal.style.display = "none"; // Hide the modal
        document.body.removeChild(modal); // Remove the modal from the DOM
        clearTimeout(activeModals[modalId]); // Clear the timeout
        delete activeModals[modalId]; // Remove from active modals

        // Reposition remaining modals to fill gaps
        repositionModals();
    }
}

function repositionModals() {
    const modalIds = Object.keys(activeModals); // Get active modal IDs
    modalIds.forEach((id, index) => {
        const modal = document.getElementById("modal-" + id.replace(/\s+/g, '-'));
        if (modal) {
            modal.style.top = (index * modalStackOffset) + "px"; // Adjust top offset based on index
        }
    });
}

function closeModal(element) {
    const parentModal = element.closest(".credit-modal-template"); // Check the class name
    if (!parentModal) {
        console.error("Parent modal not found");
        return; // Exit if the expected parent modal is not found
    }

    const creditDetails = parentModal.querySelector(".credit-details");
    if (!creditDetails) {
        console.error("Credit details not found");
        return;
    }

    const creditText = creditDetails.innerHTML; // Get the credit text
    closeModalById(creditText); // Close the modal based on the credit text
}
