const path = require('path');
const adminGoogleIds = require('./fileUtils').loadAdminGoogleIds(path.join(__dirname, '..', 'adminGoogleIds.json'));

function isAdminUser(userMail) {
    return adminGoogleIds.includes(userMail);
}

module.exports = {
    isAdminUser,
};
