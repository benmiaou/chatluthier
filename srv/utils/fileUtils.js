const fs = require('fs');

function loadAdminGoogleIds(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading adminGoogleIds.json:', error);
        }
    } else {
        console.warn('adminGoogleIds.json does not exist. Initializing with an empty array.');
    }
    return [];
}

module.exports = {
    loadAdminGoogleIds,
};
