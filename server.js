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
app.use(express.static(path.join(__dirname, 'dist')));
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
    const defaultFilePath = path.join(__dirname, 'srv_data',`${filename}.json`);
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

// Utilisez le middleware sur vos endpoints
app.post('/save-preset', (req, res) => {
    const { userId, presetName, presetData } = req.body;
    console.log('save-preset')

    // Vérifier si les données nécessaires sont présentes
    if (!userId || !presetName || !presetData) {
        res.status(400).send('Invalid data'); // Retourner une erreur si les données sont incomplètes
        return;
    }

    // Répertoire pour sauvegarder les données de l'utilisateur
    const userDir = path.join(__dirname, 'user_data', userId);

    // S'assurer que le répertoire utilisateur existe
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true }); // Créer le répertoire s'il n'existe pas
    }

    // Générer le chemin du fichier pour les presets
    const filePath = path.join(userDir, 'presets.json'); // Utiliser 'presets.json' pour stocker tous les presets

    let userPresets = {};

    // Si le fichier existe, lire les presets existants
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        userPresets = JSON.parse(data);
    }

    // Ajouter ou mettre à jour le preset
    userPresets[presetName] = presetData;

    // Sauvegarder les presets mis à jour dans le fichier
    fs.writeFileSync(filePath, JSON.stringify(userPresets, null, 2)); // Sauvegarder avec un formatage lisible

    res.send('Preset saved successfully'); // Confirmer que les données ont été sauvegardées
});

app.get('/load-presets', (req, res) => {
    const userId = req.query.userId;
    if (userId) {
        
        const userFilePath = path.join(__dirname, 'user_data', userId, 'presets.json');
        if (fs.existsSync(userFilePath)) {
            const userPresets = JSON.parse(fs.readFileSync(userFilePath, 'utf8')); // Presets spécifiques à l'utilisateur
            res.json({ presets: userPresets }); // Retourner les presets en tant que JSON
        } else {
            // Si le fichier des presets n'existe pas, retourner un objet vide
            res.json({ presets: {} });
        }
    } else {
        res.status(400).send('User ID is required'); // Gérer le cas où l'ID utilisateur est manquant
    }
});

app.listen(3000, '0.0.0.0', () => console.log('Server started on port 3000'));


//SOCKET PART ====================================================================================================

// server.js

const WebSocket = require('ws');

const wsServer = new WebSocket.Server({ port: 3001 });

// Map to keep track of subscribers for each ID
const subscribers = new Map();  // Map<ID, Set<WebSocket>>

wsServer.on('connection', function connection(ws) {
  let connectedId = null; // The ID the client is connected to

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);

      switch (data.type) {
        case 'register':
          // Client wants to register an ID
          connectedId = data.id;
          if (subscribers.has(connectedId)) {
            ws.send(JSON.stringify({ type: 'error', message: 'ID already registered' }));
          } else {
            subscribers.set(connectedId, new Set());
            subscribers.get(connectedId).add(ws);
            ws.send(JSON.stringify({ type: 'registered', id: connectedId }));
            console.log(`Client registered and connected to ID: ${connectedId}`);
          }
          break;

        case 'subscribe':
          // Client wants to subscribe to an ID
          connectedId = data.id;
          if (!subscribers.has(connectedId)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Session ID does not exist.' }));
            connectedId = null;
          } else {
            subscribers.get(connectedId).add(ws);
            ws.send(JSON.stringify({ type: 'subscribed', id: connectedId }));
            console.log(`Client subscribed to ID: ${connectedId}`);
          }
          break;

        case 'message':
        case 'ambianceStatusUpdate' :
        case 'backgroundMusicChange':
        case 'backgroundMusicVolumeChange':
        case 'backgroundMusicStop':
        case 'playSoundboardSound':
            // Client sends a message to others connected to the same ID
            if (connectedId) {
            const subs = subscribers.get(connectedId);
            if (subs) {
                subs.forEach(subscriberWs => {
                if (subscriberWs !== ws && subscriberWs.readyState === WebSocket.OPEN) {
                    subscriberWs.send(JSON.stringify({
                    type: data.type,
                    id: connectedId,
                    content: data.content,
                    }));
                }
                });
            }
            } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Client not connected to any ID.' }));
            console.warn('Client not connected to any ID.');
            }
        break;

        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', function () {
    console.log('Connection closed');

    // Remove client from subscribers
    if (connectedId) {
      const subs = subscribers.get(connectedId);
      if (subs) {
        subs.delete(ws);
        if (subs.size === 0) {
          subscribers.delete(connectedId);
          console.log(`No more subscribers for ID: ${connectedId}, ID removed.`);
        }
      }
    }
  });
});
