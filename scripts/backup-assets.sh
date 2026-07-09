#!/usr/bin/env bash
#
# Backup all unversioned (gitignored) runtime assets for ChatLuthier into a
# single timestamped zip archive stored under /var/www/assets-backup/.
#
# These paths are intentionally excluded from git (see .gitignore) because
# they are live server data, not code:
#   - srv/database/chatluthier.db  (SQLite database)
#   - srv_sound_data/              (audio files + images served by the app)
#   - uploads/                     (user-uploaded files)
#   - srv/Tokens                   (legacy secrets fallback file, if present)
#
# Run this BEFORE any risky git operation (git reset --hard, git checkout,
# git clean -fd, deploy scripts) on a server with live data — see README.md
# → "Database & asset safety on the server" for why this matters.
#
# Usage:
#   ./scripts/backup-assets.sh [app-dir] [backup-dir]
#
#   app-dir     Path to the ChatLuthier app checkout (default: current dir)
#   backup-dir  Where to store the zip (default: /var/www/assets-backup)
#
# Example (cron, daily at 3am):
#   0 3 * * * /var/www/chatluthier-dev/scripts/backup-assets.sh /var/www/chatluthier-dev >> /var/log/chatluthier-backup.log 2>&1

set -euo pipefail

APP_DIR="${1:-$(pwd)}"
BACKUP_DIR="${2:-/var/www/assets-backup}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_NAME="chatluthier-assets-${TIMESTAMP}.zip"
ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_NAME}"

if [ ! -d "$APP_DIR" ]; then
  echo "App directory not found: $APP_DIR" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

cd "$APP_DIR"

# Only include paths that actually exist — keeps this safe to run in
# environments missing some of these (e.g. no uploads yet).
PATHS_TO_BACKUP=()
for p in "srv/database/chatluthier.db" "srv_sound_data" "uploads" "srv/Tokens"; do
  if [ -e "$p" ]; then
    PATHS_TO_BACKUP+=("$p")
  fi
done

if [ ${#PATHS_TO_BACKUP[@]} -eq 0 ]; then
  echo "No unversioned asset paths found in $APP_DIR — nothing to back up." >&2
  exit 1
fi

echo "Backing up: ${PATHS_TO_BACKUP[*]}"
zip -r -q "$ARCHIVE_PATH" "${PATHS_TO_BACKUP[@]}"

echo "✅ Backup created: $ARCHIVE_PATH ($(du -h "$ARCHIVE_PATH" | cut -f1))"
