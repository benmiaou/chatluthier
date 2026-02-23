-- New Database Schema with Separate Tables for Each Sound Type
-- This replaces the single server_sounds table with specialized tables

-- Ambiance Sounds Table
CREATE TABLE IF NOT EXISTS ambiance_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    image_file TEXT,
    contexts TEXT, -- JSON array of contexts
    credit TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Background Music Table
CREATE TABLE IF NOT EXISTS background_music (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    contexts TEXT, -- JSON array of context pairs
    credit TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Soundboard Sounds Table
CREATE TABLE IF NOT EXISTS soundboard_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    contexts TEXT, -- JSON array of contexts
    credit TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT TIMESTAMP
);

-- User Sounds Tables (keeping separate for flexibility)
CREATE TABLE IF NOT EXISTS user_ambiance_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    sound_id INTEGER NOT NULL,
    is_enabled BOOLEAN,
    contexts TEXT, -- User-specific contexts override
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (sound_id) REFERENCES ambiance_sounds(id),
    UNIQUE(user_id, sound_id)
);

CREATE TABLE IF NOT EXISTS user_background_music (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    sound_id INTEGER NOT NULL,
    is_enabled BOOLEAN,
    contexts TEXT, -- User-specific contexts override
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (sound_id) REFERENCES background_music(id),
    UNIQUE(user_id, sound_id)
);

CREATE TABLE IF NOT EXISTS user_soundboard_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    sound_id INTEGER NOT NULL,
    is_enabled BOOLEAN,
    contexts TEXT, -- User-specific contexts override
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (sound_id) REFERENCES soundboard_sounds(id),
    UNIQUE(user_id, sound_id)
);

-- User Presets (unchanged)
CREATE TABLE IF NOT EXISTS user_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    preset_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, preset_name)
);

CREATE TABLE IF NOT EXISTS user_preset_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    preset_id INTEGER NOT NULL,
    sound_id INTEGER NOT NULL,
    volume_level REAL DEFAULT 0,
    FOREIGN KEY (preset_id) REFERENCES user_presets(id) ON DELETE CASCADE,
    FOREIGN KEY (sound_id) REFERENCES ambiance_sounds(id) ON DELETE CASCADE,
    UNIQUE(preset_id, sound_id)
);

-- User Sound Orders (unchanged)
CREATE TABLE IF NOT EXISTS user_sound_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    sound_type TEXT NOT NULL, -- 'ambiance', 'background', 'soundboard'
    sound_order TEXT NOT NULL, -- JSON array of sound IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, sound_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ambiance_filename ON ambiance_sounds(filename);
CREATE INDEX IF NOT EXISTS idx_background_filename ON background_music(filename);
CREATE INDEX IF NOT EXISTS idx_soundboard_filename ON soundboard_sounds(filename);
CREATE INDEX IF NOT EXISTS idx_user_ambiance ON user_ambiance_sounds(user_id);
CREATE INDEX IF NOT EXISTS idx_user_background ON user_background_music(user_id);
CREATE INDEX IF NOT EXISTS idx_user_soundboard ON user_soundboard_sounds(user_id);