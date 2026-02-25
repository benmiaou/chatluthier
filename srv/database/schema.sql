-- SQLite Database Schema for ChatLuthier
-- Clean implementation: One entry per sound, contexts stored as JSON array

-- Users table
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

-- Sound categories
CREATE TABLE IF NOT EXISTS sound_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- Ambiance sounds - one entry per sound, contexts as JSON array
CREATE TABLE IF NOT EXISTS ambiance_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    display_name TEXT NOT NULL,
    image_file TEXT,
    credit TEXT,
    contexts TEXT, -- JSON array: ["animal", "nature"]
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(filename)
);

-- Background music - one entry per sound, contexts as JSON array of tuples
CREATE TABLE IF NOT EXISTS background_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    display_name TEXT NOT NULL,
    image_file TEXT,
    credit TEXT,
    contexts TEXT, -- JSON array: [["dynamic", "city"], ["calm", "adventure"]]
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(filename)
);

-- Soundboard sounds - one entry per sound, contexts as JSON array
CREATE TABLE IF NOT EXISTS soundboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    display_name TEXT NOT NULL,
    credit TEXT,
    contexts TEXT, -- JSON array: ["animal", "clock"]
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(filename)
);

-- User sounds - one entry per sound override
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

-- User sound contexts - one entry per user context override
CREATE TABLE IF NOT EXISTS user_sound_contexts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    sound_type TEXT NOT NULL,
    sound_id INTEGER NOT NULL,
    context TEXT NOT NULL, -- For background: "intensity:context"
    context_index INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, sound_type, sound_id, context, context_index)
);

-- User presets - one entry per preset
CREATE TABLE IF NOT EXISTS user_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    preset_name TEXT NOT NULL,
    preset_data TEXT NOT NULL, -- JSON with all sound settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, preset_name)
);

-- User sound orders - one entry per sound type
CREATE TABLE IF NOT EXISTS user_sound_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    sound_type TEXT NOT NULL,
    sound_order TEXT NOT NULL, -- JSON array of sound IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, sound_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ambiance_sounds_filename ON ambiance_sounds(filename);
CREATE INDEX IF NOT EXISTS idx_background_sounds_filename ON background_sounds(filename);
CREATE INDEX IF NOT EXISTS idx_soundboard_filename ON soundboard(filename);
CREATE INDEX IF NOT EXISTS idx_user_sounds_user ON user_sounds(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sound_contexts_user ON user_sound_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presets_user ON user_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sound_orders_user ON user_sound_orders(user_id);

-- Sound requests table
CREATE TABLE IF NOT EXISTS sound_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    file TEXT NOT NULL,
    contexts TEXT NOT NULL,
    sound_url TEXT,
    requested_by TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sound_requests_created ON sound_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_sound_requests_status ON sound_requests(status);

-- Initial sound categories
INSERT OR IGNORE INTO sound_categories (id, name, description) VALUES 
    (1, 'ambianceSounds', 'Ambient sounds for background atmosphere'),
    (2, 'backgroundMusic', 'Background music tracks'),
    (3, 'soundboard', 'Sound effects for soundboard');