const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

/**
 * JSON to SQL Migration Script for ChatLuthier
 * Clean implementation: One database entry per sound, all contexts stored as JSON array
 */

class JSONtoSQLMigrator {
  constructor() {
    this.dbPath = path.join(__dirname, 'chatluthier.db');
    this.db = null;
  }

  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
          return;
        }
        console.log('Connected to SQLite database');
        resolve();
      });
    });
  }

  async executeSchema() {
    return new Promise((resolve, reject) => {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');

      this.db.exec(schema, (err) => {
        if (err) {
          console.error('Error executing schema:', err.message);
          reject(err);
          return;
        }
        console.log('Database schema executed successfully');
        resolve();
      });
    });
  }

  async migrateServerSounds() {
    const soundTypes = [
      {
        name: 'ambianceSounds',
        file: 'ambianceSounds.json',
        table: 'ambiance_sounds',
        hasImageFile: true,
      },
      {
        name: 'backgroundMusic',
        file: 'backgroundMusic.json',
        table: 'background_sounds',
        hasImageFile: true,
      },
      { name: 'soundboard', file: 'soundboard.json', table: 'soundboard', hasImageFile: false },
    ];

    for (const soundType of soundTypes) {
      await this.migrateSoundType(soundType);
    }
  }

  async migrateSoundType(soundType) {
    const filePath = path.join(__dirname, '..', 'srv_data', soundType.file);

    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}, skipping...`);
      return;
    }

    const soundsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`Migrating ${soundsData.length} ${soundType.name} sounds...`);

    for (const sound of soundsData) {
      await this.insertSound(sound, soundType);
    }
  }

  async insertSound(soundData, soundType) {
    return new Promise((resolve, reject) => {
      // Store all contexts as JSON array in single entry
      let contexts = soundData.contexts || [];

      // For background music, keep nested array structure ["dynamic", "city"]
      // For other sounds, ensure simple array ["animal", "nature"]
      if (
        soundType.table !== 'background_sounds' &&
        Array.isArray(contexts) &&
        contexts.length > 0 &&
        Array.isArray(contexts[0])
      ) {
        contexts = contexts.flat(); // Flatten nested arrays for non-background sounds
      }

      const migrator = this;
      let soundQuery, params;

      if (soundType.hasImageFile) {
        soundQuery = `
                    INSERT OR IGNORE INTO ${soundType.table}
                    (filename, display_name, image_file, credit, contexts, is_enabled)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
        params = [
          soundData.filename,
          soundData.display_name,
          soundData.imageFile || null,
          soundData.credit || '',
          JSON.stringify(contexts),
          soundData.isEnabled !== undefined ? soundData.isEnabled : true,
        ];
      } else {
        soundQuery = `
                    INSERT OR IGNORE INTO ${soundType.table}
                    (filename, display_name, credit, contexts, is_enabled)
                    VALUES (?, ?, ?, ?, ?)
                `;
        params = [
          soundData.filename,
          soundData.display_name,
          soundData.credit || '',
          JSON.stringify(contexts),
          soundData.isEnabled !== undefined ? soundData.isEnabled : true,
        ];
      }

      migrator.db.run(soundQuery, params, function (err) {
        if (err) {
          console.error(`Error inserting sound ${soundData.filename}:`, err.message);
          reject(err);
        } else {
          console.log(`✅ ${soundData.filename} - ${contexts.length} contexts stored as JSON`);
          resolve();
        }
      });
    });
  }

  async closeDatabase() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
            reject(err);
            return;
          }
          console.log('Database connection closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async runMigration() {
    try {
      console.log('Starting JSON to SQL migration...');
      await this.initializeDatabase();
      await this.executeSchema();
      await this.migrateServerSounds();
      console.log('✅ Migration completed successfully!');
      console.log(`Database created at: ${this.dbPath}`);
    } catch (error) {
      console.error('❌ Migration failed:', error);
    } finally {
      await this.closeDatabase();
    }
  }
}

if (require.main === module) {
  const migrator = new JSONtoSQLMigrator();
  migrator.runMigration();
}

module.exports = JSONtoSQLMigrator;
