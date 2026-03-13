const sqlite3 = require('sqlite3').verbose();
const path = require('node:path');
const config = require('./config');

/**
 * Database Utility Class for ChatLuthier
 *
 * This class provides a wrapper around SQLite3 with promise-based operations
 * and connection management for the ChatLuthier application.
 */

class Database {
  db = null;
  config = config.sqlite;

  /**
   * Initialize the database connection
   */
  async initialize() {
    if (this.db) {
      return this.db; // Already initialized
    }

    return new Promise((resolve, reject) => {
      // Open database connection
      this.db = new sqlite3.Database(this.config.filename, (err) => {
        if (err) {
          const winstonLogger = require('../utils/logger');
          winstonLogger.error('Error opening database connection', {
            error: err.message,
            context: 'database',
          });
          reject(err);
          return;
        }

        const winstonLogger = require('../utils/logger');
        winstonLogger.info('Database connection established', { context: 'database' });

        // Enable foreign key constraints
        this.db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) {
            winstonLogger.warn('Could not enable foreign keys', {
              error: err.message,
              context: 'database',
            });
          }
          resolve(this.db);
        });
      });
    });
  }

  /**
   * Execute a SQL query with parameters
   */
  async query(sql, params = []) {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          const winstonLogger = require('../utils/logger');
          winstonLogger.error('Query error', {
            sql,
            params,
            error: err.message,
            context: 'database',
          });
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * Execute a SQL query that returns a single row
   */
  async queryOne(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Execute a SQL insert/update/delete operation
   */
  async execute(sql, params = []) {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          const winstonLogger = require('../utils/logger');
          winstonLogger.error('Execute error', {
            sql,
            params,
            error: err.message,
            context: 'database',
          });
          reject(err);
          return;
        }
        resolve({
          lastID: this.lastID,
          changes: this.changes,
        });
      });
    });
  }

  /**
   * Begin a transaction
   */
  async beginTransaction() {
    return this.execute('BEGIN TRANSACTION');
  }

  /**
   * Commit a transaction
   */
  async commit() {
    return this.execute('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  async rollback() {
    return this.execute('ROLLBACK');
  }

  /**
   * Close the database connection
   */
  async close() {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database connection:', err.message);
          reject(err);
          return;
        }
        console.log('Database connection closed');
        this.db = null;
        resolve();
      });
    });
  }

  /**
   * Check if the database is initialized (tables exist)
   */
  async isInitialized() {
    try {
      const result = await this.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='ambiance_sounds'"
      );
      return result.length > 0;
    } catch (error) {
      console.error('Error checking if database is initialized:', error.message);
      return false;
    }
  }

  /**
   * Initialize the database schema if not already initialized
   */
  async initializeSchema() {
    const isInitialized = await this.isInitialized();

    if (isInitialized) {
      console.log('Database schema already initialized');
      await this.runMigrations();
      return;
    }

    console.log('Initializing database schema...');

    const fs = require('node:fs');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Use exec instead of execute for multiple statements
    await new Promise((resolve, reject) => {
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('Error executing schema:', err.message);
          reject(err);
          return;
        }
        console.log('Database schema initialized successfully');
        resolve();
      });
    });
  }

  /**
   * Run incremental migrations for existing databases
   */
  async runMigrations() {
    const migrations = [
      {
        name: 'add_external_sounds_table',
        sql: `
          CREATE TABLE IF NOT EXISTS external_sounds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            provider TEXT NOT NULL CHECK(provider IN ('spotify', 'deezer', 'soundcloud')),
            provider_track_id TEXT NOT NULL,
            artist TEXT NOT NULL,
            title TEXT NOT NULL,
            album TEXT,
            duration_ms INTEGER,
            thumbnail_url TEXT,
            preview_url TEXT,
            contexts TEXT,
            is_enabled BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, provider, provider_track_id)
          );
          CREATE INDEX IF NOT EXISTS idx_external_sounds_user ON external_sounds(user_id);
          CREATE INDEX IF NOT EXISTS idx_external_sounds_provider ON external_sounds(provider);
        `,
      },
      {
        name: 'add_external_sounds_permalink',
        sql: `ALTER TABLE external_sounds ADD COLUMN permalink_url TEXT`,
      },
      {
        name: 'add_user_sound_overrides_table',
        sql: `
          CREATE TABLE IF NOT EXISTS user_sound_overrides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            sound_type TEXT NOT NULL,
            sound_id INTEGER NOT NULL,
            is_enabled BOOLEAN,
            contexts TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, sound_type, sound_id)
          );
          CREATE INDEX IF NOT EXISTS idx_user_sound_overrides_user ON user_sound_overrides(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_sound_overrides_lookup ON user_sound_overrides(user_id, sound_type);
        `,
      },
      {
        name: 'drop_legacy_user_sound_tables',
        sql: `
          DROP TABLE IF EXISTS user_sound_contexts;
          DROP TABLE IF EXISTS user_sounds;
        `,
      },
    ];

    for (const migration of migrations) {
      try {
        if (
          migration.name === 'add_external_sounds_table' ||
          migration.name === 'add_user_sound_overrides_table' ||
          migration.name === 'drop_legacy_user_sound_tables'
        ) {
          // For table creation, just run it (IF NOT EXISTS is safe)
          await new Promise((resolve, reject) => {
            this.db.exec(migration.sql, (err) => {
              if (err) {
                console.error(`Migration ${migration.name} error:`, err.message);
                reject(err);
              } else {
                console.log(`Migration ${migration.name} applied`);
                resolve();
              }
            });
          });
        } else if (migration.name === 'add_external_sounds_permalink') {
          // For column addition, check if column already exists first
          const columnCheck = await this.query('PRAGMA table_info(external_sounds)');
          const hasPermalink = columnCheck.some((col) => col.name === 'permalink_url');

          if (!hasPermalink) {
            await this.execute(migration.sql);
            console.log(`Migration ${migration.name} applied`);
          } else {
            console.log(`Migration ${migration.name} skipped - column already exists`);
          }
        }
      } catch (error) {
        console.error(`Migration ${migration.name} failed:`, error.message);
      }
    }
  }

  /**
   * Get a sound by filename and category
   */
  async getSoundByFilename(filename, categoryId) {
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
        console.error('Invalid category ID:', categoryId);
        return null;
    }

    const sql = `
            SELECT * 
            FROM ${tableName} 
            WHERE filename = ?
        `;
    return this.queryOne(sql, [filename]);
  }
}

// Singleton instance
const dbInstance = new Database();

module.exports = dbInstance;
