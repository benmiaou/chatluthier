export function setupMenu(toggleButtonId, menuContentId) {
    const menuContent = document.getElementById(menuContentId);
    const toggleMenuButton = document.getElementById(toggleButtonId);

    if (toggleMenuButton && menuContent) {
        toggleMenuButton.addEventListener('click', () => {
            menuContent.classList.toggle('show'); // Ajoute ou retire la classe "show"
        });
    } else {
        console.error(`Menu setup failed: Elements with IDs '${toggleButtonId}' or '${menuContentId}' not found.`);
    }
}
