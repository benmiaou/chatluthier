const path = require('node:path');
const adminGoogleIds = require('./fileUtils').loadAdminGoogleIds(
  path.join(__dirname, '..', 'adminGoogleIds.json')
);

function isAdminUser(userMail, payload = null) {
  // First check if payload has isAdmin flag (from JWT)
  if (payload?.isAdmin) {
    return true;
  }

  // Fallback to old Google IDs system for backward compatibility
  return adminGoogleIds.includes(userMail);
}

module.exports = {
  isAdminUser,
};
