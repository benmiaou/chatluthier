const path = require('path');
const db = require('../database/db');
const config = require('../database/config');
const { verifyjwt } = require('./authController');
const { isAdminUser } = require('../utils/tokenUtils');

/**
 * SQL-based Sound Controller for ChatLuthier - UPDATED VERSION
 * 
 * This controller uses the new unified user_sounds table with JSON storage.
 * It maintains backward compatibility with the old schema during transition.
 */

async function getData(userId, filename) {
    const categoryId = config.soundCategories[filename];
    if (!categoryId) {
        console.error('Invalid sound category:', filename);
        return [];
    }

    // Map category ID to the correct table
    let tableName;
    switch (categoryId) {
        case 1: tableName = 'ambiance_sounds'; break;
        case 2: tableName = 'background_sounds'; break;
        case 3: tableName = 'soundboard'; break;
        default:
            console.error('Invalid category ID:', categoryId);
            return [];
    }

    // Get all sounds for this category from the correct table
    const sql = `
        SELECT * 
        FROM ${tableName} 
        ORDER BY display_name
    `;

    const sounds = await db.query(sql);

    // If no userId, return server defaults
    if (!userId) {
        return await addContextsToSounds(sounds);
    }

    // Get user-specific overrides (NEW FORMAT)
    return await getUserSoundsWithOverrides(userId, sounds, categoryId);
}

async function addContextsToSounds(sounds) {
    // Contexts are now stored as JSON in the sound table, not in separate table
    return sounds.map(sound => {
        let contexts = [];
        
        try {
            // Parse the JSON contexts from the database
            if (sound.contexts) {
                contexts = JSON.parse(sound.contexts);
            }
        } catch (e) {
            console.error(`Error parsing contexts for ${sound.filename}:`, e.message);
        }
        
        return {
            filename: sound.filename,
            display_name: sound.display_name,
            imageFile: sound.image_file, // Convert image_file to imageFile
            contexts,
            credit: sound.credit,
            isEnabled: Boolean(sound.is_enabled) // Convert 1/0 to true/false
        };
    });
}

async function getUserSoundsWithOverrides(userId, serverSounds, categoryId) {
    // Map category ID to sound type string
    let soundTypeStr;
    switch (categoryId) {
        case 1: soundTypeStr = 'ambiance'; break;
        case 2: soundTypeStr = 'background'; break;
        case 3: soundTypeStr = 'soundboard'; break;
        default:
            console.error('Invalid category ID:', categoryId);
            return [];
    }

    // Use new JSON format only (remove old format fallback)
    try {
        const userOverridesJSON = await db.getUserSoundOverrides(userId);
        if (userOverridesJSON) {
            const userOverrides = JSON.parse(userOverridesJSON);
            
            // Merge server sounds with user overrides (NEW FORMAT ONLY)
            return serverSounds.map((sound) => {
                const soundKey = `${soundTypeStr}_${sound.id}`;
                const userOverride = userOverrides[soundKey];
                
                // Determine contexts to use
                let contexts = [];
                if (userOverride && userOverride.contexts) {
                    try {
                        contexts = userOverride.contexts;
                    } catch (e) {
                        console.error(`Error parsing user contexts for ${soundKey}:`, e.message);
                        try {
                            if (sound.contexts) contexts = JSON.parse(sound.contexts);
                        } catch (e2) {
                            console.error(`Error parsing server contexts for ${sound.filename}:`, e2.message);
                        }
                    }
                } else {
                    try {
                        if (sound.contexts) contexts = JSON.parse(sound.contexts);
                    } catch (e) {
                        console.error(`Error parsing server contexts for ${sound.filename}:`, e.message);
                    }
                }

                // Determine credit to use
                let credit = sound.credit;
                if (userOverride && userOverride.credit) {
                    credit = userOverride.credit;
                }

                // Determine enabled state
                const isEnabled = userOverride && userOverride.isEnabled !== undefined 
                    ? userOverride.isEnabled 
                    : sound.is_enabled;

                return {
                    filename: sound.filename,
                    display_name: sound.display_name,
                    imageFile: sound.image_file,
                    contexts,
                    credit: credit,
                    isEnabled: Boolean(isEnabled)
                };
            });
        }
    } catch (error) {
        console.error('Error in getUserSoundsWithOverrides:', error.message);
        // If error, return server defaults
        return serverSounds.map((sound) => ({
            filename: sound.filename,
            display_name: sound.display_name,
            imageFile: sound.image_file,
            contexts: sound.contexts ? JSON.parse(sound.contexts) : [],
            credit: sound.credit,
            isEnabled: Boolean(sound.is_enabled)
        }));
    }
}

async function updateUserSound(req, res) {
    const { userId, soundsType, filename, isEnabled, contexts, credit } = req.body;

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

        // Parse contexts if provided
        let contextsJSON = null;
        try {
            if (contexts) {
                const parsedContexts = Array.isArray(contexts) ? contexts : JSON.parse(contexts);
                contextsJSON = JSON.stringify(parsedContexts);
            }
        } catch (e) {
            return res.status(400).json({ error: 'Invalid contexts format.' });
        }

        // Map category ID to sound type string
        let soundTypeStr;
        switch (categoryId) {
            case 1: soundTypeStr = 'ambiance'; break;
            case 2: soundTypeStr = 'background'; break;
            case 3: soundTypeStr = 'soundboard'; break;
            default:
                return res.status(400).json({ error: 'Invalid category ID.' });
        }

        // Use new JSON format only (remove old format fallback)
        try {
            // Get existing user entry or create new one
            let userOverridesJSON = await db.getUserSoundOverrides(userId);
            let userOverrides = userOverridesJSON ? JSON.parse(userOverridesJSON) : {};
            
            // Create sound key
            const soundKey = `${soundTypeStr}_${sound.id}`;
            
            // Build the override object
            const soundOverride = {};
            if (isEnabled !== undefined) {
                soundOverride.isEnabled = isEnabled;
            }
            if (contextsJSON !== null) {
                soundOverride.contexts = JSON.parse(contextsJSON);
            }
            if (credit !== undefined) {
                soundOverride.credit = credit;
            }
            
            // Only store if there are actual overrides
            if (Object.keys(soundOverride).length > 0) {
                userOverrides[soundKey] = soundOverride;
            } else {
                // Remove the entry if no overrides
                delete userOverrides[soundKey];
            }
            
            // Update or insert the user's sound overrides
            const soundOverridesJSON = JSON.stringify(userOverrides, null, 2);
            
            if (Object.keys(userOverrides).length > 0) {
                // Check if user entry exists
                const existing = await db.queryOne(
                    'SELECT id FROM user_sounds WHERE user_id = ?',
                    [userId]
                );
                
                if (existing) {
                    await db.execute(
                        'UPDATE user_sounds SET sound_overrides = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [soundOverridesJSON, existing.id]
                    );
                } else {
                    await db.execute(
                        'INSERT INTO user_sounds (user_id, sound_overrides) VALUES (?, ?)',
                        [userId, soundOverridesJSON]
                    );
                }
            } else {
                // No overrides left, remove the entry
                await db.execute('DELETE FROM user_sounds WHERE user_id = ?', [userId]);
            }
            
            res.send('Data updated successfully');
            return;
            
        } catch (error) {
            console.error('Error in updateUserSound:', error);
            res.status(500).send('Internal server error');
        }
    } catch (error) {
        console.error('Error in updateUserSound outer block:', error);
        res.status(500).send('Internal server error');
    }
}

// ADDING MISSING FUNCTIONS FOR COMPATIBILITY

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

        // Map category ID to the correct table name
        let tableName;
        switch (categoryId) {
            case 1: tableName = 'ambiance_sounds'; break;
            case 2: tableName = 'background_sounds'; break;
            case 3: tableName = 'soundboard'; break;
            default:
                return res.status(400).json({ error: 'Invalid category ID.' });
        }

        // Update all sounds for this category in a transaction
        await db.beginTransaction();

        try {
            // First, delete all existing sounds in this category
            await db.execute(`DELETE FROM ${tableName}`);

            // Insert updated sounds
            for (const sound of sounds) {
                // Contexts are stored as JSON, preserve their structure
                const contexts = sound.contexts || [];
                const contextsJSON = JSON.stringify(contexts);

                // Build the appropriate query based on table structure
                let query, params;
                if (tableName === 'ambiance_sounds' || tableName === 'background_sounds') {
                    // Tables with image_file column
                    query = `
                        INSERT INTO ${tableName} 
                        (filename, display_name, image_file, credit, contexts, is_enabled) 
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    params = [
                        sound.filename,
                        sound.display_name,
                        sound.imageFile || null,
                        sound.credit || '',
                        contextsJSON,
                        sound.isEnabled !== undefined ? sound.isEnabled : true
                    ];
                } else {
                    // soundboard table without image_file column
                    query = `
                        INSERT INTO ${tableName} 
                        (filename, display_name, credit, contexts, is_enabled) 
                        VALUES (?, ?, ?, ?, ?)
                    `;
                    params = [
                        sound.filename,
                        sound.display_name,
                        sound.credit || '',
                        contextsJSON,
                        sound.isEnabled !== undefined ? sound.isEnabled : true
                    ];
                }

                await db.execute(query, params);
            }

            await db.commit();

            return res.json({ message: 'Main playlist updated successfully.' });
        } catch (error) {
            await db.rollback();
            console.error('Error updating main playlist:', error);
            return res.status(500).json({ error: 'Failed to update main playlist.' });
        }
    } catch (error) {
        console.error('Error in updateMainPlaylist outer block:', error);
        return res.status(500).json({ error: 'Failed to update main playlist.' });
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
            // Convert preset data to JSON
            const presetDataJSON = JSON.stringify(presetData);

            // Check if preset exists
            const existingPreset = await db.queryOne(
                'SELECT id FROM user_presets WHERE user_id = ? AND preset_name = ?',
                [userId, presetName]
            );

            if (existingPreset) {
                // Update existing preset
                await db.execute(
                    'UPDATE user_presets SET preset_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [presetDataJSON, existingPreset.id]
                );
            } else {
                // Insert new preset
                await db.execute(
                    'INSERT INTO user_presets (user_id, preset_name, preset_data) VALUES (?, ?, ?)',
                    [userId, presetName, presetDataJSON]
                );
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
            'SELECT preset_name, preset_data FROM user_presets WHERE user_id = ?',
            [userId]
        );

        const result = {};

        // Parse preset data for each preset
        for (const preset of presets) {
            try {
                const presetData = JSON.parse(preset.preset_data);
                result[preset.preset_name] = presetData;
            } catch (e) {
                console.error(`Error parsing preset data for ${preset.preset_name}:`, e.message);
                result[preset.preset_name] = {};
            }
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
        
        // Map category ID to sound type string
        let soundTypeStr;
        switch (categoryId) {
            case 1: soundTypeStr = 'ambiance'; break;
            case 2: soundTypeStr = 'background'; break;
            case 3: soundTypeStr = 'soundboard'; break;
            default:
                return res.status(400).json({ error: 'Invalid category ID.' });
        }
        
        // Get sound order from database
        const result = await db.queryOne(
            'SELECT sound_order FROM user_sound_orders WHERE user_id = ? AND sound_type = ?',
            [userId, soundTypeStr]
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
        
        // Don't use transactions for sound order saves to avoid nesting issues
        try {
            const soundOrderJson = JSON.stringify(order);
            
            // Map category ID to sound type string
            let soundTypeStr;
            switch (categoryId) {
                case 1: soundTypeStr = 'ambiance'; break;
                case 2: soundTypeStr = 'background'; break;
                case 3: soundTypeStr = 'soundboard'; break;
                default:
                    return res.status(400).json({ error: 'Invalid category ID.' });
            }
            
            // Check if record exists
            const existing = await db.queryOne(
                'SELECT id FROM user_sound_orders WHERE user_id = ? AND sound_type = ?',
                [userId, soundTypeStr]
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
                    'INSERT INTO user_sound_orders (user_id, sound_type, sound_order) VALUES (?, ?, ?)',
                    [userId, soundTypeStr, soundOrderJson]
                );
            }
            
            console.log('Successfully saved sound order');
            res.send('Sound order saved successfully');
        } catch (error) {
            console.error('Failed to save sound order:', error);
            res.status(500).send(`Failed to save sound order: ${error.message}`);
        }
    } catch (error) {
        console.error('Error in saveSoundOrder:', error);
        res.status(500).send(`Internal server error: ${error.message}`);
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

        // Map category ID to the correct table name
        let tableName;
        switch (categoryId) {
            case 1: tableName = 'ambiance_sounds'; break;
            case 2: tableName = 'background_sounds'; break;
            case 3: tableName = 'soundboard'; break;
            default:
                return res.status(400).json({ error: 'Invalid category ID.' });
        }

        // Insert the sound in a transaction
        await db.beginTransaction();

        try {
            // Contexts are stored as JSON, preserve their structure
            const contextsJSON = JSON.stringify(parsedContexts);

            // Build the appropriate query based on table structure
            let query, params;
            if (tableName === 'ambiance_sounds' || tableName === 'background_sounds') {
                // Tables with image_file column
                query = `
                    INSERT INTO ${tableName} 
                    (filename, display_name, image_file, credit, contexts, is_enabled) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                params = [
                    sanitizedFileName,
                    display_name,
                    sanitizedImageFileName || null,
                    credit || '',
                    contextsJSON,
                    true
                ];
            } else {
                // soundboard table without image_file column
                query = `
                    INSERT INTO ${tableName} 
                    (filename, display_name, credit, contexts, is_enabled) 
                    VALUES (?, ?, ?, ?, ?)
                `;
                params = [
                    sanitizedFileName,
                    display_name,
                    credit || '',
                    contextsJSON,
                    true
                ];
            }

            await db.execute(query, params);

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

        // Map category ID to the correct table name
        let tableName;
        switch (categoryId) {
            case 1: tableName = 'ambiance_sounds'; break;
            case 2: tableName = 'background_sounds'; break;
            case 3: tableName = 'soundboard'; break;
            default:
                return res.status(400).json({ error: 'Invalid category ID.' });
        }

        // Delete the sound directly from the appropriate table
        await db.beginTransaction();

        try {
            // Delete the sound from the specific table
            const result = await db.execute(`DELETE FROM ${tableName} WHERE filename = ?`, [filename]);

            if (result.changes === 0) {
                await db.rollback();
                return res.status(404).json({ error: 'Sound not found.' });
            }

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

// Export all functions
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