const express = require('express');
const router = express.Router();
const {
  refreshToken,
  checkSession,
  logout,
  registerWithPseudo,
  loginWithPseudo,
  changePassword,
  requestPasswordReset,
  getSecretQuestion,
  checkPseudoAvailable,
} = require('../controllers/authController');
router.post('/refresh-token', refreshToken);
router.get('/check-session', checkSession);
router.post('/logout', logout);

// Pseudo/Password Authentication Routes
router.post('/register', registerWithPseudo);
router.post('/login', loginWithPseudo);
router.post('/change-password', changePassword);
router.post('/request-password-reset', requestPasswordReset);
router.post('/get-secret-question', getSecretQuestion);
router.post('/check-pseudo-available', checkPseudoAvailable);

module.exports = router;
