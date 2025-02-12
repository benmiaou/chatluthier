// src/js/modalHandler.js

/**
 * Toggles the visibility of the menu content.
 */
function toggleMenu() {
    const menu = document.getElementById("menu-content");
    if (!menu) {
        console.error("Menu element with ID 'menu-content' not found.");
        return;
    }

    if (menu.style.display === "none" || menu.style.display === "") {
        menu.style.display = "block";
    } else {
        menu.style.display = "none";
    }
}

/**
 * Opens an external modal by fetching content from a given URL.
 * @param {string} url - The URL to fetch the external content from.
 */
function openExternalModal(url) {
    // Show the modal
    const modal = document.getElementById('external-modal');
    if (!modal) {
        console.error("Modal element with ID 'external-modal' not found.");
        return;
    }
    modal.style.display = 'block';

    // Fetch the external HTML content
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            // Insert the content into the modal body
            const modalBody = document.getElementById('external-modal-body');
            if (!modalBody) {
                console.error("Modal body element with ID 'external-modal-body' not found.");
                return;
            }
            modalBody.innerHTML = data;

            // Execute any scripts that were included in the fetched HTML
            const scripts = modalBody.getElementsByTagName('script');
            Array.from(scripts).forEach(script => {
                const newScript = document.createElement('script');
                if (script.src) {
                    newScript.src = script.src;
                } else {
                    newScript.textContent = script.innerText;
                }
                document.body.appendChild(newScript);
                document.body.removeChild(newScript);
            });
        })
        .catch(error => {
            console.error('Error loading external content:', error);
            const modalBody = document.getElementById('external-modal-body');
            if (modalBody) {
                modalBody.innerHTML = '<p>Error loading content.</p>';
            }
        });
}

/**
 * Closes the external modal and clears its content.
 */
function closeExternalModal() {
    // Hide the modal
    const modal = document.getElementById('external-modal');
    if (!modal) {
        console.error("Modal element with ID 'external-modal' not found.");
        return;
    }
    modal.style.display = 'none';

    // Clear the modal content
    const modalBody = document.getElementById('external-modal-body');
    if (modalBody) {
        modalBody.innerHTML = '';
    }
}

/**
 * Closes the modal when clicking outside of it.
 * @param {Event} event - The click event.
 */
function handleWindowClick(event) {
    const modal = document.getElementById('external-modal');
    if (!modal) return;

    if (event.target === modal) {
        closeExternalModal();
    }
}

/**
 * Attaches event listeners to footer links to open external modals.
 */
function attachFooterLinkListeners() {
    const footerLinks = document.querySelectorAll('.footer-content a');
    const modalPages = ['privacy.html', 'legal.html', 'about.html', 'credits.html'];

    footerLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (modalPages.includes(href)) {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                openExternalModal(href);
            });
        }
    });
}

// Initialize modal functionalities
function initModals() {
    // Attach the window click handler
    window.addEventListener('click', handleWindowClick);

    // Attach footer link listeners after DOM content is loaded
    document.addEventListener('DOMContentLoaded', attachFooterLinkListeners);
}

export { toggleMenu, initModals, closeExternalModal, openExternalModal };