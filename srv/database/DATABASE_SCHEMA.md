# ChatLuthier Database Schema

This document describes the SQLite database schema for the ChatLuthier application, which uses separate tables for each sound type as requested.

## Table Structure

### 1. Users Table
**Purpose**: Stores user account information with security questions

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    pseudo TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    secret_question TEXT,
    secret_answer_hash TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: User ID (primary key)
- `pseudo`: Username (unique)
- `password_hash`: Hashed password
- `secret_question`: Security question for password recovery
- `secret_answer_hash`: Hashed answer to security question
- `is_admin`: Administrative privileges flag
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

### 2. Sound Categories Table
**Purpose**: Defines the different sound types/categories

```sql
CREATE TABLE IF NOT EXISTS sound_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);
```

**Fields**:
- `id`: Category ID (primary key)
- `name`: Category name (unique)
- `description`: Category description

**Initial Data**:
```sql
INSERT OR IGNORE INTO sound_categories (id, name, description) VALUES 
    (1, 'ambianceSounds', 'Ambient sounds for background atmosphere'),
    (2, 'backgroundMusic', 'Background music tracks'),
    (3, 'soundboard', 'Sound effects for soundboard');
```

### 3. Ambiance Sounds Table
**Purpose**: Stores ambient sound data

```sql
CREATE TABLE IF NOT EXISTS ambiance_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    display_name TEXT NOT NULL,
    image_file TEXT,
    credit TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(filename)
);
```

**Fields**:
- `id`: Sound ID (primary key)
- `filename`: Audio file name
- `display_name`: User-friendly sound name
- `image_file`: Associated image file
- `credit`: Attribution/credit information
- `is_enabled`: Whether sound is enabled by default
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### 4. Background Sounds Table
**Purpose**: Stores background music data

```sql
CREATE TABLE IF NOT EXISTS background_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    display_name TEXT NOT NULL,
    image_file TEXT,
    credit TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(filename)
);
```

**Fields**: Same as ambiance_sounds

### 5. Soundboard Table
**Purpose**: Stores soundboard sound effects

```sql
CREATE TABLE IF NOT EXISTS soundboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    display_name TEXT NOT NULL,
    credit TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(filename)
);
```

**Fields**: Same as ambiance_sounds (without image_file)

### 6. Context Tables
**Purpose**: Store contextual tags for each sound (one context per line)

#### Ambiance Sound Contexts
```sql
CREATE TABLE IF NOT EXISTS ambiance_sound_contexts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sound_id INTEGER NOT NULL,
    context TEXT NOT NULL,
    context_index INTEGER DEFAULT 0,
    FOREIGN KEY (sound_id) REFERENCES ambiance_sounds(id) ON DELETE CASCADE,
    UNIQUE(sound_id, context, context_index)
);
```

#### Background Sound Contexts
```sql
CREATE TABLE IF NOT EXISTS background_sound_contexts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sound_id INTEGER NOT NULL,
    context TEXT NOT NULL,
    context_index INTEGER DEFAULT 0,
    FOREIGN KEY (sound_id) REFERENCES background_sounds(id) ON DELETE CASCADE,
    UNIQUE(sound_id, context, context_index)
);
```

#### Soundboard Contexts
```sql
CREATE TABLE IF NOT EXISTS soundboard_contexts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sound_id INTEGER NOT NULL,
    context TEXT NOT NULL,
    context_index INTEGER DEFAULT 0,
    FOREIGN KEY (sound_id) REFERENCES soundboard(id) ON DELETE CASCADE,
    UNIQUE(sound_id, context, context_index)
);
```

**Fields** (all context tables):
- `id`: Context ID (primary key)
- `sound_id`: Reference to sound (foreign key)
- `context`: Context tag/text
- `context_index`: Position/index of context

### 7. User Sounds Table
**Purpose**: Stores user-specific sound overrides (one entry per sound)

```sql
CREATE TABLE IF NOT EXISTS user_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    sound_type TEXT NOT NULL, -- 'ambiance', 'background', or 'soundboard'
    sound_id INTEGER NOT NULL,
    is_enabled BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, sound_type, sound_id)
);
```

**Fields**:
- `id`: User sound ID (primary key)
- `user_id`: Reference to user (foreign key)
- `sound_type`: Type of sound ('ambiance', 'background', 'soundboard')
- `sound_id`: Reference to sound ID
- `is_enabled`: User's override for sound enabled state
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### 8. User Sound Contexts Table
**Purpose**: Stores user-specific context overrides (one context per line)

```sql
CREATE TABLE IF NOT EXISTS user_sound_contexts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    sound_type TEXT NOT NULL, -- 'ambiance', 'background', or 'soundboard'
    sound_id INTEGER NOT NULL,
    context TEXT NOT NULL,
    context_index INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, sound_type, sound_id, context, context_index)
);
```

**Fields**:
- `id`: User context ID (primary key)
- `user_id`: Reference to user (foreign key)
- `sound_type`: Type of sound
- `sound_id`: Reference to sound ID
- `context`: User's context tag
- `context_index`: Position/index of context

### 9. User Presets Table
**Purpose**: Stores named sound configurations (one preset per line)

```sql
CREATE TABLE IF NOT EXISTS user_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    preset_name TEXT NOT NULL,
    preset_data TEXT NOT NULL, -- JSON array containing all sound settings for this preset
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, preset_name)
);
```

**Fields**:
- `id`: Preset ID (primary key)
- `user_id`: Reference to user (foreign key)
- `preset_name`: Name of preset
- `preset_data`: JSON data containing all sound settings
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### 10. User Sound Orders Table
**Purpose**: Stores custom sound ordering (one order per line)

```sql
CREATE TABLE IF NOT EXISTS user_sound_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    sound_type TEXT NOT NULL, -- 'ambiance', 'background', or 'soundboard'
    sound_order TEXT NOT NULL, -- JSON array of sound IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, sound_type)
);
```

**Fields**:
- `id`: Order ID (primary key)
- `user_id`: Reference to user (foreign key)
- `sound_type`: Type of sound
- `sound_order`: JSON array of sound IDs in custom order
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## Indexes

The database includes the following indexes for performance optimization:

```sql
CREATE INDEX IF NOT EXISTS idx_ambiance_sounds_filename ON ambiance_sounds(filename);
CREATE INDEX IF NOT EXISTS idx_background_sounds_filename ON background_sounds(filename);
CREATE INDEX IF NOT EXISTS idx_soundboard_filename ON soundboard(filename);
CREATE INDEX IF NOT EXISTS idx_ambiance_sound_contexts ON ambiance_sound_contexts(sound_id);
CREATE INDEX IF NOT EXISTS idx_background_sound_contexts ON background_sound_contexts(sound_id);
CREATE INDEX IF NOT EXISTS idx_soundboard_contexts ON soundboard_contexts(sound_id);
CREATE INDEX IF NOT EXISTS idx_user_sounds_user ON user_sounds(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sound_contexts_user ON user_sound_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presets_user ON user_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sound_orders_user ON user_sound_orders(user_id);
```

## Key Design Principles

1. **Separate Tables for Sound Types**: Each sound type has its own table (ambiance_sounds, background_sounds, soundboard)

2. **One Context Per Line**: Contexts are stored in separate tables with one entry per context

3. **User Data Efficiency**: User-related tables store one entry per line for optimal performance

4. **Foreign Key Constraints**: Proper relationships between tables with CASCADE delete

5. **Unique Constraints**: Prevent duplicate entries where appropriate

6. **Performance Indexes**: Indexes on frequently queried fields

## Data Statistics (After Migration)

- **ambiance_sounds**: 31 sounds
- **background_sounds**: 106 sounds  
- **soundboard**: 23 sounds
- **Context tables**: Multiple entries per sound (one per context)
- **User tables**: Ready for user data (initially empty)

## Migration Process

The `JSONtoSQL.js` script:
1. Creates all tables according to this schema
2. Migrates data from JSON files to the appropriate tables
3. Handles nested context arrays in background music
4. Preserves all sound metadata and relationships

This schema provides a clean separation of sound types while maintaining all functionality and performance requirements.