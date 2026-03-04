#!/usr/bin/env node

/**
 * Script to remove admin privileges from a user in ChatLuthier
 *
 * Usage: node scripts/removeAdmin.js <userId|userPseudo>
 *
 * This script updates the user's is_admin flag in the database to revoke administrative privileges.
 */

const db = require('../srv/database/db');

async function removeUserAdmin(userIdentifier) {
  try {
    // Initialize database connection
    await db.initialize();

    console.log(`Attempting to remove admin privileges from user "${userIdentifier}"...`);

    // First, find the user by ID or pseudo
    const user = await db.queryOne(
      'SELECT id, pseudo, is_admin FROM users WHERE id = ? OR pseudo = ?',
      [userIdentifier, userIdentifier]
    );

    if (!user) {
      console.error(`❌ User "${userIdentifier}" not found in the database.`);
      console.log('Available users:');
      const allUsers = await db.query('SELECT id, pseudo, is_admin FROM users');
      allUsers.forEach((u) => {
        console.log(`  - ${u.pseudo || u.id} (${u.id}) - Admin: ${u.is_admin ? 'YES' : 'NO'}`);
      });
      return;
    }

    if (!user.is_admin) {
      console.log(`ℹ️  User "${user.pseudo || user.id}" is not an admin.`);
      return;
    }

    // Update the user's admin status
    await db.execute(
      'UPDATE users SET is_admin = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    console.log(`✅ Successfully removed admin privileges from user "${user.pseudo || user.id}"!`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Pseudo: ${user.pseudo || 'N/A'}`);
  } catch (error) {
    console.error(`❌ Error removing admin privileges:`, error.message);
    process.exit(1);
  } finally {
    // Close database connection
    if (db.db) {
      db.db.close((err) => {
        if (err) {
          console.error('Error closing database connection:', err.message);
        }
      });
    }
  }
}

// Main execution
if (process.argv.length < 3) {
  console.log('Usage: node scripts/removeAdmin.js <userId|userPseudo>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/removeAdmin.js user123');
  console.log('  node scripts/removeAdmin.js john_doe');
  process.exit(1);
}

const userIdentifier = process.argv[2];
await removeUserAdmin(userIdentifier);
