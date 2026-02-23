// Fix background music contexts to preserve pairs
const fs = require('fs');
const db = require('./srv/database/db');

async function fixContextPairs() {
    try {
        await db.initialize();
        
        console.log('Fixing background music context pairs...');
        
        // Read original JSON
        const backgroundMusic = JSON.parse(fs.readFileSync('srv/srv_data/backgroundMusic.json', 'utf8'));
        
        for (const sound of backgroundMusic) {
            if (!sound.contexts || sound.contexts.length === 0) {
                continue;
            }
            
            // Get sound ID from database
            const dbSound = await db.queryOne("SELECT id FROM server_sounds WHERE filename = ? AND category_id = 2", [sound.filename]);
            
            if (!dbSound) {
                console.warn(`Sound not found in DB: ${sound.filename}`);
                continue;
            }
            
            // Clear existing contexts for this sound
            await db.execute('DELETE FROM sound_contexts WHERE sound_id = ?', [dbSound.id]);
            
            // Insert context pairs as they are (nested arrays)
            let contextIndex = 0;
            for (const contextPair of sound.contexts) {
                if (Array.isArray(contextPair) && contextPair.length >= 2) {
                    // Store as "intensity:context" format to preserve the pair
                    const combinedContext = `${contextPair[0]}:${contextPair[1]}`;
                    await db.execute(
                        'INSERT INTO sound_contexts (sound_id, context, context_index) VALUES (?, ?, ?)',
                        [dbSound.id, combinedContext, contextIndex]
                    );
                    contextIndex++;
                }
            }
            
            console.log(`✅ Fixed ${sound.filename}: ${sound.contexts.length} context pairs`);
        }
        
        await db.close();
        console.log('Background music context pairs fixed!');
        
    } catch (error) {
        console.error('Error fixing context pairs:', error);
        await db.close();
    }
}

fixContextPairs();