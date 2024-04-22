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

app.listen(3000, '0.0.0.0', () => console.log('Server started on port 3000'));