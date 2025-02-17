const express = require('express');
const router = express.Router();
const { addSoundRequest, getRequests, closeRequest } = require('../controllers/requestController');

router.post('/request-sound', addSoundRequest);
router.get('/get-requests', getRequests);
router.post('/close-request', closeRequest);

module.exports = router;
