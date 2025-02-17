const express = require('express');
const router = express.Router();
const { verifyLogin, refreshToken, checkSession, logout } = require('../controllers/authController');

router.post('/verify-login', verifyLogin);
router.post('/refresh-token', refreshToken);
router.get('/check-session', checkSession);
router.post('/logout', logout);

module.exports = router;
