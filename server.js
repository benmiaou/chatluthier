const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import CORS module

const app = express();

app.use(cors()); // Enable CORS for all routes

app.get('/list-sounds/:type', (req, res) => {
    const type = req.params.type;
    const directoryPath = path.join(__dirname, 'assets', 'background', type);
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

app.listen(3000, () => console.log('Server started on port 3000'));