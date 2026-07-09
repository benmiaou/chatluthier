#!/usr/bin/env node
/**
 * Safety snapshot of the live SQLite database.
 *
 * Run this before any risky git operation on a server with a live DB
 * (git reset --hard, git checkout, git clean -fd, deploy scripts, etc.).
 *
 * See README.md → "Database safety on the server" for why this matters:
 * srv/database/chatluthier.db is gitignored on purpose. If it ever gets
 * accidentally committed and a later git operation resets to a commit/branch
 * that doesn't track it, the file is deleted from disk and the app silently
 * recreates an empty database on next start — wiping all data with no error.
 *
 * Usage: npm run db:backup
 */

const fs = require('node:fs');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '..', 'srv', 'database', 'chatluthier.db');
const BACKUP_DIR = path.join(__dirname, '..', 'srv', 'database', 'backups');

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`No database file found at ${DB_PATH} — nothing to back up.`);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destPath = path.join(BACKUP_DIR, `chatluthier.db.${timestamp}.bak`);

  fs.copyFileSync(DB_PATH, destPath);
  console.log(`Database backed up to ${destPath}`);
}

main();
