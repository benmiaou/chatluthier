const path = require('path');
const adminGoogleIds = require('./fileUtils').loadAdminGoogleIds(path.join(__dirname, '..', 'adminGoogleIds.json'));

function isAdminUser(userId) {
    console.log(adminGoogleIds)
    return adminGoogleIds.includes(userId);
}

module.exports = {
    isAdminUser,
};
