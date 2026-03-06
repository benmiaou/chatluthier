const fs = require('node:fs');
const path = require('node:path');

function loadSecrets() {
  const filePath = path.join(__dirname, '..', 'Tokens');
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const secrets = JSON.parse(data);
    return {
      accessTokenSecret: secrets.ACCESS_TOKEN_SECRET,
      refreshTokenSecret: secrets.REFRESH_TOKEN_SECRET,
    };
  } catch (error) {
    console.error('Error loading secrets:', error);
    throw new Error('Failed to load secrets');
  }
}

module.exports = loadSecrets;
