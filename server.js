const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import CORS module
const readline = require('readline');

const app = express();

app.use(cors()); // Enable CORS for all routes
// Serve static files from the 'public' directory where 'index.html' is located
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // This is for development only!
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    next();
  });;
  app.get('/list-sounds/:type', (req, res) => {
    const type = decodeURIComponent(req.params.type);
    const directoryPath = path.join(__dirname, 'assets', type);

    fs.readdir(directoryPath, { withFileTypes: true }, (err, entries) => {
        if (err) {
            console.error('Error getting directory information:', err);
            res.status(500).send('Failed to retrieve directory information');
            return;
        }

        const mp3Files = entries.filter(entry => !entry.isDirectory() && entry.name.endsWith('.mp3'));
        res.json(mp3Files.map(entry => entry.name));
    });
});
app.get('/list-files/:type', (req, res) => {
    const type = req.params.type;
    directoryPath = "";
    directoryPath = path.join(__dirname, 'assets', decodeURIComponent(type));
    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error('Error getting directory information:', err); // Log the error
            res.status(500).send('Failed to retrieve directory information');
        } else {
            res.json(files);
        }
    });
});
// Define a route to return the creditsMap
app.get('/credits', (req, res) => {
    res.json(creditsMap); // Return the credits map as JSON
});

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

app.listen(3000, '0.0.0.0', () => console.log('Server started on port 3000'));