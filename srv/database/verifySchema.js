const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./config');

async function verifySchema() {
    try {
        const db = new sqlite3.Database(config.sqlite.filename);
        
        console.log('🔍 Verifying database schema...');
        console.log('📁 Database location:', config.sqlite.filename);
        
        // Check if user_sound_orders table exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='user_sound_orders'", (err, row) => {
            if (err) {
                console.error('❌ Error checking table:', err.message);
                db.close();
                return;
            }
            
            if (!row) {
                console.log('❌ user_sound_orders table does not exist');
                db.close();
                return;
            }
            
            console.log('✅ user_sound_orders table exists');
            
            // Check the table structure
            db.all("PRAGMA table_info(user_sound_orders)", (err, columns) => {
                if (err) {
                    console.error('❌ Error getting table structure:', err.message);
                    db.close();
                    return;
                }
                
                console.log('📋 Table structure:');
                columns.forEach(col => {
                    console.log(`   • ${col.name} (${col.type})`);
                });
                
                // Check if category_id column exists
                const hasCategoryId = columns.some(col => col.name === 'category_id');
                if (hasCategoryId) {
                    console.log('✅ category_id column exists');
                } else {
                    console.log('❌ category_id column is missing');
                }
                
                // Check sound_categories table
                db.all("SELECT * FROM sound_categories", (err, categories) => {
                    if (err) {
                        console.error('❌ Error getting sound categories:', err.message);
                    } else {
                        console.log('📋 Sound categories:');
                        categories.forEach(cat => {
                            console.log(`   • ${cat.id}: ${cat.name} - ${cat.description}`);
                        });
                    }
                    db.close();
                });
            });
        });
        
    } catch (error) {
        console.error('❌ Verification failed:', error);
    }
}

verifySchema();