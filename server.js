const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import CORS module

const app = express();

app.use(cors()); // Enable CORS for all routes
// Serve static files from the 'public' directory where 'index.html' is located
app.use(express.static(path.join(__dirname, 'public')));
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
            res.json(files);
        }
    });
});

app.listen(3000, '0.0.0.0', () => console.log('Server started on port 3000'));