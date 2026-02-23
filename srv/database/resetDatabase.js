const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('./init');
const { JSONtoSQLMigrator } = require('./JSONtoSQL');
const config = require('./config');

/**
 * Database Reset Script
 * 
 * This script deletes the existing database file and creates a fresh one
 * with only server data (no user data).
 */

async function resetDatabase() {
    try {
        const dbPath = config.sqlite.filename;
        
        console.log('🔄 Starting database reset process...');
        console.log('📁 Database location:', dbPath);
        
        // Check if database file exists
        if (fs.existsSync(dbPath)) {
            console.log('🗑️  Deleting existing database file...');
            fs.unlinkSync(dbPath);
            console.log('✅ Existing database deleted successfully');
        } else {
            console.log('ℹ️  No existing database file found');
        }
        
        // Initialize fresh database with schema
        console.log('🚀 Initializing fresh database...');
        await initializeDatabase();
        
        // Migrate server sounds from JSON files
        console.log('🔄 Migrating server sounds to database...');
        const migrator = new JSONtoSQLMigrator();
        await migrator.initializeDatabase();
        await migrator.migrateServerSounds();
        await migrator.closeDatabase();
        console.log('✅ Server sounds migrated successfully');
        
        console.log('🎉 Database reset completed successfully!');
        console.log('📊 Database now contains:');
        console.log('   • Sound categories (ambianceSounds, backgroundMusic, soundboard)');
        console.log('   • All server sounds from JSON files');
        console.log('   • Sound contexts and metadata');
        console.log('👤 No user data has been migrated (as requested)');
        
    } catch (error) {
        console.error('💥 Database reset failed:', error);
        process.exit(1);
    }
}

// Run reset if this script is executed directly
if (require.main === module) {
    resetDatabase();
}

module.exports = { resetDatabase };