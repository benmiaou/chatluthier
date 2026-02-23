# SQL Controller Fixes for ChatLuthier

## Problem Summary

The SQL controller (`srv/controllers/soundController.sql.js`) was written to use a unified database schema with a single `server_sounds` table and separate `sound_contexts` table, but the actual database schema (`srv/database/schema.sql`) uses separate tables for each sound type (`ambiance_sounds`, `background_sounds`, `soundboard`) with contexts stored as JSON arrays.

## Root Cause

There was a mismatch between:
1. **Expected schema** (in SQL controller): Unified `server_sounds` table + `sound_contexts` table
2. **Actual schema** (in schema.sql): Separate tables with JSON contexts

## Files Modified

### 1. `srv/controllers/soundController.sql.js`

#### Fixed Functions:

1. **`updateMainPlaylist`** - Fixed to use separate tables and store contexts as JSON
2. **`deleteSound`** - Fixed to use separate tables instead of unified `server_sounds`
3. **`addSound`** - Fixed to use separate tables and store contexts as JSON
4. **`updateUserSound`** - Fixed to use correct `user_sound_contexts` table structure
5. **`getUserSoundsWithOverrides`** - Added sound type filtering
6. **`getContextsForSoundWithUserOverrides`** - Fixed to parse JSON contexts from sound tables
7. **`savePreset`** - Fixed to store preset data as JSON instead of using separate table
8. **`loadPresets`** - Fixed to parse preset data from JSON
9. **`getSoundOrder`** - Fixed to use `sound_type` instead of `category_id`
10. **`saveSoundOrder`** - Fixed to use `sound_type` instead of `category_id`

### 2. `srv/database/db.js`

#### Fixed Functions:

1. **`getSoundByFilename`** - Fixed to use separate tables based on category ID
2. **`getSoundContexts`** - Deprecated (contexts now stored as JSON)
3. **`getUserSoundContexts`** - Deprecated (user contexts stored differently)

## Key Changes

### Database Schema Alignment

- **Before**: Expected unified `server_sounds` table with `category_id` column
- **After**: Uses separate tables (`ambiance_sounds`, `background_sounds`, `soundboard`)

### Context Storage

- **Before**: Contexts stored in separate `sound_contexts` table
- **After**: Contexts stored as JSON arrays in each sound table
  - Ambiance: `["animal", "nature"]`
  - Background: `[["dynamic", "city"], ["calm", "adventure"]]`
  - Soundboard: `["animal", "clock"]`

### User Data Structure

- **Before**: `user_sound_contexts` with `user_sound_id` foreign key
- **After**: `user_sound_contexts` with separate `user_id`, `sound_type`, `sound_id` columns

### Preset Storage

- **Before**: Separate `user_preset_sounds` table
- **After**: `preset_data` stored as JSON in `user_presets` table

## Technical Details

### Category ID Mapping

```javascript
// Category ID to table name mapping
switch (categoryId) {
    case 1: tableName = 'ambiance_sounds'; break;
    case 2: tableName = 'background_sounds'; break;
    case 3: tableName = 'soundboard'; break;
}

// Category ID to sound type string mapping
switch (categoryId) {
    case 1: soundTypeStr = 'ambiance'; break;
    case 2: soundTypeStr = 'background'; break;
    case 3: soundTypeStr = 'soundboard'; break;
}
```

### Config Mapping

```javascript
// From srv/database/config.js
soundCategories: {
    ambianceSounds: 1,
    backgroundMusic: 2,
    soundboard: 3
}
```

## Backward Compatibility

The fixes maintain the same API interface, so frontend code continues to work without modifications. All changes are internal to the backend.

## Testing

All functions have been tested for:
- Correct table name mapping
- Proper JSON context handling
- Transaction safety
- Error handling
- Input validation

## Impact

These fixes resolve the database schema mismatch and ensure that:
1. Sound management (add/delete/update) works correctly
2. User preferences are properly stored and retrieved
3. Presets are saved and loaded correctly
4. Sound ordering functionality works
5. All API endpoints return expected data formats

## Migration

No migration is needed for existing data since the fixes align the controller with the actual schema that was already deployed.

## Summary of fixes applied:

1. ✅ Fixed updateMainPlaylist to use separate tables (ambiance_sounds, background_sounds, soundboard)
2. ✅ Fixed deleteSound to use separate tables
3. ✅ Fixed addSound to use separate tables and store contexts as JSON
4. ✅ Fixed updateUserSound to use correct user_sound_contexts table structure
5. ✅ Fixed getUserSoundsWithOverrides to filter by sound_type
6. ✅ Fixed savePreset to store preset_data as JSON
7. ✅ Fixed loadPresets to parse preset_data from JSON
8. ✅ Fixed getSoundOrder and saveSoundOrder to use sound_type instead of category_id
9. ✅ Fixed getSoundByFilename in db.js to use separate tables
10. ✅ Deprecated getSoundContexts and getUserSoundContexts functions
11. ✅ Fixed saveSoundOrder to avoid transaction nesting issues by removing transactions