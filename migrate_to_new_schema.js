// Migration script to new schema with separate tables
const fs = require('fs');
const db = require('./srv/database/db');

async function migrateToNewSchema() {
    try {
        console.log('Starting migration to new schema...');
        await db.initialize();
        
        // First, create new tables
        console.log('Creating new tables...');
        const schema = fs.readFileSync('srv/database/create_new_schema.sql', 'utf8');
        await new Promise((resolve, reject) => {
            db.db.exec(schema, (err) => {
                if (err) {
                    console.error('Error creating new tables:', err.message);
                    reject(err);
                } else {
                    console.log('New tables created successfully');
                    resolve();
                }
            });
        });
        
        // Migrate ambiance sounds
        console.log('Migrating ambiance sounds...');
        const ambianceSounds = JSON.parse(fs.readFileSync('srv/srv_data/ambianceSounds.json', 'utf8'));
        for (const sound of ambianceSounds) {
            await db.execute(
                'INSERT INTO ambiance_sounds (filename, display_name, image_file, contexts, credit, is_enabled) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    sound.filename,
                    sound.display_name,
                    sound.imageFile || null,
                    JSON.stringify(sound.contexts), // Store as JSON
                    sound.credit || '',
                    sound.isEnabled || true
                ]
            );
        }
        console.log(`✅ Migrated ${ambianceSounds.length} ambiance sounds`);
        
        // Migrate background music
        console.log('Migrating background music...');
        const backgroundMusic = JSON.parse(fs.readFileSync('srv/srv_data/backgroundMusic.json', 'utf8'));
        for (const sound of backgroundMusic) {
            await db.execute(
                'INSERT INTO background_music (filename, display_name, contexts, credit, is_enabled) VALUES (?, ?, ?, ?, ?)',
                [
                    sound.filename,
                    sound.display_name,
                    JSON.stringify(sound.contexts), // Store as JSON
                    sound.credit || '',
                    sound.isEnabled || true
                ]
            );
        }
        console.log(`✅ Migrated ${backgroundMusic.length} background music tracks`);
        
        // Migrate soundboard sounds
        console.log('Migrating soundboard sounds...');
        const soundboardSounds = JSON.parse(fs.readFileSync('srv/srv_data/soundboard.json', 'utf8'));
        for (const sound of soundboardSounds) {
            await db.execute(
                'INSERT INTO soundboard_sounds (filename, display_name, contexts, credit, is_enabled) VALUES (?, ?, ?, ?, ?)',
                [
                    sound.filename,
                    sound.display_name,
                    JSON.stringify(sound.contexts), // Store as JSON
                    sound.credit || '',
                    sound.isEnabled || true
                ]
            );
        }
        console.log(`✅ Migrated ${soundboardSounds.length} soundboard sounds`);
        
        await db.close();
        console.log('Migration to new schema completed successfully!');
        
    } catch (error) {
        console.error('Migration error:', error);
        await db.close();
    }
}

// Run the migration
migrateToNewSchema();