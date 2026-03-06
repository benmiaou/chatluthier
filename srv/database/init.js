const db = require('./db');

/**
 * Database Initialization Script
 *
 * This script initializes the database schema and ensures the database is ready for use.
 */

async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // Initialize database connection
    await db.initialize();

    // Initialize schema if not already initialized
    await db.initializeSchema();

    console.log('Database initialization completed successfully!');

    // Close the connection
    await db.close();
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  await initializeDatabase();
}

module.exports = { initializeDatabase };
