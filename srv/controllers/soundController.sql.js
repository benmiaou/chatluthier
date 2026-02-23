const path = require('path');
const db = require('../database/db');
const config = require('../database/config');
const { verifyjwt } = require('./authController');
const { isAdminUser } = require('../utils/tokenUtils');

/**
 * SQL-based Sound Controller for ChatLuthier
 * 
 * This controller replaces the file-based sound controller with SQLite database operations.
 */

async function getData(userId, filename) {
    const categoryId = config.soundCategories[filename];
    if (!categoryId) {
        console.error('Invalid sound category:', filename);
        return [];
    }

    // Get all sounds for this category
    const sql = `
        SELECT s.* 
        FROM server_sounds s 
        WHERE s.category_id = ? 
        ORDER BY s.display_name
    `;

    const sounds = await db.query(sql, [categoryId]);

    // If no userId, return server defaults
    if (!userId) {
        return await addContextsToSounds(sounds);
    }

    // Get user-specific overrides
    return await getUserSoundsWithOverrides(userId, sounds);
}

async function addContextsToSounds(sounds) {
    // Add contexts to each sound
    return Promise.all(sounds.map(async (sound) => {
        const dbContexts = await db.getSoundContexts(sound.id);
        
        // Convert database contexts back to original format
        const contexts = dbContexts.map(ctx => {
            // ctx is a string from getSoundContexts
            if (typeof ctx === 'string' && ctx.includes(':')) {
                const [intensity, context] = ctx.split(':');
                return [intensity, context];
            }
            return ctx;
        });
        
        return {
            filename: sound.filename,
            display_name: sound.display_name,
            imageFile: sound.image_file, // Convert image_file to imageFile
            contexts,
            credit: sound.credit,
            isEnabled: Boolean(sound.is_enabled) // Convert 1/0 to true/false
        };
    }));
}

async function getUserSoundsWithOverrides(userId, serverSounds) {
    // Get all user sound overrides for these sounds
    const soundIds = serverSounds.map(s => s.id);
    const placeholders = soundIds.map(() => '?').join(',');

    const sql = `
        SELECT us.sound_id, us.is_enabled, us.id as user_sound_id
        FROM user_sounds us
        WHERE us.user_id = ? AND us.sound_id IN (${placeholders})
    `;

    const userSounds = await db.query(sql, [userId, ...soundIds]);

    // Create a map for quick lookup
    const userSoundMap = {};
    userSounds.forEach(us => {
        userSoundMap[us.sound_id] = us;
    });

    // Merge server sounds with user overrides
    return Promise.all(serverSounds.map(async (sound) => {
        const userSound = userSoundMap[sound.id];
        const contexts = await getContextsForSoundWithUserOverrides(sound.id, userSound);

        return {
            filename: sound.filename,
            display_name: sound.display_name,
            imageFile: sound.image_file,
            contexts,
            credit: sound.credit,
            isEnabled: Boolean(userSound ? userSound.is_enabled : sound.is_enabled)
        };
    }));
}

async function getContextsForSoundWithUserOverrides(soundId, userSound) {
    if (userSound) {
        // Get user-specific contexts
        const userContexts = await db.getUserSoundContexts(userSound.id);
        if (userContexts.length > 0) {
            return userContexts;
        }
    }

    // Fall back to server contexts
    return db.getSoundContexts(soundId);
}

async function deleteSound(req, res) {
    const { soundType, filename } = req.body;
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
        return res.status(400).json({ error: 'Missing ID token.' });
    }

    try {
        const payload = await verifyjwt(accessToken);
        const email = payload.email;
        const isAdmin = isAdminUser(email);
        if (!isAdmin) {
            return res.status(403).json({ error: 'User is not authorized to delete sounds.' });
        }

        const categoryId = config.soundCategories[soundType];
        if (!categoryId) {
            return res.status(400).json({ error: 'Invalid sound category.' });
        }

        // Get the sound to delete
        const sound = await db.getSoundByFilename(filename, categoryId);
        if (!sound) {
            return res.status(404).json({ error: 'Sound not found.' });
        }

        // Delete the sound and its contexts in a transaction
        await db.beginTransaction();

        try {
            // Delete sound contexts first (due to foreign key constraints)
            await db.execute('DELETE FROM sound_contexts WHERE sound_id = ?', [sound.id]);

            // Delete the sound
            await db.execute('DELETE FROM server_sounds WHERE id = ?', [sound.id]);

            await db.commit();

            return res.json({ message: 'Sound deleted successfully.' });
        } catch (error) {
            await db.rollback();
            console.error('Error deleting sound:', error);
            return res.status(500).json({ error: 'Failed to delete sound.' });
        }

    } catch (error) {
        console.error('Error deleting sound:', error);
        return res.status(500).json({ error: 'Failed to delete sound.' });
    }
}

async function addSound(req, res) {
    const { category, display_name, contexts, credit } = req.body;
    const accessToken = req.cookies.accessToken;
    const file = req.files['file'][0];
    const imageFile = req.files['imageFile'] ? req.files['imageFile'][0] : null;

    if (!accessToken) {
        return res.status(400).json({ error: 'Missing ID token or updated playlist.' });
    }

    try {
        const payload = await verifyjwt(accessToken);
        const email = payload.email;
        const isAdmin = isAdminUser(email);
        if (!isAdmin) {
            return res.status(403).json({ error: 'User is not authorized to edit the main playlist.' });
        }

        const categoryId = config.soundCategories[category];
        if (!categoryId) {
            return res.status(400).json({ error: 'Invalid sound category.' });
        }

        const assetsDir = path.join(__dirname, '../..', 'assets');
        let soundFilePath, imageFilePath;

        const sanitizedFileName = file.originalname.replace(/ /g, '_');
        const sanitizedImageFileName = imageFile ? imageFile.originalname.replace(/ /g, '_') : null;

        switch (category) {
            case 'backgroundMusic':
                soundFilePath = path.join(assetsDir, 'background', sanitizedFileName);
                break;
            case 'ambianceSounds':
                soundFilePath = path.join(assetsDir, 'ambiance', sanitizedFileName);
                if (imageFile) {
                    imageFilePath = path.join(assetsDir, 'images', 'backgrounds', sanitizedImageFileName);
                }
                break;
            case 'soundboard':
                soundFilePath = path.join(assetsDir, 'soundboard', sanitizedFileName);
                break;
            default:
                return res.status(400).json({ error: 'Invalid sound category.' });
        }

        // Move uploaded files
        require('fs').renameSync(file.path, soundFilePath);
        if (imageFile) {
            require('fs').renameSync(imageFile.path, imageFilePath);
        }

        // Parse contexts as JSON
        let parsedContexts;
        try {
            parsedContexts = JSON.parse(contexts);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid contexts format.' });
        }

        // Insert the sound in a transaction
        await db.beginTransaction();

        try {
            // Insert the sound
            const result = await db.execute(
                'INSERT INTO server_sounds (filename, display_name, category_id, image_file, credit, is_enabled) VALUES (?, ?, ?, ?, ?, ?)',
                [sanitizedFileName, display_name, categoryId, sanitizedImageFileName || null, credit || '', true]
            );

            const soundId = result.lastID;

            // Insert contexts
            for (let i = 0; i < parsedContexts.length; i++) {
                await db.execute(
                    'INSERT INTO sound_contexts (sound_id, context, context_index) VALUES (?, ?, ?)',
                    [soundId, parsedContexts[i], i]
                );
            }

            await db.commit();

            return res.json({ message: 'Sound added successfully.' });
        } catch (error) {
            await db.rollback();
            console.error('Error adding sound:', error);
            return res.status(500).json({ error: 'Failed to add sound.' });
        }

    } catch (error) {
        console.error('Error adding sound:', error);
        return res.status(500).json({ error: 'Failed to add sound.' });
    }
}

async function updateMainPlaylist(req, res) {
    const { soundsType, sounds } = req.body;
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
        return res.status(400).json({ error: 'Missing ID token or updated playlist.' });
    }

    try {
        const payload = await verifyjwt(accessToken);
        const email = payload.email;
        const isAdmin = isAdminUser(email);
        if (!isAdmin) {
            return res.status(403).json({ error: 'User is not authorized to edit the main playlist.' });
        }

        const categoryId = config.soundCategories[soundsType];
        if (!categoryId) {
            return res.status(400).json({ error: 'Invalid sound category.' });
        }

        // Update all sounds for this category in a transaction
        await db.beginTransaction();

        try {
            // First, delete all existing sounds in this category
            const existingSounds = await db.query('SELECT id FROM server_sounds WHERE category_id = ?', [categoryId]);
            
            for (const sound of existingSounds) {
                // Delete contexts first
                await db.execute('DELETE FROM sound_contexts WHERE sound_id = ?', [sound.id]);
            }
            
            await db.execute('DELETE FROM server_sounds WHERE category_id = ?', [categoryId]);

            // Insert updated sounds
            for (const sound of sounds) {
                // Handle the nested contexts structure
                let contexts = sound.contexts || [];
                if (Array.isArray(contexts) && contexts.length > 0 && Array.isArray(contexts[0])) {
                    contexts = contexts.flat();
                }

                // Insert the sound
                const result = await db.execute(
                    'INSERT INTO server_sounds (filename, display_name, category_id, image_file, credit, is_enabled) VALUES (?, ?, ?, ?, ?, ?)',
                    [sound.filename, sound.display_name, categoryId, sound.imageFile || null, sound.credit || '', sound.isEnabled || true]
                );

                const soundId = result.lastID;

                // Insert contexts
                for (let i = 0; i < contexts.length; i++) {
                    await db.execute(
                        'INSERT INTO sound_contexts (sound_id, context, context_index) VALUES (?, ?, ?)',
                        [soundId, contexts[i], i]
                    );
                }
            }

            await db.commit();

            return res.json({ message: 'Main playlist updated successfully.' });
        } catch (error) {
            await db.rollback();
            console.error('Error updating main playlist:', error);
            return res.status(500).json({ error: 'Failed to update main playlist.' });
        }

    } catch (error) {
        console.error('Error updating main playlist:', error);
        return res.status(500).json({ error: 'Failed to update main playlist.' });
    }
}

async function updateUserSound(req, res) {
    const { userId, soundsType, filename, isEnabled, contexts } = req.body;

    if (!userId || !soundsType || !filename) {
        res.status(400).send('Invalid data');
        return;
    }

    try {
        const categoryId = config.soundCategories[soundsType];
        if (!categoryId) {
            return res.status(400).json({ error: 'Invalid sound category.' });
        }

        // Get the server sound
        const sound = await db.getSoundByFilename(filename, categoryId);
        if (!sound) {
            return res.status(404).json({ error: 'Sound not found.' });
        }

        // Parse contexts
        let parsedContexts = [];
        try {
            if (contexts) {
                parsedContexts = JSON.parse(contexts);
            }
        } catch (e) {
            return res.status(400).json({ error: 'Invalid contexts format.' });
        }

        // Check if user sound record exists
        const existingUserSound = await db.getUserSound(userId, sound.id);

        await db.beginTransaction();

        try {
            if (existingUserSound) {
                // Update existing record
                await db.execute(
                    'UPDATE user_sounds SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [isEnabled, existingUserSound.id]
                );

                // Delete existing contexts
                await db.execute('DELETE FROM user_sound_contexts WHERE user_sound_id = ?', [existingUserSound.id]);
            } else {
                // Insert new record
                const result = await db.execute(
                    'INSERT INTO user_sounds (user_id, sound_id, is_enabled) VALUES (?, ?, ?)',
                    [userId, sound.id, isEnabled]
                );
                existingUserSound.id = result.lastID;
            }

            // Insert new contexts
            for (let i = 0; i < parsedContexts.length; i++) {
                await db.execute(
                    'INSERT INTO user_sound_contexts (user_sound_id, context, context_index) VALUES (?, ?, ?)',
                    [existingUserSound.id, parsedContexts[i], i]
                );
            }

            await db.commit();
            res.send('Data updated successfully');
        } catch (error) {
            await db.rollback();
            console.error('Error updating user sound:', error);
            res.status(500).send('Failed to update user sound');
        }

    } catch (error) {
        console.error('Error in updateUserSound:', error);
        res.status(500).send('Internal server error');
    }
}

async function savePreset(req, res) {
    const { userId, presetName, presetData } = req.body;

    if (!userId || !presetName || !presetData) {
        return res.status(400).send('Invalid data');
    }

    try {
        await db.beginTransaction();

        try {
            // Check if preset exists
            const existingPreset = await db.queryOne(
                'SELECT id FROM user_presets WHERE user_id = ? AND preset_name = ?',
                [userId, presetName]
            );

            let presetId;
            if (existingPreset) {
                // Update existing preset
                await db.execute(
                    'UPDATE user_presets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [existingPreset.id]
                );
                presetId = existingPreset.id;
                
                // Delete existing preset sounds
                await db.execute('DELETE FROM user_preset_sounds WHERE preset_id = ?', [presetId]);
            } else {
                // Insert new preset
                const result = await db.execute(
                    'INSERT INTO user_presets (user_id, preset_name) VALUES (?, ?)',
                    [userId, presetName]
                );
                presetId = result.lastID;
            }

            // Insert preset sounds
            for (const [filename, volumeLevel] of Object.entries(presetData)) {
                // Get the sound by filename (assuming ambianceSounds category for presets)
                const sound = await db.getSoundByFilename(filename, config.soundCategories.ambianceSounds);
                if (sound) {
                    await db.execute(
                        'INSERT INTO user_preset_sounds (preset_id, sound_id, volume_level) VALUES (?, ?, ?)',
                        [presetId, sound.id, volumeLevel]
                    );
                }
            }

            await db.commit();
            res.send('Preset saved successfully');
        } catch (error) {
            await db.rollback();
            console.error('Error saving preset:', error);
            res.status(500).send('Failed to save preset');
        }

    } catch (error) {
        console.error('Error in savePreset:', error);
        res.status(500).send('Internal server error');
    }
}

async function loadPresets(req, res) {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).send('User ID is required');
    }

    try {
        // Get all presets for the user
        const presets = await db.query(
            'SELECT id, preset_name FROM user_presets WHERE user_id = ?',
            [userId]
        );

        const result = {};

        // Get sounds for each preset
        for (const preset of presets) {
            const presetSounds = await db.query(
                'SELECT s.filename, ps.volume_level ' +
                'FROM user_preset_sounds ps ' +
                'JOIN server_sounds s ON ps.sound_id = s.id ' +
                'WHERE ps.preset_id = ?',
                [preset.id]
            );

            const presetData = {};
            presetSounds.forEach(ps => {
                presetData[ps.filename] = ps.volume_level;
            });

            result[preset.preset_name] = presetData;
        }

        res.json({ presets: result });
    } catch (error) {
        console.error('Error loading presets:', error);
        res.status(500).send('Failed to load presets');
    }
}

async function getSoundOrder(req, res) {
    const userId = req.query.userId;
    const soundType = req.query.soundType;
    
    if (!userId || !soundType) {
        return res.status(400).send('User ID and sound type are required');
    }

    try {
        const categoryId = config.soundCategories[soundType];
        if (!categoryId) {
            return res.status(400).json({ error: 'Invalid sound category.' });
        }

        // Get sound order for this user and category
        const result = await db.queryOne(
            'SELECT sound_order FROM user_sound_orders WHERE user_id = ? AND category_id = ?',
            [userId, categoryId]
        );

        if (result) {
            try {
                const order = JSON.parse(result.sound_order);
                res.json({ order });
            } catch (e) {
                console.error('Error parsing sound order JSON:', e);
                res.json({ order: [] });
            }
        } else {
            res.json({ order: [] });
        }
    } catch (error) {
        console.error('Error getting sound order:', error);
        res.status(500).send('Failed to get sound order');
    }
}

async function saveSoundOrder(req, res) {
    console.log('saveSoundOrder called with body:', req.body);
    
    try {
        // Validate input
        if (!req.body || typeof req.body !== 'object') {
            console.log('Invalid request body');
            return res.status(400).send('Invalid request body');
        }
        
        const { userId, soundType, order } = req.body;
        
        console.log('Parsed params:', { userId, soundType, order });
        
        // Validate required parameters
        if (!userId || !soundType || !Array.isArray(order)) {
            console.log('Missing or invalid required parameters');
            return res.status(400).send('User ID, sound type (string), and order (array) are required');
        }
        
        // Validate order array contents
        if (order.some(item => typeof item !== 'string')) {
            console.log('Invalid order array - contains non-string items');
            return res.status(400).send('Order array must contain only strings');
        }
        
        const categoryId = config.soundCategories[soundType];
        if (!categoryId) {
            return res.status(400).json({ error: 'Invalid sound category.' });
        }
        
        // Validate that all filenames in order exist in the database
        for (const filename of order) {
            const sound = await db.getSoundByFilename(filename, categoryId);
            if (!sound) {
                console.log(`Sound not found: ${filename}`);
                return res.status(404).send(`Sound not found: ${filename}`);
            }
        }
        
        await db.beginTransaction();

        try {
            const soundOrderJson = JSON.stringify(order);
            
            // Check if record exists
            const existing = await db.queryOne(
                'SELECT id FROM user_sound_orders WHERE user_id = ? AND category_id = ?',
                [userId, categoryId]
            );

            if (existing) {
                // Update existing record
                await db.execute(
                    'UPDATE user_sound_orders SET sound_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [soundOrderJson, existing.id]
                );
            } else {
                // Insert new record
                await db.execute(
                    'INSERT INTO user_sound_orders (user_id, category_id, sound_order) VALUES (?, ?, ?)',
                    [userId, categoryId, soundOrderJson]
                );
            }

            await db.commit();
            console.log('Successfully saved sound order');
            res.send('Sound order saved successfully');
        } catch (error) {
            await db.rollback();
            console.error('Failed to save sound order:', error);
            res.status(500).send(`Failed to save sound order: ${error.message}`);
        }
    } catch (error) {
        console.error('Error in saveSoundOrder:', error);
        res.status(500).send(`Internal server error: ${error.message}`);
    }
}

module.exports = {
    getData,
    updateMainPlaylist,
    updateUserSound,
    savePreset,
    loadPresets,
    getSoundOrder,
    saveSoundOrder,
    addSound,
    deleteSound,
};