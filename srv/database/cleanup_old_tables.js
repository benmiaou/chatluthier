const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Database Cleanup Script for ChatLuthier
 * 
 * This script removes old tables that are no longer needed after migrating
 * to the new unified schema.
 */

class DatabaseCleanup {
    constructor() {
        this.dbPath = path.join(__dirname, 'chatluthier.db');
        this.db = null;
    }

    async initializeDatabase() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    reject(err);
                    return;
                }
                console.log('Connected to SQLite database');
                resolve();
            });
        });
    }

    async checkOldTablesExist() {
        const oldTables = ['ambiance_sounds', 'background_music', 'soundboard_sounds', 
                          'user_ambiance_sounds', 'user_background_music', 'user_soundboard_sounds'];
        
        const existingTables = [];
        
        for (const table of oldTables) {
            const result = await this.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                [table]
            );
            if (result.length > 0) {
                existingTables.push(table);
            }
        }
        
        return existingTables;
    }

    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Query error:', sql, params, err.message);
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async execute(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Execute error:', sql, params, err.message);
                    reject(err);
                    return;
                }
                resolve({ 
                    lastID: this.lastID, 
                    changes: this.changes 
                });
            });
        });
    }

    async dropOldTables() {
        const oldTables = ['ambiance_sounds', 'background_music', 'soundboard_sounds', 
                          'user_ambiance_sounds', 'user_background_music', 'user_soundboard_sounds'];
        
        for (const table of oldTables) {
            try {
                console.log(`Dropping old table: ${table}`);
                await this.execute(`DROP TABLE IF EXISTS ${table}`);
            } catch (error) {
                console.error(`Error dropping table ${table}:`, error.message);
            }
        }
    }

    async closeDatabase() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                        reject(err);
                        return;
                    }
                    console.log('Database connection closed');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    async runCleanup() {
        try {
            console.log('Starting database cleanup...');
            
            await this.initializeDatabase();
            
            const oldTables = await this.checkOldTablesExist();
            if (oldTables.length === 0) {
                console.log('No old tables found. Database is already clean.');
                return;
            }
            
            console.log('Found old tables:', oldTables);
            console.log('These tables are no longer needed and will be removed.');
            
            await this.dropOldTables();
            
            console.log('Cleanup completed successfully!');
            console.log('Old tables have been removed.');
            
        } catch (error) {
            console.error('Cleanup failed:', error);
        } finally {
            await this.closeDatabase();
        }
    }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
    const cleanup = new DatabaseCleanup();
    cleanup.runCleanup();
}

module.exports = DatabaseCleanup;