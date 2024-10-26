function getCreditsByCategory() {
    const credits = {
        ambianceSounds: [],
        soundboardItems: [],
        backgroundMusic: []
    };

    // Retrieve credits for ambiance sounds
    if (AmbianceSounds.ambianceSounds) {
        AmbianceSounds.ambianceSounds.forEach(item => {
            credits.ambianceSounds.push({
                name: item.display_name,
                credit: item.credit
            });
        });
    }

    // Retrieve credits for soundboard items
    if (Soundboard.soundboardItems) {
        Soundboard.soundboardItems.forEach(item => {
            credits.soundboardItems.push({
                name: item.display_name,
                credit: item.credit
            });
        });
    }

    // Retrieve credits for background music
    if (BackgroundMusic.backgroundMusicArray) {
        BackgroundMusic.backgroundMusicArray.forEach(item => {
            credits.backgroundMusic.push({
                name: item.display_name,
                credit: item.credit
            });
        });
    }

    return credits; // Return all credits organized by category
}

function showAllCredits() {
    const credits = getCreditsByCategory(); // Get all credits organized by category
    const content = [];

    // Format credits with additional spacing between lines
    if (credits.ambianceSounds.length > 0) {
        content.push("<h2>Ambiance Sounds Credits:</h2>"); // Section header
        credits.ambianceSounds.forEach(item => {
            content.push(`<p><strong>${item.name}:</strong> ${item.credit}</p> <br>`); // Display name and credit
        });
    }

    if (credits.soundboardItems.length > 0) {
        content.push("<h2>Soundboard Items Credits:</h2>"); // Section header
        credits.soundboardItems.forEach(item => {
            content.push(`<p><strong>${item.name}:</strong> ${item.credit}</p> <br>`);
        });
    }

    if (credits.backgroundMusic.length > 0) {
        content.push("<h2>Background Music Credits:</h2>"); // Section header
        credits.backgroundMusic.forEach(item => {
            content.push(`<p>${item.credit}</p> <br>`);
        });
    }

    const modal = document.getElementById("external-modal");
    if (!modal) {
        console.error("external-modal not found!");
        return; // Early exit if modal doesn't exist
    }

    const creditDetails = document.getElementById("external-modal-body");
    if (!creditDetails) {
        console.error("external-modal-body class not found!");
        return; // Early exit if the target class is missing
    }

    creditDetails.innerHTML = content.join(""); // Set the content
    modal.style.display = "block"; // Show the modal
}

function closeAllCreditsModal() {
    const modal = document.getElementById("external-modal-body");
    modal.style.display = "none"; // Hide the modal
}