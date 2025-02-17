const express = require('express');
const router = express.Router();
const { getData, updateMainPlaylist, updateUserSound, savePreset, loadPresets } = require('../controllers/soundController');

router.get('/backgroundMusic', (req, res) => {
    const userId = req.query.userId || req.headers['user-id'] || req.body.userId;
    const backgroundMusicData = getData(userId, 'backgroundMusic');
    res.json(backgroundMusicData);
});

router.get('/ambianceSounds', (req, res) => {
    const userId = req.query.userId || req.headers['user-id'] || req.body.userId;
    const ambianceSoundsData = getData(userId, 'ambianceSounds');
    res.json(ambianceSoundsData);
});

router.get('/soundboard', (req, res) => {
    const userId = req.query.userId || req.headers['user-id'] || req.body.userId;
    const soundboardData = getData(userId, 'soundboard');
    res.json(soundboardData);
});

router.post('/save-preset', savePreset);
router.get('/load-presets', loadPresets);

router.post('/update-main-playlist', updateMainPlaylist);
router.post('/update-user-sound', updateUserSound);

module.exports = router;
