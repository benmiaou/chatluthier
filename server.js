const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import CORS module
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json'); // Your downloaded key

const app = express();

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  
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
// Define a route to return the creditsMap
app.get('/backgoundMusic', (req, res) => {
    res.json(backgoundMusic); // Return the credits map as JSON
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

// Global variable to store credits
let backgoundMusic = {};

// Function to load backgroundCredits.json at server startup
function loadCredits() {
    const backgoundMusicPath = path.join(__dirname, 'backgoundMusic.json');
    try {
        const backgoundMusicData = fs.readFileSync(backgoundMusicPath, 'utf8');
        backgoundMusic = JSON.parse(backgoundMusicData);
        console.log('Music loaded successfully:', backgoundMusic);
    } catch (error) {
        console.error('Error loading backgoundMusic.json:', error);
        backgoundMusic = {}; // Fallback to empty map if there's an error
    }
}
loadCredits();

app.listen(3000, '0.0.0.0', () => console.log('Server started on port 3000'));