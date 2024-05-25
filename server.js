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

// List of directories to scan for MP3 files
const soundDirectories = [
    path.join(__dirname, 'assets/ambiance'),
    path.join(__dirname, 'assets/background'),
    path.join(__dirname, 'assets/soundboard'),
];
app.get('/mp3-list', async (req, res) => {
    try {
        // Collect MP3 files from all directories
        const allMp3Files = await Promise.all(
            soundDirectories.map((dir) => getMp3FilesFromDirectory(dir))
        );

        // Flatten the arrays from each directory into one list
        const mp3Files = allMp3Files.flat();
        
        res.json(mp3Files); // Return the complete list of MP3 files
    } catch (error) {
        res.status(500).send('Error retrieving MP3 files');
    }
});

// Route to update user sounds based on sound type
app.post('/update-user-sounds', (req, res) => {
    const { userId, soundsType, sounds } = req.body; // Get userId, soundsType, and sounds from request

    if (!userId || !soundsType || !sounds) {
        res.status(400).send('Invalid data'); // Return an error if data is incomplete
        return;
    }

    // Directory to save user data
    const userDir = path.join(__dirname, 'user_data', userId);

    // Ensure the user directory exists
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true }); // Create directory if it doesn't exist
    }

    // Generate the file path based on the soundsType
    const filePath = path.join(userDir, `${soundsType}.json`); // Use soundsType to create filename

    // Save the sounds data to a JSON file in the user directory
    fs.writeFileSync(filePath, JSON.stringify(sounds, null, 2)); // Save with pretty formatting
    res.send('Data saved successfully'); // Confirm the data was saved
});

// Function to merge arrays, ensuring no duplicates and adding missing entries
function mergeArrays(serverArray, userArray) {
    // Create a map to track unique identifiers
    const userMap = new Map(userArray.map((item) => [item.filename, item])); // Use a unique property like 'id'

    // Loop over the server array and add any missing entries to the user array
    serverArray.forEach((serverItem) => {
        if (!userMap.has(serverItem.filename)) {
            userArray.push(serverItem); // Add missing item to the user array
        }
    });

    return userArray; // Return the updated user array
}

// Generalized function to get user-specific or default data
function getData(userId, filename) {
    const defaultFilePath = path.join(__dirname, `${filename}.json`);
    const defaultArray = JSON.parse(fs.readFileSync(defaultFilePath, 'utf8')); // Default server array

    if (userId) {
        const userFilePath = path.join(__dirname, 'user_data', userId, `${filename}.json`);
        if (fs.existsSync(userFilePath)) {
            const userArray = JSON.parse(fs.readFileSync(userFilePath, 'utf8')); // User-specific array
            const mergedArray = mergeArrays(defaultArray, userArray); // Merge with server data

            // Update the user-specific file with merged data
            fs.writeFileSync(userFilePath, JSON.stringify(mergedArray, null, 2)); 

            return mergedArray; // Return the merged array
        }
    }

    return defaultArray; // If no user-specific data, return the default array
}

// Route for background music with user ID check
app.get('/backgroundMusic', (req, res) => {
    const userId = req.query.userId || req.headers['user-id'] || req.body.userId;
    const backgroundMusicData = getData(userId, 'backgroundMusic'); // Unified data fetching
    res.json(backgroundMusicData); // Return the data as JSON
});

// Route for ambiance sounds with user ID check
app.get('/ambianceSounds', (req, res) => {
    const userId = req.query.userId || req.headers['user-id'] || req.body.userId;
    const ambianceSoundsData = getData(userId, 'ambianceSounds'); // Unified data fetching
    res.json(ambianceSoundsData); // Return the data as JSON
});

// Route for soundboard with user ID check
app.get('/soundboard', (req, res) => {
    const userId = req.query.userId || req.headers['user-id'] || req.body.userId;
    const soundboardData = getData(userId, 'soundboard'); // Unified data fetching
    res.json(soundboardData); // Return the data as JSON
});

app.listen(3000, '0.0.0.0', () => console.log('Server started on port 3000'));

const WebSocket = require('ws');

const ws = new WebSocket.Server({ port : 3001 });

ws.on('connection', function connection(ws) {

  ws.on('message', function incoming(message) {
      let toto = JSON.parse(message)
      console.log(toto)

      console.log('Received :' + toto.type)
    // Gérer le message entrant
  });

  ws.on('close', function() {
    // Gérer la fermeture de la connexion
  });
});
