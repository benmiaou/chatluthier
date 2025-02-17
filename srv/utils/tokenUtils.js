const path = require('path');
const adminGoogleIds = require('./fileUtils').loadAdminGoogleIds(path.join(__dirname, '..', 'adminGoogleIds.json'));

function isAdminUser(payload) {
    return adminGoogleIds.includes(payload.sub);
}

module.exports = {
    isAdminUser,
};
