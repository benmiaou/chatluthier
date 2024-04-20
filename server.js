const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import CORS module

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
    const type = req.params.type;
    directoryPath = "";
    if(type === "exploration" || type === "battle")
    {
        directoryPath = path.join(__dirname, 'assets', 'background', type);
    }
    else
    {
        directoryPath = path.join(__dirname, 'assets', type);
    }
    console.log(directoryPath);
    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error('Error getting directory information:', err); // Log the error
            res.status(500).send('Failed to retrieve directory information');
        } else {
            const mp3Files = files.filter(file => file.endsWith('.mp3'));
            res.json(mp3Files);
        }
    });
});
app.get('/list-files/:type', (req, res) => {
    const type = req.params.type;
    directoryPath = "";
    directoryPath = path.join(__dirname, 'assets', decodeURIComponent(type));
    console.log("Attempting to list files from:", directoryPath); // Debugging output

    fs.readdir(directoryPath, (err, files) => {
        console.log(files);
        if (err) {
            console.error('Error getting directory information:', err); // Log the error
            res.status(500).send('Failed to retrieve directory information');
        } else {
            res.json(files);
        }
    });
});

app.listen(3000, '0.0.0.0', () => console.log('Server started on port 3000'));