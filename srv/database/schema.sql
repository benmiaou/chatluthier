-- SQLite Database Schema for ChatLuthier
-- This schema is designed to replace the current JSON file-based storage

-- Users table - stores minimal user information (no email as requested)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    pseudo TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sound categories table - defines the different sound types
CREATE TABLE IF NOT EXISTS sound_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- Server sounds table - main repository of all sounds
CREATE TABLE IF NOT EXISTS server_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    display_name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    image_file TEXT,
    credit TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES sound_categories(id),
    UNIQUE(filename, category_id)
);

-- Sound contexts table - for tagging sounds with contexts
CREATE TABLE IF NOT EXISTS sound_contexts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sound_id INTEGER NOT NULL,
    context TEXT NOT NULL,
    context_index INTEGER DEFAULT 0,
    FOREIGN KEY (sound_id) REFERENCES server_sounds(id) ON DELETE CASCADE,
    UNIQUE(sound_id, context, context_index)
);

-- User sounds table - user-specific sound overrides
CREATE TABLE IF NOT EXISTS user_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    sound_id INTEGER NOT NULL,
    is_enabled BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (sound_id) REFERENCES server_sounds(id),
    UNIQUE(user_id, sound_id)
);

-- User sound contexts table - user-specific context overrides
CREATE TABLE IF NOT EXISTS user_sound_contexts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_sound_id INTEGER NOT NULL,
    context TEXT NOT NULL,
    context_index INTEGER DEFAULT 0,
    FOREIGN KEY (user_sound_id) REFERENCES user_sounds(id) ON DELETE CASCADE,
    UNIQUE(user_sound_id, context, context_index)
);

-- User presets table - stores named sound configurations
CREATE TABLE IF NOT EXISTS user_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    preset_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, preset_name)
);

-- User preset sounds table - individual sound settings within presets
CREATE TABLE IF NOT EXISTS user_preset_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    preset_id INTEGER NOT NULL,
    sound_id INTEGER NOT NULL,
    volume_level REAL DEFAULT 0,
    FOREIGN KEY (preset_id) REFERENCES user_presets(id) ON DELETE CASCADE,
    FOREIGN KEY (sound_id) REFERENCES server_sounds(id),
    UNIQUE(preset_id, sound_id)
);

-- User sound orders table - stores custom sound ordering
CREATE TABLE IF NOT EXISTS user_sound_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    sound_order TEXT NOT NULL, -- JSON array of sound IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES sound_categories(id),
    UNIQUE(user_id, category_id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_server_sounds_category ON server_sounds(category_id);
CREATE INDEX IF NOT EXISTS idx_server_sounds_filename ON server_sounds(filename);
CREATE INDEX IF NOT EXISTS idx_user_sounds_user ON user_sounds(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sounds_sound ON user_sounds(sound_id);
CREATE INDEX IF NOT EXISTS idx_sound_contexts_sound ON sound_contexts(sound_id);
CREATE INDEX IF NOT EXISTS idx_user_presets_user ON user_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preset_sounds_preset ON user_preset_sounds(preset_id);
CREATE INDEX IF NOT EXISTS idx_user_sound_orders_user ON user_sound_orders(user_id);

-- Insert initial sound categories
INSERT OR IGNORE INTO sound_categories (id, name, description) VALUES 
    (1, 'ambianceSounds', 'Ambient sounds for background atmosphere'),
    (2, 'backgroundMusic', 'Background music tracks'),
    (3, 'soundboard', 'Sound effects for soundboard');

-- Note: Old tables (ambiance_sounds, background_music, soundboard_sounds, etc.) 
-- have been removed as part of the migration to the unified schema.
-- Use the cleanup_old_tables.js script if these legacy tables still exist.