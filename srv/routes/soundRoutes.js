const express = require('express');
const router = express.Router();
const { getData, updateMainPlaylist, updateUserSound, savePreset, loadPresets, addSound, deleteSound } = require('../controllers/soundController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

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
router.post('/delete-sound', deleteSound);
router.post('/update-main-playlist', updateMainPlaylist);
router.post('/update-user-sound', updateUserSound);
router.post('/add-sound', upload.fields([{ name: 'file' }, { name: 'imageFile' }]), addSound); // Add the addSound route

module.exports = router;
