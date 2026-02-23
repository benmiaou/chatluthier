const fs = require('fs');
const path = require('path');
const db = require('./db');

/**
 * Migration script for existing user data from JSON to SQL
 * 
 * This script migrates user-specific data (presets, sound orders, sound overrides)
 * from the existing JSON files to the SQLite database.
 */

class UserDataMigrator {
    constructor() {
        this.userDataDir = path.join(__dirname, '..', 'user_data');
    }

    async initializeDatabase() {
        try {
            await db.initialize();
            console.log('Database initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize database:', error);
            return false;
        }
    }

    async migrateAllUsers() {
        if (!fs.existsSync(this.userDataDir)) {
            console.log('No user data directory found, nothing to migrate');
            return;
        }

        const userIds = fs.readdirSync(this.userDataDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        console.log(`Found ${userIds.length} users to migrate`);

        for (const userId of userIds) {
            try {
                await this.migrateUserData(userId);
                console.log(`✅ Migrated user ${userId}`);
            } catch (error) {
                console.error(`❌ Failed to migrate user ${userId}:`, error.message);
            }
        }
    }

    async migrateUserData(userId) {
        const userDir = path.join(this.userDataDir, userId);
        
        // Ensure user exists in database
        await this.ensureUserExists(userId);

        // Migrate sound overrides
        await this.migrateUserSounds(userId, userDir);
        
        // Migrate presets
        await this.migratePresets(userId, userDir);
        
        // Migrate sound orders
        await this.migrateSoundOrders(userId, userDir);
    }

    async ensureUserExists(userId) {
        const existingUser = await db.queryOne('SELECT id FROM users WHERE id = ?', [userId]);
        
        if (!existingUser) {
            await db.execute('INSERT INTO users (id, name, is_admin) VALUES (?, ?, ?)', [
                userId, 
                `User ${userId.substring(0, 8)}...`, // Truncated ID as name
                false
            ]);
        }
    }

    async migrateUserSounds(userId, userDir) {
        const soundFiles = [
            { filename: 'ambianceSounds.json', categoryId: 1 },
            { filename: 'backgroundMusic.json', categoryId: 2 },
            { filename: 'soundboard.json', categoryId: 3 }
        ];

        for (const { filename, categoryId } of soundFiles) {
            const filePath = path.join(userDir, filename);
            
            if (!fs.existsSync(filePath)) {
                continue;
            }

            const userSounds = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            for (const userSound of userSounds) {
                try {
                    // Get the server sound
                    const sound = await db.queryOne(
                        'SELECT id FROM server_sounds WHERE filename = ? AND category_id = ?',
                        [userSound.filename, categoryId]
                    );
                    
                    if (!sound) {
                        console.warn(`Sound not found: ${userSound.filename}`);
                        continue;
                    }

                    // Insert or update user sound
                    const existingUserSound = await db.queryOne(
                        'SELECT id FROM user_sounds WHERE user_id = ? AND sound_id = ?',
                        [userId, sound.id]
                    );

                    if (existingUserSound) {
                        await db.execute(
                            'UPDATE user_sounds SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [userSound.isEnabled, existingUserSound.id]
                        );
                        
                        // Delete existing contexts
                        await db.execute('DELETE FROM user_sound_contexts WHERE user_sound_id = ?', [existingUserSound.id]);
                    } else {
                        const result = await db.execute(
                            'INSERT INTO user_sounds (user_id, sound_id, is_enabled) VALUES (?, ?, ?)',
                            [userId, sound.id, userSound.isEnabled]
                        );
                        existingUserSound.id = result.lastID;
                    }

                    // Insert contexts
                    if (userSound.contexts && userSound.contexts.length > 0) {
                        for (let i = 0; i < userSound.contexts.length; i++) {
                            await db.execute(
                                'INSERT INTO user_sound_contexts (user_sound_id, context, context_index) VALUES (?, ?, ?)',
                                [existingUserSound.id, userSound.contexts[i], i]
                            );
                        }
                    }
                    
                } catch (error) {
                    console.error(`Error migrating sound ${userSound.filename}:`, error.message);
                }
            }
        }
    }

    async migratePresets(userId, userDir) {
        const presetFile = path.join(userDir, 'presets.json');
        
        if (!fs.existsSync(presetFile)) {
            return;
        }

        const presets = JSON.parse(fs.readFileSync(presetFile, 'utf8'));
        
        for (const [presetName, presetData] of Object.entries(presets)) {
            try {
                // Check if preset exists
                const existingPreset = await db.queryOne(
                    'SELECT id FROM user_presets WHERE user_id = ? AND preset_name = ?',
                    [userId, presetName]
                );

                let presetId;
                if (existingPreset) {
                    await db.execute(
                        'UPDATE user_presets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [existingPreset.id]
                    );
                    presetId = existingPreset.id;
                    
                    // Delete existing preset sounds
                    await db.execute('DELETE FROM user_preset_sounds WHERE preset_id = ?', [presetId]);
                } else {
                    const result = await db.execute(
                        'INSERT INTO user_presets (user_id, preset_name) VALUES (?, ?)',
                        [userId, presetName]
                    );
                    presetId = result.lastID;
                }

                // Insert preset sounds
                for (const [filename, volumeLevel] of Object.entries(presetData)) {
                    // Get the sound (assuming ambianceSounds for presets)
                    const sound = await db.queryOne(
                        'SELECT id FROM server_sounds WHERE filename = ? AND category_id = 1',
                        [filename]
                    );
                    
                    if (sound) {
                        await db.execute(
                            'INSERT INTO user_preset_sounds (preset_id, sound_id, volume_level) VALUES (?, ?, ?)',
                            [presetId, sound.id, volumeLevel]
                        );
                    }
                }
                
            } catch (error) {
                console.error(`Error migrating preset ${presetName}:`, error.message);
            }
        }
    }

    async migrateSoundOrders(userId, userDir) {
        const orderFile = path.join(userDir, 'soundOrders.json');
        
        if (!fs.existsSync(orderFile)) {
            return;
        }

        const soundOrders = JSON.parse(fs.readFileSync(orderFile, 'utf8'));
        
        // Migrate ambiance sounds order
        if (soundOrders.ambiance && soundOrders.ambiance.length > 0) {
            await this.migrateSoundOrder(userId, 1, soundOrders.ambiance);
        }
        
        // Migrate soundboard order
        if (soundOrders.soundboard && soundOrders.soundboard.length > 0) {
            await this.migrateSoundOrder(userId, 3, soundOrders.soundboard);
        }
    }

    async migrateSoundOrder(userId, categoryId, order) {
        try {
            const soundOrderJson = JSON.stringify(order);
            
            // Check if order exists
            const existing = await db.queryOne(
                'SELECT id FROM user_sound_orders WHERE user_id = ? AND category_id = ?',
                [userId, categoryId]
            );

            if (existing) {
                await db.execute(
                    'UPDATE user_sound_orders SET sound_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [soundOrderJson, existing.id]
                );
            } else {
                await db.execute(
                    'INSERT INTO user_sound_orders (user_id, category_id, sound_order) VALUES (?, ?, ?)',
                    [userId, categoryId, soundOrderJson]
                );
            }
            
        } catch (error) {
            console.error(`Error migrating sound order for category ${categoryId}:`, error.message);
        }
    }

    async runMigration() {
        console.log('Starting user data migration to SQL...');
        
        const dbInitialized = await this.initializeDatabase();
        if (!dbInitialized) {
            console.error('Database initialization failed, aborting migration');
            return;
        }

        try {
            await this.migrateAllUsers();
            console.log('User data migration completed!');
            
            // Close database
            await db.close();
            
        } catch (error) {
            console.error('Migration failed:', error);
            await db.close();
        }
    }
}

// Run the migration if this script is executed directly
if (require.main === module) {
    const migrator = new UserDataMigrator();
    migrator.runMigration();
}

module.exports = UserDataMigrator;