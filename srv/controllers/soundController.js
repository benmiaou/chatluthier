const fs = require('fs');
const path = require('path');
const { verifyjwt } = require('./authController');
const { isAdminUser } = require('../utils/tokenUtils');

function getData(userId, filename) {
    const defaultFilePath = path.join(__dirname, '..', 'srv_data', `${filename}.json`);
    const defaultArray = JSON.parse(fs.readFileSync(defaultFilePath, 'utf8'));

    if (userId) {
        const userFilePath = path.join(__dirname, '..', 'user_data', userId, `${filename}.json`);
        if (fs.existsSync(userFilePath)) {
            return JSON.parse(fs.readFileSync(userFilePath, 'utf8'));
        }
    }

    return defaultArray;
}

async function deleteSound(req, res) {
    const { soundType, filename } = req.body;
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
        return res.status(400).json({ error: 'Missing ID token.' });
    }

    try {
        const payload = await verifyjwt(accessToken);
        const userId = payload.userId;
        const isAdmin = isAdminUser(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'User is not authorized to delete sounds.' });
        }

        const assetsDir = path.join(__dirname, '../..', 'assets');
        let soundFilePath, imageFilePath, jsonFilePath;

        switch (soundType) {
            case 'backgroundMusic':
                soundFilePath = path.join(assetsDir, 'background', filename);
                jsonFilePath = path.join(__dirname, '..', 'srv_data', 'backgroundMusic.json');
                break;
            case 'ambianceSounds':
                soundFilePath = path.join(assetsDir, 'ambiance', filename);
                imageFilePath = path.join(assetsDir, 'images', 'backgrounds', filename.replace(/\.[^/.]+$/, '.png')); // Assuming image has the same name with .png extension
                jsonFilePath = path.join(__dirname, '..', 'srv_data', 'ambianceSounds.json');
                break;
            case 'soundboard':
                soundFilePath = path.join(assetsDir, 'soundboard', filename);
                jsonFilePath = path.join(__dirname, '..', 'srv_data', 'soundboard.json');
                break;
            default:
                return res.status(400).json({ error: 'Invalid sound category.' });
        }

        // Remove the sound file
        if (fs.existsSync(soundFilePath)) {
            fs.unlinkSync(soundFilePath);
        } else {
            return res.status(404).json({ error: 'Sound file not found.' });
        }

        // Remove the image file if applicable
        if (imageFilePath && fs.existsSync(imageFilePath)) {
            fs.unlinkSync(imageFilePath);
        }

        // Update the JSON data
        let sounds = [];
        if (fs.existsSync(jsonFilePath)) {
            sounds = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
        } else {
            return res.status(404).json({ error: 'json file not found.' });
        }

        const updatedSounds = sounds.filter(sound => sound.filename !== filename);
        fs.writeFileSync(jsonFilePath, JSON.stringify(updatedSounds, null, 2));

        return res.json({ message: 'Sound deleted successfully.' });
    } catch (error) {
        console.error('Error deleting sound:', error);
        return res.status(500).json({ error: 'Failed to delete sound.' });
    }
}


async function addSound(req, res) {
    const { category, display_name, contexts, credit } = req.body;
    const accessToken = req.cookies.accessToken;
    const file = req.files['file'][0];
    const imageFile = req.files['imageFile'] ? req.files['imageFile'][0] : null;

    if (!accessToken) {
        return res.status(400).json({ error: 'Missing ID token or updated playlist.' });
    }

    try {
        const payload = await verifyjwt(accessToken);
        const userId = payload.userId;
        const isAdmin = isAdminUser(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'User is not authorized to edit the main playlist.' });
        }

        const assetsDir = path.join(__dirname, '../..', 'assets');
        let soundFilePath, imageFilePath;

        const sanitizedFileName = file.originalname.replace(/ /g, '_');
        const sanitizedImageFileName = imageFile ? imageFile.originalname.replace(/ /g, '_') : null;

        switch (category) {
            case 'backgroundmusic':
                soundFilePath = path.join(assetsDir, 'background', sanitizedFileName);
                break;
            case 'ambiancesounds':
                soundFilePath = path.join(assetsDir, 'ambiance', sanitizedFileName);
                if (imageFile) {
                    imageFilePath = path.join(assetsDir, 'images', 'backgrounds', sanitizedImageFileName);
                }
                break;
            case 'soundboard':
                soundFilePath = path.join(assetsDir, 'soundboard', sanitizedFileName);
                break;
            default:
                return res.status(400).json({ error: 'Invalid sound category.' });
        }

        fs.renameSync(file.path, soundFilePath);
        if (imageFile) {
            fs.renameSync(imageFile.path, imageFilePath);
        }

        const jsonFilePath = path.join(__dirname, '..', 'srv_data', `${category}.json`);
        let sounds = [];
        if (fs.existsSync(jsonFilePath)) {
            sounds = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
        }

        const newSound = {
            filename: sanitizedFileName,
            display_name: display_name,
            contexts: contexts.split(',').map(context => context.trim()),
            credit: credit
        };

        if (imageFile) {
            newSound.imageFile = sanitizedImageFileName;
        }

        sounds.push(newSound);
        fs.writeFileSync(jsonFilePath, JSON.stringify(sounds, null, 2));

        return res.json({ message: 'Sound added successfully.' });
    } catch (error) {
        console.error('Error adding sound:', error);
        return res.status(500).json({ error: 'Failed to add sound.' });
    }
}


async function updateMainPlaylist(req, res) {
    const { soundsType, sounds } = req.body;
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
        return res.status(400).json({ error: 'Missing ID token or updated playlist.' });
    }

    try {
        const payload = await verifyjwt(accessToken);
        const userId = payload.userId;
        const isAdmin = isAdminUser(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'User is not authorized to edit the main playlist.' });
        }

        const srvDir = path.join(__dirname, '..', 'srv_data');
        const filePath = path.join(srvDir, `${soundsType}.json`);

        fs.writeFileSync(filePath, JSON.stringify(sounds, null, 2));

        return res.json({ message: 'Main playlist updated successfully.' });
    } catch (error) {
        console.error('Error updating main playlist:', error);
        return res.status(500).json({ error: 'Failed to update main playlist.' });
    }
}

async function updateUserSound(req, res) {
    const { userId, soundsType, filename, isEnabled, contexts } = req.body;

    if (!userId || !soundsType || !filename) {
        res.status(400).send('Invalid data');
        return;
    }

    const userDir = path.join(__dirname, '..', 'user_data', userId);

    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }

    const filePath = path.join(userDir, `${soundsType}.json`);
    let existingSounds = [];
    if (fs.existsSync(filePath)) {
        existingSounds = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    const soundIndex = existingSounds.findIndex(sound => sound.filename === filename);
    if (soundIndex !== -1) {
        existingSounds[soundIndex].contexts = contexts;
        existingSounds[soundIndex].isEnabled = isEnabled;
    } else {
        existingSounds.push({
            filename: filename,
            isEnabled: isEnabled,
            contexts: contexts
        });
    }

    fs.writeFileSync(filePath, JSON.stringify(existingSounds, null, 2));
    res.send('Data updated successfully');
}

function savePreset(req, res) {
    const { userId, presetName, presetData } = req.body;

    if (!userId || !presetName || !presetData) {
        return res.status(400).send('Invalid data');
    }

    const userDir = path.join(__dirname, '..', 'user_data', userId);

    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }

    const filePath = path.join(userDir, 'presets.json');
    let userPresets = {};

    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        userPresets = JSON.parse(data);
    }

    userPresets[presetName] = presetData;

    fs.writeFileSync(filePath, JSON.stringify(userPresets, null, 2));

    res.send('Preset saved successfully');
}

function loadPresets(req, res) {
    const userId = req.query.userId;
    if (userId) {
        const userFilePath = path.join(__dirname, '..', 'user_data', userId, 'presets.json');
        if (fs.existsSync(userFilePath)) {
            const userPresets = JSON.parse(fs.readFileSync(userFilePath, 'utf8'));
            res.json({ presets: userPresets });
        } else {
            res.json({ presets: {} });
        }
    } else {
        res.status(400).send('User ID is required');
    }
}

module.exports = {
    getData,
    updateMainPlaylist,
    updateUserSound,
    savePreset,
    loadPresets,
    addSound,
    deleteSound,
};