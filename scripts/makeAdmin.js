#!/usr/bin/env node

/**
 * Script to make a user an admin in ChatLuthier
 *
 * Usage: node scripts/makeAdmin.js <userId|userEmail|userPseudo>
 *
 * This script updates the user's is_admin flag in the database to grant administrative privileges.
 */

const path = require('path');
const db = require('../srv/database/db');

async function makeUserAdmin(userIdentifier) {
  try {
    // Initialize database connection
    await db.initialize();

    console.log(`Attempting to make user "${userIdentifier}" an admin...`);

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

    if (user.is_admin) {
      console.log(`ℹ️  User "${user.pseudo || user.id}" is already an admin.`);
      return;
    }

    // Update the user's admin status
    await db.execute(
      'UPDATE users SET is_admin = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    console.log(`✅ Successfully made user "${user.pseudo || user.id}" an admin!`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Pseudo: ${user.pseudo || 'N/A'}`);
  } catch (error) {
    console.error(`❌ Error making user admin:`, error.message);
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
  console.log('Usage: node scripts/makeAdmin.js <userId|userEmail|userPseudo>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/makeAdmin.js user123');
  console.log('  node scripts/makeAdmin.js user@example.com');
  console.log('  node scripts/makeAdmin.js john_doe');
  process.exit(1);
}

const userIdentifier = process.argv[2];
await makeUserAdmin(userIdentifier);
