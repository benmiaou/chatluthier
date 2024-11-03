// Object to track active modals and their timeout IDs
let activeModals = {}; 
const maxActiveModals = 5; // Maximum number of active modals allowed

function createModal(creditText) {
    console.log(creditText)
    // If more than 5 modals are active, close the oldest one
    if (Object.keys(activeModals).length >= maxActiveModals) {
        closeOldestModal(); // Close the oldest modal to maintain the limit
    }

    const modalTemplate = document.getElementById("credit-modal-template");
    const newModal = modalTemplate.cloneNode(true);
    newModal.style.display = "block"; // Display the modal
    const creditDetails = newModal.querySelector(".credit-details");
    creditDetails.innerHTML = creditText;
    creditText = creditDetails.innerHTML;

    if (activeModals[creditText]) {
        // Reset the timeout for the existing modal
        setModalTimeout(creditText);
        return;
    }

    newModal.id = "modal-" + creditText.replace(/\s+/g, '-'); // Create a unique ID based on credit text

    // Position the new modal with a top offset
    const topOffset = calculateModalOffset(); // Calculate the offset based on previous modals
    newModal.style.top = topOffset + "px";

    // Append the new modal to the document body
    document.body.appendChild(newModal);

    // Set the timer to auto-close after 10 seconds
    setModalTimeout(creditText);

    // Add the modal to the activeModals list
    activeModals[creditText] = newModal;
}

function calculateModalOffset() {
    // Calculate the total height of existing modals to determine the offset for the new modal
    let totalHeight = 0;
    const modalIds = Object.keys(activeModals);
    modalIds.forEach(id => {
        const modal = document.getElementById("modal-" + id.replace(/\s+/g, '-'));
        if (modal) {
            totalHeight += modal.offsetHeight; // Add the height of each modal
        }
    });
    return totalHeight; // This will be the offset for the next modal
}

function closeOldestModal() {
    // Get the oldest modal (the first one added to the activeModals object)
    const oldestModalKey = Object.keys(activeModals)[0];
    closeModalById(oldestModalKey); // Close the oldest modal
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
        delete activeModals[modalId]; // Remove from active modals
        repositionModals(); // Reposition remaining modals to fill gaps
    }
}

function repositionModals() {
    let totalHeight = 0; // Initialize the starting offset
    const modalIds = Object.keys(activeModals); // Get active modal IDs
    modalIds.forEach(id => {
        const modal = document.getElementById("modal-" + id.replace(/\s+/g, '-'));
        if (modal) {
            modal.style.top = totalHeight + "px"; // Set the top offset based on cumulative height
            totalHeight += modal.offsetHeight; // Add the modal's height to the cumulative total
        }
    });
}


function closeModal(element) {
    const parentModal = element.closest(".credit-modal-template"); // Check the class name
    if (!parentModal) {
        console.error("Parent modal not found");
        return;
    }

    const creditDetails = parentModal.querySelector(".credit-details");
    if (!creditDetails) {
        console.error("Credit details not found");
        return;
    }

    const creditText = creditDetails.innerHTML; // Get the credit text
    closeModalById(creditText); // Close the modal based on the credit text
}

export { createModal, closeModal };
