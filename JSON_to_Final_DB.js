/**
 * Final JSON to Database Migration Script
 * 
 * This script migrates data from the original JSON files to the SQLite database
 * using the final optimized schema. It can be run anytime to ensure the database
 * matches the JSON source files exactly.
 * 
 * Usage: node srv/database/JSON_to_Final_DB.js
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class FinalDBMigrator {
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
                console.log('Database connection established');
                resolve();
            });
        });
    }

    async executeSchema() {
        console.log('Creating database schema...');
        
        const schema = `
            -- Users table
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Ambiance Sounds Table
            CREATE TABLE IF NOT EXISTS ambiance_sounds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL,
                image_file TEXT,
                contexts TEXT, -- JSON array
                credit TEXT,
                is_enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Background Music Table
            CREATE TABLE IF NOT EXISTS background_music (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL,
                contexts TEXT, -- JSON array
                credit TEXT,
                is_enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Soundboard Sounds Table
            CREATE TABLE IF NOT EXISTS soundboard_sounds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL,
                contexts TEXT, -- JSON array
                credit TEXT,
                is_enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- User tables for overrides
            CREATE TABLE IF NOT EXISTS user_ambiance_sounds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                sound_id INTEGER NOT NULL,
                is_enabled BOOLEAN,
                contexts TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (sound_id) REFERENCES ambiance_sounds(id),
                UNIQUE(user_id, sound_id)
            );

            CREATE TABLE IF NOT EXISTS user_background_music (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                sound_id INTEGER NOT NULL,
                is_enabled BOOLEAN,
                contexts TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (sound_id) REFERENCES background_music(id),
                UNIQUE(user_id, sound_id)
            );

            CREATE TABLE IF NOT EXISTS user_soundboard_sounds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                sound_id INTEGER NOT NULL,
                is_enabled BOOLEAN,
                contexts TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (sound_id) REFERENCES soundboard_sounds(id),
                UNIQUE(user_id, sound_id)
            );

            -- Presets
            CREATE TABLE IF NOT EXISTS user_presets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                preset_name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, preset_name)
            );

            CREATE TABLE IF NOT EXISTS user_preset_sounds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                preset_id INTEGER NOT NULL,
                sound_id INTEGER NOT NULL,
                volume_level REAL DEFAULT 0,
                FOREIGN KEY (preset_id) REFERENCES user_presets(id) ON DELETE CASCADE,
                FOREIGN KEY (sound_id) REFERENCES ambiance_sounds(id) ON DELETE CASCADE,
                UNIQUE(preset_id, sound_id)
            );

            -- Sound orders
            CREATE TABLE IF NOT EXISTS user_sound_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                sound_type TEXT NOT NULL,
                sound_order TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, sound_type)
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_ambiance_filename ON ambiance_sounds(filename);
            CREATE INDEX IF NOT EXISTS idx_background_filename ON background_music(filename);
            CREATE INDEX IF NOT EXISTS idx_soundboard_filename ON soundboard_sounds(filename);
        `;

        return new Promise((resolve, reject) => {
            this.db.exec(schema, (err) => {
                if (err) {
                    console.error('Error creating schema:', err.message);
                    reject(err);
                } else {
                    console.log('Database schema created');
                    resolve();
                }
            });
        });
    }

    async migrateServerSounds() {
        console.log('Migrating server sounds...');
        
        // Migrate ambiance sounds
        const ambianceSounds = JSON.parse(fs.readFileSync(path.join(__dirname, 'srv', 'srv_data', 'ambianceSounds.json'), 'utf8'));
        for (const sound of ambianceSounds) {
            await this.execute(
                'INSERT OR REPLACE INTO ambiance_sounds (filename, display_name, image_file, contexts, credit, is_enabled) VALUES (?, ?, ?, ?, ?, ?)',
                [sound.filename, sound.display_name, sound.imageFile || null, JSON.stringify(sound.contexts), sound.credit || '', sound.isEnabled || true]
            );
        }
        console.log(`✅ Migrated ${ambianceSounds.length} ambiance sounds`);

        // Migrate background music
        const backgroundMusic = JSON.parse(fs.readFileSync(path.join(__dirname, 'srv', 'srv_data', 'backgroundMusic.json'), 'utf8'));
        for (const sound of backgroundMusic) {
            await this.execute(
                'INSERT OR REPLACE INTO background_music (filename, display_name, contexts, credit, is_enabled) VALUES (?, ?, ?, ?, ?)',
                [sound.filename, sound.display_name, JSON.stringify(sound.contexts), sound.credit || '', sound.isEnabled || true]
            );
        }
        console.log(`✅ Migrated ${backgroundMusic.length} background music tracks`);

        // Migrate soundboard sounds
        const soundboardSounds = JSON.parse(fs.readFileSync(path.join(__dirname, 'srv', 'srv_data', 'soundboard.json'), 'utf8'));
        for (const sound of soundboardSounds) {
            await this.execute(
                'INSERT OR REPLACE INTO soundboard_sounds (filename, display_name, contexts, credit, is_enabled) VALUES (?, ?, ?, ?, ?)',
                [sound.filename, sound.display_name, JSON.stringify(sound.contexts), sound.credit || '', sound.isEnabled || true]
            );
        }
        console.log(`✅ Migrated ${soundboardSounds.length} soundboard sounds`);
    }

    async execute(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    console.error('Execute error:', query, params, err.message);
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    async runMigration() {
        try {
            console.log('Starting final JSON to DB migration...');
            await this.initializeDatabase();
            await this.executeSchema();
            await this.migrateServerSounds();
            await this.close();
            console.log('✅ Migration completed successfully!');
            console.log('Database is ready at:', this.dbPath);
        } catch (error) {
            console.error('Migration failed:', error);
            await this.close();
        }
    }
}

// Run the migration if this script is executed directly
if (require.main === module) {
    const migrator = new FinalDBMigrator();
    migrator.runMigration();
}

module.exports = FinalDBMigrator;