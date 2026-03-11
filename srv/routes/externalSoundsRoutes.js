const express = require('express');
const router = express.Router();
const {
  getExternalSounds,
  addExternalSound,
  deleteExternalSound,
  updateExternalSound,
} = require('../controllers/externalSoundsController');

router.get('/external-sounds', getExternalSounds);
router.post('/external-sounds', addExternalSound);
router.delete('/external-sounds/:id', deleteExternalSound);
router.patch('/external-sounds/:id', updateExternalSound);

module.exports = router;
