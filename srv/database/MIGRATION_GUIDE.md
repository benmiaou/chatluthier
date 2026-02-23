# SQLite Migration Guide for ChatLuthier

This guide explains how to migrate from the JSON file-based storage system to the new SQLite database system.

## Overview

The migration involves:
1. **Server Data Migration**: Migrating existing JSON files (`ambianceSounds.json`, `backgroundMusic.json`, `soundboard.json`) to SQLite tables
2. **User Data Preparation**: Creating tables for user data (but not migrating existing user data as requested)
3. **Backend Code Updates**: Replacing file system operations with database operations

## Files Created

### Database Schema
- `srv/database/schema.sql` - SQLite database schema with all tables and indexes

### Migration Script
- `srv/database/JSONtoSQL.js` - Script to migrate JSON data to SQLite

### Database Utilities
- `srv/database/config.js` - Database configuration
- `srv/database/db.js` - Database utility class with promise-based operations
- `srv/database/init.js` - Database initialization script

### Updated Backend Code
- `srv/controllers/soundController.sql.js` - New SQL-based sound controller
- `srv/server.js` - Updated to initialize database on startup
- `package.json` - Added `sqlite3` dependency

## Migration Process

### Step 1: Install Dependencies

```bash
npm install
```

This will install the `sqlite3` package added to your dependencies.

### Step 2: Run the Server Data Migration Script

```bash
node srv/database/JSONtoSQL.js
```

This script will:
1. Create the SQLite database file (`srv/database/chatluthier.db`)
2. Execute the schema to create all tables
3. Migrate server data from JSON files to the database
4. Output progress information

### Step 3: Run the User Data Migration Script (Optional)

If you want to migrate existing user data to SQL (instead of keeping it in JSON files):

```bash
node srv/database/migrateUserData.js
```

This script will:
1. Migrate user-specific sound overrides
2. Migrate user presets
3. Migrate user sound ordering
4. Create user records in the database (without email addresses)

**Note:** This step is optional. If you prefer to keep user data in JSON files, you can skip this step. The SQL controller will automatically fall back to JSON files for user data if no SQL records exist.

### Step 3: Update Your Application

To switch from the file-based system to the SQL-based system:

1. **Update the routes file** (`srv/routes/soundRoutes.js`):
   ```javascript
   // Change this line:
   const { getData, updateMainPlaylist, updateUserSound, savePreset, loadPresets, getSoundOrder, saveSoundOrder, addSound, deleteSound } = require('../controllers/soundController');
   
   // To this:
   const { getData, updateMainPlaylist, updateUserSound, savePreset, loadPresets, getSoundOrder, saveSoundOrder, addSound, deleteSound } = require('../controllers/soundController.sql');
   ```

2. **Test your application** thoroughly to ensure all functionality works with the new database backend.

### Step 4: Database Management

#### Initializing the Database

The database will automatically initialize when you start the server:
```bash
npm run dev
```

#### Manual Initialization

You can also initialize the database manually:
```bash
node srv/database/init.js
```

#### Database File Location

The SQLite database file is located at:
```
srv/database/chatluthier.db
```

You can use SQLite browser tools to inspect and manage the database.

## Database Schema Overview

### Core Tables

- **users**: User information
- **sound_categories**: Sound type categories (ambiance, music, soundboard)
- **server_sounds**: Main repository of all sounds
- **sound_contexts**: Tagging system for sounds

### User Data Tables

- **user_sounds**: User-specific sound overrides
- **user_sound_contexts**: User-specific context overrides
- **user_presets**: Named sound configurations
- **user_preset_sounds**: Individual sound settings within presets
- **user_sound_orders**: Custom sound ordering

## Backward Compatibility

The new SQL-based controller maintains the same API interface as the original file-based controller, so frontend code should continue to work without modifications.

## Performance Considerations

- **Indexes**: The schema includes indexes on frequently queried columns
- **Transactions**: Database operations use transactions for data integrity
- **Connection Pooling**: SQLite handles connection management efficiently

## Troubleshooting

### Common Issues

1. **Database file permissions**: Ensure the application has write permissions to the `srv/database` directory
2. **Missing JSON files**: Verify that the original JSON files exist in `srv/srv_data/`
3. **Dependency issues**: Make sure `sqlite3` is properly installed

### Debugging

Enable verbose logging in `srv/database/config.js`:
```javascript
options: {
    verbose: console.log, // Enable verbose logging
    // ...
}
```

## Rolling Back

If you need to roll back to the file-based system:

1. Revert the changes to `srv/routes/soundRoutes.js`
2. Remove the SQLite dependency from `package.json`
3. Delete the database file if desired

## Future Enhancements

The SQL database foundation enables several future improvements:

- **Advanced querying**: Complex queries across related data
- **Data integrity**: Foreign key constraints and transactions
- **Scalability**: Better performance with large datasets
- **Analytics**: Easy data analysis and reporting
- **Backup/Restore**: Standard database backup tools

## Support

For issues with the migration, please refer to:
- The SQLite documentation: https://www.sqlite.org/docs.html
- The sqlite3 npm package documentation: https://github.com/mapbox/node-sqlite3

This migration prepares your application for future growth while maintaining all existing functionality.