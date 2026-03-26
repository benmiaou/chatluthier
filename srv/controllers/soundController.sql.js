const path = require('node:path');
const fs = require('node:fs');
const db = require('../database/db');
const config = require('../database/config');
const { verifyjwt } = require('./authController');
const { processUploadedAudio, ffmpegAvailable } = require('../utils/audioProcessor');

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

  // Map category ID to the correct table
  let tableName;
  switch (categoryId) {
    case 1:
      tableName = 'ambiance_sounds';
      break;
    case 2:
      tableName = 'background_sounds';
      break;
    case 3:
      tableName = 'soundboard';
      break;
    default:
      console.error('Invalid category ID:', categoryId);
      return [];
  }

  // Get all sounds for this category (including disabled) so edit modals can show and re-enable them
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

  // Get user-specific overrides
  return await getUserSoundsWithOverrides(userId, sounds, categoryId);
}

async function addContextsToSounds(sounds) {
  // Contexts are now stored as JSON in the sound table, not in separate table
  return sounds.map((sound) => {
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
      isEnabled: Boolean(sound.is_enabled), // Convert 1/0 to true/false
    };
  });
}

async function getUserSoundsWithOverrides(userId, serverSounds, categoryId) {
  let soundTypeStr;
  switch (categoryId) {
    case 1:
      soundTypeStr = 'ambiance';
      break;
    case 2:
      soundTypeStr = 'background';
      break;
    case 3:
      soundTypeStr = 'soundboard';
      break;
    default:
      return [];
  }

  // Fetch all user overrides for this category in one query
  const overrideRows = await db.query(
    'SELECT sound_id, is_enabled, contexts FROM user_sound_overrides WHERE user_id = ? AND sound_type = ?',
    [userId, soundTypeStr]
  );
  const overrideMap = {};
  for (const row of overrideRows) {
    overrideMap[row.sound_id] = row;
  }

  return serverSounds.map((sound) => {
    const override = overrideMap[sound.id];
    let contexts;
    if (override && override.contexts !== null && override.contexts !== undefined) {
      try {
        contexts = JSON.parse(override.contexts);
      } catch (_) {
        contexts = [];
      }
    } else {
      try {
        contexts = sound.contexts ? JSON.parse(sound.contexts) : [];
      } catch (_) {
        contexts = [];
      }
    }
    return {
      filename: sound.filename,
      display_name: sound.display_name,
      imageFile: sound.image_file,
      contexts,
      credit: sound.credit,
      isEnabled:
        override && override.is_enabled !== null
          ? Boolean(override.is_enabled)
          : Boolean(sound.is_enabled),
    };
  });
}

async function saveSoundOrder(req, res) {
  const { userId, soundType, order } = req.body;

  try {
    // Validate input
    if (!userId || !soundType || !Array.isArray(order)) {
      return res.status(400).json({ error: 'User ID, sound type, and order array are required' });
    }

    // Validate order array contents
    if (order.some((item) => typeof item !== 'string')) {
      return res.status(400).json({ error: 'Order array must contain only strings (filenames)' });
    }

    // Get category ID
    const categoryId = config.soundCategories[soundType];
    if (!categoryId) {
      return res.status(400).json({ error: 'Invalid sound category.' });
    }

    // Convert order array to JSON string
    const soundOrderJSON = JSON.stringify(order);

    // Check if sound order already exists for this user and category
    const existingOrder = await db.queryOne(
      'SELECT id FROM user_sound_orders WHERE user_id = ? AND category_id = ?',
      [userId, categoryId]
    );

    const now = new Date().toISOString();

    if (existingOrder) {
      // Update existing sound order
      await db.execute(
        'UPDATE user_sound_orders SET sound_order = ?, updated_at = ? WHERE id = ?',
        [soundOrderJSON, now, existingOrder.id]
      );
    } else {
      // Insert new sound order
      await db.execute(
        'INSERT INTO user_sound_orders (user_id, category_id, sound_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [userId, categoryId, soundOrderJSON, now, now]
      );
    }

    res.json({ success: true, message: 'Sound order saved successfully' });
  } catch (error) {
    console.error('Error saving sound order:', error);
    res.status(500).json({ error: 'Failed to save sound order' });
  }
}

async function getSoundOrder(req, res) {
  const userId = req.query.userId;
  const soundType = req.query.soundType;

  try {
    // Validate input
    if (!userId || !soundType) {
      return res.status(400).json({ error: 'User ID and sound type are required' });
    }

    // Get category ID
    const categoryId = config.soundCategories[soundType];
    if (!categoryId) {
      return res.status(400).json({ error: 'Invalid sound category.' });
    }

    // Get sound order from database
    const result = await db.queryOne(
      'SELECT sound_order FROM user_sound_orders WHERE user_id = ? AND category_id = ?',
      [userId, categoryId]
    );

    if (result?.sound_order) {
      // Parse the JSON array and return it
      const soundOrder = JSON.parse(result.sound_order);
      res.json({ order: soundOrder });
    } else {
      // No sound order found, return empty array
      res.json({ order: [] });
    }
  } catch (error) {
    console.error('Error getting sound order:', error);
    res.status(500).json({ error: 'Failed to get sound order' });
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
    const isAdmin = payload.isAdmin || false;
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
      case 1:
        tableName = 'ambiance_sounds';
        break;
      case 2:
        tableName = 'background_sounds';
        break;
      case 3:
        tableName = 'soundboard';
        break;
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
    const isAdmin = payload.isAdmin || false;
    if (!isAdmin) {
      return res.status(403).json({ error: 'User is not authorized to edit the main playlist.' });
    }

    const categoryId = config.soundCategories[category];
    if (!categoryId) {
      return res.status(400).json({ error: 'Invalid sound category.' });
    }

    const assetsDir = path.join(__dirname, '../..', 'srv_sound_data');
    let soundFilePath, imageFilePath;

    const sanitizedFileName = file.originalname.replaceAll(' ', '_');
    const sanitizedImageFileName = imageFile ? imageFile.originalname.replaceAll(' ', '_') : null;

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

    // Process and normalize audio file if FFmpeg is available
    let processedFilePath = file.path;
    if (ffmpegAvailable) {
      try {
        const { normalizedPath } = await processUploadedAudio(file);
        processedFilePath = normalizedPath;
      } catch (error) {
        console.error('Audio normalization failed, using original file:', error.message);
        // Continue with original file if normalization fails
      }
    }

    // Move processed audio file
    fs.renameSync(processedFilePath, soundFilePath);

    // Move image file if present
    if (imageFile) {
      fs.renameSync(imageFile.path, imageFilePath);
    }

    // Set success message for uploader
    let uploadMessage = 'Sound uploaded successfully.';
    if (ffmpegAvailable) {
      uploadMessage =
        'Sound uploaded and automatically normalized to -23 LUFS for consistent volume.';
    }

    // Parse contexts as JSON
    let parsedContexts;
    try {
      parsedContexts = JSON.parse(contexts);
    } catch (e) {
      console.error('Error parsing contexts:', e);
      return res.status(400).json({ error: 'Invalid contexts format.', details: e.message });
    }

    // Map category ID to the correct table name
    let tableName;
    switch (categoryId) {
      case 1:
        tableName = 'ambiance_sounds';
        break;
      case 2:
        tableName = 'background_sounds';
        break;
      case 3:
        tableName = 'soundboard';
        break;
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
          true,
        ];
      } else {
        // soundboard table without image_file column
        query = `
                    INSERT INTO ${tableName} 
                    (filename, display_name, credit, contexts, is_enabled) 
                    VALUES (?, ?, ?, ?, ?)
                `;
        params = [sanitizedFileName, display_name, credit || '', contextsJSON, true];
      }

      await db.execute(query, params);

      await db.commit();

      return res.json({
        message: 'Sound added successfully.',
        uploadMessage: uploadMessage,
        normalized: ffmpegAvailable,
      });
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

function getCategoryIdAndTableName(soundsType) {
  const categoryId = config.soundCategories[soundsType];
  if (!categoryId) {
    return { categoryId: null, tableName: null };
  }

  let tableName;
  switch (categoryId) {
    case 1:
      tableName = 'ambiance_sounds';
      break;
    case 2:
      tableName = 'background_sounds';
      break;
    case 3:
      tableName = 'soundboard';
      break;
    default:
      return { categoryId: null, tableName: null };
  }

  return { categoryId, tableName };
}

function buildInsertQuery(tableName, sound) {
  const contexts = sound.contexts || [];
  const contextsJSON = JSON.stringify(contexts);
  const isEnabled = sound.isEnabled === undefined ? true : sound.isEnabled;

  if (tableName === 'ambiance_sounds' || tableName === 'background_sounds') {
    const query = `
      INSERT INTO ${tableName} 
      (filename, display_name, image_file, credit, contexts, is_enabled) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      sound.filename,
      sound.display_name,
      sound.imageFile || null,
      sound.credit || '',
      contextsJSON,
      isEnabled,
    ];
    return { query, params };
  }

  const query = `
    INSERT INTO ${tableName} 
    (filename, display_name, credit, contexts, is_enabled) 
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [sound.filename, sound.display_name, sound.credit || '', contextsJSON, isEnabled];
  return { query, params };
}

async function updateMainPlaylist(req, res) {
  let soundsType, sounds;
  
  // Handle both JSON and FormData requests
  if (req.headers['content-type'] && req.headers['content-type'].startsWith('multipart/form-data')) {
    // FormData request with file uploads
    soundsType = req.body.soundsType;
    sounds = JSON.parse(req.body.sounds);
  } else {
    // JSON request
    ({ soundsType, sounds } = req.body);
  }
  
  const accessToken = req.cookies.accessToken;
  if (!accessToken) {
    return res.status(400).json({ error: 'Missing ID token or updated playlist.' });
  }

  try {
    const payload = await verifyjwt(accessToken);
    const email = payload.email;
    const isAdmin = payload.isAdmin || false;
    if (!isAdmin) {
      return res.status(403).json({ error: 'User is not authorized to edit the main playlist.' });
    }

    const { categoryId, tableName } = getCategoryIdAndTableName(soundsType);
    if (!categoryId || !tableName) {
      return res.status(400).json({ error: 'Invalid sound category.' });
    }

    // Handle image file uploads
    const imageFiles = req.files && req.files['imageFiles'] ? req.files['imageFiles'] : [];
    const imageFileMap = {};
    
    // Get the file mapping from the request
    const fileMapping = req.body.fileMapping ? JSON.parse(req.body.fileMapping) : {};
    
    // Process uploaded image files
    if (imageFiles && imageFiles.length > 0) {
      const assetsDir = path.join(__dirname, '../..', 'srv_sound_data');
      const imageDir = path.join(assetsDir, 'images', 'backgrounds');
      
      // Ensure directory exists
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }
      
      // Process each uploaded image
      for (const file of imageFiles) {
        if (file && file.originalname) {
          const uploadedFilename = file.originalname;
          const sanitizedFileName = uploadedFilename.replaceAll(' ', '_');
          const destinationPath = path.join(imageDir, sanitizedFileName);
          
          // Move file to destination
          fs.renameSync(file.path, destinationPath);
          
          // Use the mapping to find the corresponding sound filename
          const soundFilename = fileMapping[uploadedFilename];
          if (soundFilename) {
            imageFileMap[soundFilename] = sanitizedFileName;
          }
        }
      }
    }

    // Update all sounds for this category in a transaction
    await db.beginTransaction();

    try {
      // First, delete all existing sounds in this category
      await db.execute(`DELETE FROM ${tableName}`);

      // Insert updated sounds
      for (const sound of sounds) {
        let finalImageFile = sound.imageFile || sound.image_file || null;
        
        // Check if this sound has a newly uploaded image
        if (imageFileMap[sound.filename]) {
          finalImageFile = imageFileMap[sound.filename];
        }
        
        // Create sound object with potentially updated image file
        const soundWithImage = {
          ...sound,
          imageFile: finalImageFile
        };
        
        const { query, params } = buildInsertQuery(tableName, soundWithImage);
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
    if (!categoryId) return res.status(400).json({ error: 'Invalid sound category.' });

    const sound = await db.getSoundByFilename(filename, categoryId);
    if (!sound) return res.status(404).json({ error: 'Sound not found.' });

    let soundTypeStr;
    switch (categoryId) {
      case 1:
        soundTypeStr = 'ambiance';
        break;
      case 2:
        soundTypeStr = 'background';
        break;
      case 3:
        soundTypeStr = 'soundboard';
        break;
      default:
        return res.status(400).json({ error: 'Invalid category ID.' });
    }

    let parsedContexts = null;
    try {
      if (contexts !== undefined && contexts !== null) {
        parsedContexts = typeof contexts === 'string' ? JSON.parse(contexts) : contexts;
      }
    } catch (e) {
      return res.status(400).json({ error: 'Invalid contexts format.' });
    }

    // Determine if this override matches defaults — if so, prune it
    const serverIsEnabled = Boolean(sound.is_enabled);
    let serverContexts = [];
    try {
      if (sound.contexts) serverContexts = JSON.parse(sound.contexts);
    } catch (_) {}

    const isEnabledMatchesDefault =
      isEnabled === undefined || Boolean(isEnabled) === serverIsEnabled;
    const contextsMatchDefault =
      parsedContexts === null || JSON.stringify(parsedContexts) === JSON.stringify(serverContexts);

    await db.beginTransaction();
    try {
      if (isEnabledMatchesDefault && contextsMatchDefault) {
        // No real override — remove any existing row
        await db.execute(
          'DELETE FROM user_sound_overrides WHERE user_id = ? AND sound_type = ? AND sound_id = ?',
          [userId, soundTypeStr, sound.id]
        );
      } else {
        const contextsJson = parsedContexts !== null ? JSON.stringify(parsedContexts) : null;
        const enabledVal = isEnabled !== undefined ? (Boolean(isEnabled) ? 1 : 0) : null;
        await db.execute(
          `INSERT INTO user_sound_overrides (user_id, sound_type, sound_id, is_enabled, contexts)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id, sound_type, sound_id) DO UPDATE SET
             is_enabled = excluded.is_enabled,
             contexts = excluded.contexts,
             updated_at = CURRENT_TIMESTAMP`,
          [userId, soundTypeStr, sound.id, enabledVal, contextsJson]
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

async function getSoundOrderV2(req, res) {
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
      case 1:
        soundTypeStr = 'ambiance';
        break;
      case 2:
        soundTypeStr = 'background';
        break;
      case 3:
        soundTypeStr = 'soundboard';
        break;
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

async function saveSoundOrderV2(req, res) {
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
    if (order.some((item) => typeof item !== 'string')) {
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
    // SQLite doesn't support nested transactions, and this is a simple operation
    try {
      const soundOrderJson = JSON.stringify(order);

      // Map category ID to sound type string
      let soundTypeStr;
      switch (categoryId) {
        case 1:
          soundTypeStr = 'ambiance';
          break;
        case 2:
          soundTypeStr = 'background';
          break;
        case 3:
          soundTypeStr = 'soundboard';
          break;
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

async function getAllContexts(req, res) {
  try {
    const { category } = req.query;
    console.log('getAllContexts called with category:', category);
    const serverContexts = new Set();

    // Determine which table to query based on category parameter
    let tableName;
    switch (category) {
      case 'ambiance':
        tableName = 'ambiance_sounds';
        break;
      case 'background':
        tableName = 'background_sounds';
        break;
      case 'soundboard':
        tableName = 'soundboard';
        break;
      default:
        // If no category specified, query all tables (backward compatibility)
        const tables = ['ambiance_sounds', 'background_sounds', 'soundboard'];
        for (const table of tables) {
          const sql = `SELECT contexts FROM ${table} WHERE contexts IS NOT NULL AND contexts != '[]'`;
          console.log(`Querying ${table}:`, sql);
          const results = await db.query(sql);
          console.log(`Found ${results.length} results in ${table}`);

          for (const row of results) {
            try {
              if (row.contexts) {
                const contexts = JSON.parse(row.contexts);
                if (Array.isArray(contexts)) {
                  // Handle both flat arrays and tuple arrays for background music
                  contexts.forEach((context) => {
                    if (typeof context === 'string') {
                      serverContexts.add(context);
                    } else if (Array.isArray(context) && context.length > 1) {
                      // For background music tuple contexts, add the scene (second element)
                      serverContexts.add(context[1]);
                    }
                  });
                }
              }
            } catch (e) {
              console.error(`Error parsing contexts for ${table}:`, e.message);
            }
          }
        }
        break;
    }

    // If specific category was requested, query only that table
    if (tableName) {
      const sql = `SELECT contexts FROM ${tableName} WHERE contexts IS NOT NULL AND contexts != '[]'`;
      console.log(`Querying specific table ${tableName}:`, sql);
      const results = await db.query(sql);
      console.log(`Found ${results.length} results in ${tableName} for category ${category}`);

      for (const row of results) {
        try {
          if (row.contexts) {
            const contexts = JSON.parse(row.contexts);
            if (Array.isArray(contexts)) {
              // Handle both flat arrays and tuple arrays for background music
              contexts.forEach((context) => {
                if (typeof context === 'string') {
                  serverContexts.add(context);
                } else if (Array.isArray(context) && context.length > 1) {
                  // For background music tuple contexts, add the scene (second element)
                  serverContexts.add(context[1]);
                }
              });
            }
          }
        } catch (e) {
          console.error(`Error parsing contexts for ${tableName}:`, e.message);
        }
      }
    }

    console.log('Server contexts collected:', Array.from(serverContexts));

    // Get user context overrides from the new user_sound_overrides table
    let userContextsQuery =
      'SELECT contexts, sound_type FROM user_sound_overrides WHERE contexts IS NOT NULL';
    const params = [];
    if (category) {
      userContextsQuery += ' AND sound_type = ?';
      params.push(category);
    }
    const userOverrideRows = await db.query(userContextsQuery, params);
    const userContextsSet = new Set();
    for (const row of userOverrideRows) {
      try {
        const parsed = JSON.parse(row.contexts);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            // Background: [intensity, context] tuple → extract context string
            if (Array.isArray(item) && item.length >= 2) {
              if (item[1]) userContextsSet.add(item[1]);
            } else if (typeof item === 'string' && item) {
              userContextsSet.add(item);
            }
          }
        }
      } catch (_) {}
    }
    const userContextsArray = Array.from(userContextsSet).sort();
    const serverContextsArray = Array.from(serverContexts).sort();

    console.log('Final response:', {
      serverContexts: serverContextsArray,
      userContexts: userContextsArray,
    });

    res.json({
      serverContexts: serverContextsArray,
      userContexts: userContextsArray,
    });
  } catch (error) {
    console.error('Error getting all contexts:', error);
    res.status(500).json({ error: 'Failed to get contexts' });
  }
}

module.exports = {
  getData,
  updateMainPlaylist,
  updateUserSound,
  savePreset,
  loadPresets,
  getSoundOrderV2,
  saveSoundOrderV2,
  addSound,
  deleteSound,
  updateUserSoundsBatch,
  getAllContexts,
};

async function updateUserSoundsBatch(req, res) {
  const { userId, soundsType, changes } = req.body;

  if (!userId || !soundsType || !Array.isArray(changes) || changes.length === 0) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  let soundTypeStr;
  switch (soundsType) {
    case 'backgroundMusic':
      soundTypeStr = 'background';
      break;
    case 'ambianceSounds':
      soundTypeStr = 'ambiance';
      break;
    case 'soundboard':
      soundTypeStr = 'soundboard';
      break;
    default:
      return res.status(400).json({ error: 'Invalid sounds type' });
  }

  const categoryId = config.soundCategories[soundsType];
  if (!categoryId) return res.status(400).json({ error: 'Invalid sound category.' });

  try {
    await db.beginTransaction();

    for (const change of changes) {
      const { filename, isEnabled, contexts } = change;

      const sound = await db.getSoundByFilename(filename, categoryId);
      if (!sound) {
        console.warn(`Sound not found: ${filename}, skipping`);
        continue;
      }

      // Resolve server defaults for pruning comparison
      const serverIsEnabled = Boolean(sound.is_enabled);
      let serverContexts = [];
      try {
        if (sound.contexts) serverContexts = JSON.parse(sound.contexts);
      } catch (_) {}

      const effectiveEnabled = isEnabled !== undefined ? Boolean(isEnabled) : serverIsEnabled;
      const effectiveContexts = contexts !== undefined ? contexts : null;

      const isEnabledDefault = effectiveEnabled === serverIsEnabled;
      const contextsDefault =
        effectiveContexts === null ||
        JSON.stringify(effectiveContexts) === JSON.stringify(serverContexts);

      if (isEnabledDefault && contextsDefault) {
        // Override matches defaults — remove any stored row
        await db.execute(
          'DELETE FROM user_sound_overrides WHERE user_id = ? AND sound_type = ? AND sound_id = ?',
          [userId, soundTypeStr, sound.id]
        );
      } else {
        const contextsJson = effectiveContexts !== null ? JSON.stringify(effectiveContexts) : null;
        const enabledVal = !isEnabledDefault ? (effectiveEnabled ? 1 : 0) : null;
        await db.execute(
          `INSERT INTO user_sound_overrides (user_id, sound_type, sound_id, is_enabled, contexts)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id, sound_type, sound_id) DO UPDATE SET
             is_enabled = excluded.is_enabled,
             contexts = excluded.contexts,
             updated_at = CURRENT_TIMESTAMP`,
          [userId, soundTypeStr, sound.id, enabledVal, contextsJson]
        );
      }
    }

    await db.commit();
    res.json({ success: true, message: 'Sounds updated successfully' });
  } catch (error) {
    await db.rollback();
    console.error('Error in updateUserSoundsBatch:', error);
    res.status(500).json({ error: 'Failed to update sounds', details: error.message });
  }
}
