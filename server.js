const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import CORS module
const fileUpload = require('express-fileupload');

const app = express();

app.use(cors(), fileUpload()); // Enable CORS for all routes
// Serve static files from the 'public' directory where 'index.html' is located
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
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

app.post('/upload', function(req, res) {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.fileUpload;

  // Use the mv() method to place the file somewhere on your server
  console.log(sampleFile);
  sampleFile.mv('./assets/uploaded/' + sampleFile.name, function(err) {
    if (err)
      return res.status(500).send(err);

    console.log('File uploaded!');
    res.redirect("/")
  });
});


app.listen(3000, '0.0.0.0', () => console.log('Server started on port 3000'));