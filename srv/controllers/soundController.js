const fs = require('fs');
const path = require('path');
const { verifyIdToken } = require('./authController');
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

async function updateMainPlaylist(req, res) {
    const { userId, idToken, soundsType, sounds } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'Missing ID token or updated playlist.' });
    }

    try {
        const payload = await verifyIdToken(idToken);
        if (userId != payload.sub) {
            return res.status(403).json({ error: 'User is not authorized to edit the main playlist.' });
        }

        const isAdmin = isAdminUser(payload);
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
};