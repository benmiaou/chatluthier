# Controller Updates for New Schema

The controller needs to be updated to work with the new database schema where each sound type has its own table and contexts are stored as JSON directly in the sounds table.

## Key Changes Needed

### 1. Update `getData` function
The function needs to query the appropriate table based on the sound type and parse the JSON contexts.

### 2. Update all CRUD operations
- `addSound` - Insert into the correct table
- `deleteSound` - Delete from the correct table  
- `updateMainPlaylist` - Update the correct table

### 3. Update user sound functions
User-specific overrides now go to separate tables per sound type.

## Implementation Plan

### New getData Function
```javascript
async function getData(userId, filename) {
    let table, userTable;
    
    // Determine which tables to use
    switch(filename) {
        case 'ambianceSounds':
            table = 'ambiance_sounds';
            userTable = 'user_ambiance_sounds';
            break;
        case 'backgroundMusic':
            table = 'background_music';
            userTable = 'user_background_music';
            break;
        case 'soundboard':
            table = 'soundboard_sounds';
            userTable = 'user_soundboard_sounds';
            break;
        default:
            throw new Error('Invalid sound type');
    }
    
    // Get server sounds
    const sounds = await db.query(`SELECT * FROM ${table} ORDER BY display_name`);
    
    // Parse JSON contexts
    const soundsWithContexts = sounds.map(sound => ({
        ...sound,
        contexts: JSON.parse(sound.contexts)
    }));
    
    // If no user, return server defaults
    if (!userId) {
        return soundsWithContexts;
    }
    
    // Get user overrides and merge
    // ... user override logic
}
```

### Database Utility Updates
The database utility should have helper methods for the new structure:

```javascript
async function getSoundsByType(type) {
    const tables = {
        ambiance: 'ambiance_sounds',
        background: 'background_music',
        soundboard: 'soundboard_sounds'
    };
    
    const table = tables[type];
    if (!table) throw new Error('Invalid sound type');
    
    const sounds = await this.query(`SELECT * FROM ${table} ORDER BY display_name`);
    return sounds.map(sound => ({
        ...sound,
        contexts: JSON.parse(sound.contexts)
    }));
}
```

## Benefits of New Schema

1. **Clearer Data Organization** - Each sound type in its own table
2. **Simpler Queries** - No joins needed for basic sound data
3. **Better Performance** - Indexes on specific tables
4. **Easier Maintenance** - Schema matches application structure
5. **Flexibility** - Each table can have custom columns if needed

## Migration Steps

1. Create new tables (done in create_new_schema.sql)
2. Migrate existing data (done in migrate_to_new_schema.js)
3. Update controller functions
4. Update routes if needed
5. Test thoroughly
6. Deploy

## Backward Compatibility

The API interface remains the same, so frontend code doesn't need changes. The controller handles the new database structure internally.