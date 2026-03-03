const path = require('node:path');

/**
 * Database Configuration for ChatLuthier
 */

const config = {
  // SQLite configuration
  sqlite: {
    filename: path.join(__dirname, 'chatluthier.db'),
    // SQLite connection options
    options: {
      timeout: 30000, // 30 seconds connection timeout
      // Other SQLite options can be added here
      // verbose: console.log, // Enable this for debugging if needed
    },
  },

  // Sound categories mapping
  soundCategories: {
    ambianceSounds: 1,
    backgroundMusic: 2,
    soundboard: 3,
  },

  // Reverse mapping for category names
  categoryNames: {
    1: 'ambianceSounds',
    2: 'backgroundMusic',
    3: 'soundboard',
  },
};

module.exports = config;
