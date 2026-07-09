const express = require('express');
const router = express.Router();
const {
  getData,
  updateMainPlaylist,
  updateUserSound,
  savePreset,
  loadPresets,
  getSoundOrderV2,
  saveSoundOrderV2,
  addSound,
  deleteSound,
  updateUserSoundsBatch,
  getAllContexts,
} = require('../controllers/soundController.sql');
const multer = require('multer');

// Configure multer with a file size limit
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 }, // Set limit to 50 MB
});

router.get('/backgroundMusic', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['user-id'] || req.body.userId;
    const backgroundMusicData = await getData(userId, 'backgroundMusic');
    res.json(backgroundMusicData);
  } catch (error) {
    console.error('Error getting background music:', error);
    res.status(500).json({ error: 'Failed to get background music data' });
  }
});

router.get('/ambianceSounds', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['user-id'] || req.body.userId;
    const ambianceSoundsData = await getData(userId, 'ambianceSounds');
    res.json(ambianceSoundsData);
  } catch (error) {
    console.error('Error getting ambiance sounds:', error);
    res.status(500).json({ error: 'Failed to get ambiance sounds data' });
  }
});

router.get('/soundboard', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['user-id'] || req.body.userId;
    const soundboardData = await getData(userId, 'soundboard');
    res.json(soundboardData);
  } catch (error) {
    console.error('Error getting soundboard data:', error);
    res.status(500).json({ error: 'Failed to get soundboard data' });
  }
});

router.post('/save-preset', savePreset);
router.get('/load-presets', loadPresets);
router.get('/get-sound-order', getSoundOrderV2);
router.post('/save-sound-order', saveSoundOrderV2);
router.post('/delete-sound', deleteSound);
router.post(
  '/update-main-playlist',
  upload.fields([{ name: 'imageFiles', maxCount: 10 }]),
  updateMainPlaylist
);
router.post('/update-user-sound', updateUserSound);
router.post('/update-user-sounds-batch', updateUserSoundsBatch);
router.post('/add-sound', upload.fields([{ name: 'file' }, { name: 'imageFile' }]), addSound); // Add the addSound route
router.get('/contexts', getAllContexts);

module.exports = router;
