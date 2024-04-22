
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Global variable to store credits
let creditsMap = {};

// Function to load credits.json at server startup
function loadCredits() {
    const creditsPath = path.join(__dirname, 'credits.json');
    try {
        const creditsData = fs.readFileSync(creditsPath, 'utf8');
        creditsMap = JSON.parse(creditsData);
        console.log('Credits loaded successfully:', creditsMap);
    } catch (error) {
        console.error('Error loading credits.json:', error);
        creditsMap = {}; // Fallback to empty map if there's an error
    }
}
loadCredits();
// Recursive function to find all files in a directory
async function findAllFiles(dirPath) {
    let filePaths = [];
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            const subDirFiles = await findAllFiles(fullPath); // Recursive call for directories
            filePaths = filePaths.concat(subDirFiles); // Merge subdirectory files into list
        } else if (entry.isFile()) {
            filePaths.push(fullPath); // Add file to list
        }
    }

    return filePaths;
}

// Ask for credit information for new files
async function askForCredits(files) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    for (const file of files) {
        const filename = path.basename(file);
        if (!creditsMap[filename]) {
            await new Promise((resolve) => {
                rl.question(`Enter credit information for "${filename}": `, (answer) => {
                    creditsMap[filename] = answer; // Store the provided credit
                    resolve(); // Continue to the next iteration
                });
            });
        }
    }

    rl.close();
}

// Update creditsMap with new files from assets/background
async function updateCreditsMap() {
    const backgroundDir = path.join(__dirname, 'assets', 'background');
    try {
        const allFiles = await findAllFiles(backgroundDir);
        await askForCredits(allFiles); // Prompt for credits where needed

        const creditsPath = path.join(__dirname, 'credits.json');
        await fs.promises.writeFile(creditsPath, JSON.stringify(creditsMap, null, 2), 'utf8');
        console.log('Credits saved to credits.json');
    } catch (error) {
        console.error('Error updating creditsMap:', error);
    }
}
updateCreditsMap();
