const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
const PORT = 5000;
const WS_PORT = 5001;

// Directories
const DIST_DIR = path.join(__dirname, 'dist');
const ASSETS_DIR = path.join(__dirname, 'assets');
const USER_DATA_DIR = path.join(__dirname, 'user_data');
const SERVER_DATA_DIR = path.join(__dirname, 'srv_data');

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.static(DIST_DIR)); // Serve static files
app.use('/assets', express.static(ASSETS_DIR)); // Serve assets

// Enable custom headers for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    next();
});

// Utility Functions
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const readJSONFile = (filePath) => {
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return null;
};

const writeJSONFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const mergeArrays = (serverArray, userArray) => {
    const userMap = new Map(userArray.map((item) => [item.filename, item]));
    serverArray.forEach((serverItem) => {
        if (!userMap.has(serverItem.filename)) {
            userArray.push(serverItem);
        }
    });
    return userArray;
};

function getData(userId, filename) {
    const defaultFilePath = path.join(__dirname, 'srv_data', `${filename}.json`);
    console.log('Checking default file path:', defaultFilePath);

    if (!fs.existsSync(defaultFilePath)) {
        console.error('Default file does not exist:', defaultFilePath);
        return [];
    }

    const defaultData = JSON.parse(fs.readFileSync(defaultFilePath, 'utf8'));
    console.log('Default data loaded:', defaultData);

    if (userId) {
        const userFilePath = path.join(__dirname, 'user_data', userId, `${filename}.json`);
        console.log('Checking user file path:', userFilePath);

        if (fs.existsSync(userFilePath)) {
            const userData = JSON.parse(fs.readFileSync(userFilePath, 'utf8'));
            console.log('User data loaded:', userData);

            const mergedData = mergeArrays(defaultData, userData);
            console.log('Merged data:', mergedData);
            return mergedData;
        }
    }

    return defaultData;
}

// Routes
app.get('/list-sounds/:type', (req, res) => {
    const type = decodeURIComponent(req.params.type);
    const directoryPath = path.join(ASSETS_DIR, type);

    if (!fs.existsSync(directoryPath)) {
        return res.status(404).send({ error: `Directory ${type} not found` });
    }

    fs.readdir(directoryPath, { withFileTypes: true }, (err, entries) => {
        if (err) {
            return res.status(500).send('Failed to retrieve directory information');
        }
        const mp3Files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.mp3'));
        res.json(mp3Files.map((file) => file.name));
    });
});

app.post('/update-user-sounds', (req, res) => {
    const { userId, soundsType, sounds } = req.body;
    if (!userId || !soundsType || !sounds) {
        return res.status(400).send('Invalid data');
    }

    const userDir = path.join(USER_DATA_DIR, userId);
    ensureDirectoryExists(userDir);

    const filePath = path.join(userDir, `${soundsType}.json`);
    writeJSONFile(filePath, sounds);
    res.send('Data saved successfully');
});

app.get('/backgroundMusic', (req, res) => {
    const userId = req.query.userId || req.headers['user-id'] || req.body.userId;
    res.json(getData(userId, 'backgroundMusic'));
});

app.get('/ambianceSounds', (req, res) => {
    const userId = req.query.userId || req.headers['user-id'] || req.body.userId;
    res.json(getData(userId, 'ambianceSounds'));
});

app.get('/soundboard', (req, res) => {
    const userId = req.query.userId || req.headers['user-id'] || req.body.userId;
    res.json(getData(userId, 'soundboard'));
});

app.post('/save-preset', (req, res) => {
    const { userId, presetName, presetData } = req.body;
    if (!userId || !presetName || !presetData) {
        return res.status(400).send('Invalid data');
    }

    const userDir = path.join(USER_DATA_DIR, userId);
    ensureDirectoryExists(userDir);

    const filePath = path.join(userDir, 'presets.json');
    const presets = readJSONFile(filePath) || {};
    presets[presetName] = presetData;
    writeJSONFile(filePath, presets);

    res.send('Preset saved successfully');
});

app.get('/load-presets', (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).send('User ID is required');
    }

    const filePath = path.join(USER_DATA_DIR, userId, 'presets.json');
    const presets = readJSONFile(filePath) || {};
    res.json({ presets });
});

// WebSocket Server
const wsServer = new WebSocket.Server({ port: WS_PORT });
const subscribers = new Map();

wsServer.on('connection', (ws) => {
    let connectedId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'register':
                    connectedId = data.id;
                    if (!subscribers.has(connectedId)) {
                        subscribers.set(connectedId, new Set());
                    }
                    subscribers.get(connectedId).add(ws);
                    ws.send(JSON.stringify({ type: 'registered', id: connectedId }));
                    break;

                case 'subscribe':
                    connectedId = data.id;
                    if (!subscribers.has(connectedId)) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Session ID does not exist' }));
                        connectedId = null;
                    } else {
                        subscribers.get(connectedId).add(ws);
                        ws.send(JSON.stringify({ type: 'subscribed', id: connectedId }));
                    }
                    break;

                case 'message':
                case 'ambianceStatusUpdate':
                case 'backgroundMusicChange':
                case 'backgroundMusicVolumeChange':
                case 'backgroundMusicStop':
                case 'playSoundboardSound':
                    if (connectedId) {
                        const subs = subscribers.get(connectedId);
                        subs.forEach((client) => {
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(data));
                            }
                        });
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'Client not connected to any ID' }));
                    }
                    break;

                default:
                    console.warn('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    });

wsServer.on('connection', function connection(ws) {
  let connectedId = null; // The ID the client is connected to

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      console.log(`data.type :data.type`);

      switch (data.type) {
        case 'subscribe':
          // Client wants to subscribe to an ID
          console.log(`subscribe : ${connectedId}`);

          connectedId = data.id;
          if (!subscribers.has(connectedId)) {
            subscribers.set(connectedId, new Set());
            subscribers.get(connectedId).add(ws);
            ws.send(JSON.stringify({ type: 'subscribed', id: connectedId }));
            console.log(`Client registered and connected to ID: ${connectedId}`);
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
            subs.delete(ws);
            if (subs.size === 0) {
                subscribers.delete(connectedId);
            }
            } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Client not connected to any ID.' }));
            console.warn('Client not connected to any ID.');
            }
        break;
        case 'ping':
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
    });
});

// Start Servers
app.listen(PORT, () => console.log(`HTTP server running on port ${PORT}`));
console.log(`WebSocket server running on port ${WS_PORT}`);
