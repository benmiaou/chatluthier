# Database Migration Documentation

## Final Database Schema

This directory contains the final database migration scripts for the ChatLuthier application.

## Files

### `JSONtoSQL.js`
**Main Migration Script** - Migrates from original JSON files to the unified SQLite database structure.

**Features:**
- Creates optimized database schema with unified sound storage
- Separates sounds and contexts into normalized tables
- Supports multiple contexts per sound with proper indexing
- Preserves all original data from JSON files
- Can be run anytime to reset/rebuild database from JSON source

**Usage:**
```bash
node srv/database/JSONtoSQL.js
```

### `cleanup_old_tables.js`
**Database Cleanup Script** - Removes legacy tables from earlier migration attempts.

**Features:**
- Identifies and removes old table structures
- Safely drops tables that are no longer needed
- Preserves all data in the new unified schema

**Usage:**
```bash
node srv/database/cleanup_old_tables.js
```

### Database Schema Design

**Core Tables:**
- `sound_categories` - Defines sound types (ambiance, background, soundboard)
- `server_sounds` - Main repository of all sounds (unified storage)
- `sound_contexts` - Context tagging for sounds (normalized)

**User Tables:**
- `users` - User information (no emails stored, uses pseudo)
- `user_sounds` - User-specific sound overrides
- `user_sound_contexts` - User-specific context overrides
- `user_presets` - User sound presets
- `user_preset_sounds` - Individual sounds in presets
- `user_sound_orders` - Custom sound ordering

### Key Design Decisions

1. **Unified Sound Storage**
   - All sounds in one table with category_id for type differentiation
   - Simpler queries with proper indexing
   - Easier to manage and extend

2. **Normalized Context Storage**
   - Contexts in separate table with foreign keys
   - Proper indexing for performance
   - Flexible context structures

3. **User-Specific Tables**
   - Clean separation of server vs user data
   - Easy to query user overrides
   - Simple foreign key relationships

## Migration Process

1. **Schema Creation** - Creates all tables with proper constraints and foreign keys
2. **Data Migration** - Imports data from JSON files to normalized SQLite structure
3. **Context Normalization** - Converts nested context arrays to normalized format
4. **Validation** - Ensures data integrity and proper relationships

## Benefits

- **Performance**: Optimized queries with proper indexing
- **Normalization**: Reduced data redundancy
- **Flexibility**: Easy to extend with new sound types or properties
- **Maintainability**: Clear separation of concerns
- **Reliability**: Can be run anytime to reset from JSON source

## Testing

After migration, verify:

```bash
# Test ambiance sounds
curl http://localhost:3000/api/sounds/ambianceSounds

# Test background music  
curl http://localhost:3000/api/sounds/backgroundMusic

# Test soundboard
curl http://localhost:3000/api/sounds/soundboard
```

## Backup & Recovery

To backup the database:
```bash
cp srv/database/chatluthier.db srv/database/chatluthier_backup.db
```

To restore from JSON (rebuild database):
```bash
node srv/database/JSON_to_Final_DB.js
```

## Notes

- The script uses `INSERT OR IGNORE` to avoid duplicates
- Original JSON files are preserved as the source of truth
- No email addresses are stored (as requested)
- All context formats are supported (flat arrays and nested pairs)
- Legacy tables can be removed using `cleanup_old_tables.js`
- The unified schema provides better performance and maintainability