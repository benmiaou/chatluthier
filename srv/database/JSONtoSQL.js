const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

/**
 * JSON to SQL Migration Script for ChatLuthier
 * 
 * This script migrates existing JSON data to the new SQLite database structure.
 * It only migrates server data (not user data) as requested, but prepares tables for user data.
 */

class JSONtoSQLMigrator {
    constructor() {
        this.dbPath = path.join(__dirname, 'chatluthier.db');
        this.db = null;
    }

    async initializeDatabase() {
        return new Promise((resolve, reject) => {
            // Open database connection
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

    async executeSchema() {
        return new Promise((resolve, reject) => {
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            this.db.exec(schema, (err) => {
                if (err) {
                    console.error('Error executing schema:', err.message);
                    reject(err);
                    return;
                }
                console.log('Database schema executed successfully');
                resolve();
            });
        });
    }

    async migrateServerSounds() {
        const categories = [
            { name: 'ambianceSounds', file: 'ambianceSounds.json', categoryId: 1 },
            { name: 'backgroundMusic', file: 'backgroundMusic.json', categoryId: 2 },
            { name: 'soundboard', file: 'soundboard.json', categoryId: 3 }
        ];

        for (const category of categories) {
            await this.migrateCategorySounds(category);
        }
    }

    async migrateCategorySounds(category) {
        const filePath = path.join(__dirname, '..', 'srv_data', category.file);
        
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}, skipping...`);
            return;
        }

        const soundsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`Migrating ${soundsData.length} ${category.name} sounds...`);

        for (const sound of soundsData) {
            await this.insertServerSound(sound, category.categoryId);
        }
    }

    async insertServerSound(soundData, categoryId) {
        return new Promise((resolve, reject) => {
            // Handle the nested contexts structure in backgroundMusic
            let contexts = soundData.contexts || [];
            
            // Flatten nested arrays if present (backgroundMusic has this structure)
            if (Array.isArray(contexts) && contexts.length > 0 && Array.isArray(contexts[0])) {
                contexts = contexts.flat();
            }

            // Insert the sound record
            const soundQuery = `
                INSERT OR IGNORE INTO server_sounds 
                (filename, display_name, category_id, image_file, credit, is_enabled)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(soundQuery, [
                soundData.filename,
                soundData.display_name,
                categoryId,
                soundData.imageFile || null,
                soundData.credit || '',
                soundData.isEnabled !== undefined ? soundData.isEnabled : true
            ], function(err) {
                if (err) {
                    console.error(`Error inserting sound ${soundData.filename}:`, err.message);
                    reject(err);
                    return;
                }

                const soundId = this.lastID;
                
                // Insert contexts
                if (contexts.length > 0) {
                    // Use parameterized queries for each context to avoid SQL injection
                    const insertContextPromises = contexts.map((context, index) => {
                        return new Promise((resolveContext, rejectContext) => {
                            const contextQuery = `
                                INSERT OR IGNORE INTO sound_contexts (sound_id, context, context_index)
                                VALUES (?, ?, ?)
                            `;
                            this.db.run(contextQuery, [soundId, context, index], (err) => {
                                if (err) {
                                    console.error(`Error inserting context '${context}' for sound ${soundData.filename}:`, err.message);
                                }
                                resolveContext();
                            });
                        });
                    });

                    Promise.all(insertContextPromises).then(() => resolve()).catch(resolve);
                } else {
                    resolve();
                }
            }.bind(this));
        });
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

    async runMigration() {
        try {
            console.log('Starting JSON to SQL migration...');
            
            await this.initializeDatabase();
            await this.executeSchema();
            await this.migrateServerSounds();
            
            console.log('Migration completed successfully!');
            console.log(`Database created at: ${this.dbPath}`);
            console.log('You can now update your backend code to use the SQLite database.');
            
        } catch (error) {
            console.error('Migration failed:', error);
        } finally {
            await this.closeDatabase();
        }
    }
}

// Run the migration if this script is executed directly
if (require.main === module) {
    const migrator = new JSONtoSQLMigrator();
    migrator.runMigration();
}

module.exports = JSONtoSQLMigrator;