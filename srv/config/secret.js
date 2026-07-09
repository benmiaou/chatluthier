const fs = require('fs');
const path = require('path');

function loadSecrets() {
  // 1. Priority to environment variables (for Docker, PM2, etc.)
  if (process.env.ACCESS_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET) {
    return {
      accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
      refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    };
  }

  // 2. Otherwise, load from Tokens file (fallback for local dev)
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
    throw new Error(
      'Failed to load secrets - set ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET in environment or create srv/Tokens file'
    );
  }
}

module.exports = loadSecrets;
