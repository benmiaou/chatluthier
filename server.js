const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import CORS module
const admin = require('firebase-admin');

const app = express();

try {
    const serviceAccount = require('./serviceAccountKey.json'); // Your downloaded key

    admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (e) {}

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware for parsing JSON bodies
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

app.post('/login', async (req, res) => {
    try {
      const { idToken } = req.body; // Get the ID token from the client
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;
  
      // Create a JSON with the user ID
      const userFilePath = path.join(__dirname, 'user_data', `${userId}.json`);
      fs.writeFileSync(userFilePath, JSON.stringify({ userId }));
  
      res.send({ message: 'Login successful' });
    } catch (error) {
      console.error('Error verifying token:', error);
      res.status(401).send({ error: 'Unauthorized' });
    }
  });

// Global variable to store backgroundMusic
let backgroundMusic = {};
// Define a route to return the backgroundMusic
app.get('/backgroundMusic', (req, res) => {
    res.json(backgroundMusic); // Return the backgroundMusic array as JSON
});
// Function to load backgroundMusic.json at server startup
function loadBackgroundMusic() {
    const backgroundMusicPath = path.join(__dirname, 'backgroundMusic.json');
    try {
        const backgroundMusicData = fs.readFileSync(backgroundMusicPath, 'utf8');
        backgroundMusic = JSON.parse(backgroundMusicData);
        console.log('Music loaded successfully:', backgroundMusic);
    } catch (error) {
        console.error('Error loading backgroundMusic.json:', error);
        backgroundMusic = {}; // Fallback to empty map if there's an error
    }
}
loadBackgroundMusic();

// Global variable to store ambianceSounds
let ambianceSounds = {};
// Define a route to return the ambianceSounds
app.get('/ambianceSounds', (req, res) => {
    res.json(ambianceSounds); // Return the ambianceSounds array as JSON
});
// Function to load ambianceSounds.json at server startup
function loadAmbianceSounds() {
    const ambianceSoundsPath = path.join(__dirname, 'ambianceSounds.json');
    try {
        const ambianceSoundsData = fs.readFileSync(ambianceSoundsPath, 'utf8');
        ambianceSounds = JSON.parse(ambianceSoundsData);
        console.log('Music loaded successfully:', ambianceSounds);
    } catch (error) {
        console.error('Error loading ambianceSounds.json:', error);
        ambianceSounds = {}; // Fallback to empty map if there's an error
    }
}
loadAmbianceSounds();

// Global variable to store soundboard
let soundboard = {};
// Define a route to return the soundboard array
app.get('/soundboard', (req, res) => {
    res.json(soundboard); // Return the soundboard array as JSON
});
// Function to load backgroundCredits.json at server startup
function loadSoundboard() {
    const soundboardPath = path.join(__dirname, 'soundboard.json');
    try {
        const soundboardData = fs.readFileSync(soundboardPath, 'utf8');
        soundboard = JSON.parse(soundboardData);
        console.log('Music loaded successfully:', soundboard);
    } catch (error) {
        console.error('Error loading soundboard.json:', error);
        soundboard = {}; // Fallback to empty map if there's an error
    }
}
loadSoundboard();

app.listen(3000, '0.0.0.0', () => console.log('Server started on port 3000'));