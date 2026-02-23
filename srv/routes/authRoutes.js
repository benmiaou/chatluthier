const express = require('express');
const router = express.Router();
const { 
    verifyLogin, 
    refreshToken, 
    checkSession, 
    logout,
    registerWithPseudo,
    loginWithPseudo,
    changePassword,
    requestPasswordReset,
    getSecretQuestion 
} = require('../controllers/authController');

router.post('/verify-login', verifyLogin);
router.post('/refresh-token', refreshToken);
router.get('/check-session', checkSession);
router.post('/logout', logout);

// Pseudo/Password Authentication Routes
router.post('/register', registerWithPseudo);
router.post('/login', loginWithPseudo);
router.post('/change-password', changePassword);
router.post('/request-password-reset', requestPasswordReset);
router.post('/get-secret-question', getSecretQuestion);

module.exports = router;
