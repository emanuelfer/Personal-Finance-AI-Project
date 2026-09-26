#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "========================================================="
echo "Stopping Personal Finance Docker Containers Safely"
echo "========================================================="

# 1. Automatic Snapshot Backup
if docker ps 2>/dev/null | grep -q "pf-postgres"; then
    echo "1. Creating automated database backup snapshot before stopping..."
    "$ROOT_DIR/scripts/backup-db.sh"
else
    echo "1. PostgreSQL container not running, skipping snapshot."
fi

# 2. Stop containers safely without deleting volumes
echo "2. Stopping Docker containers (data is safely preserved in volumes & backup)..."
docker compose -f "$ROOT_DIR/docker-compose.yml" stop

echo "========================================================="
echo "✅ All containers stopped safely."
echo "💾 Database is persisted in Docker volume AND in docker/backup/latest-backup.sql"
echo "🚀 To restart your project later, run: ./scripts/start.sh"
echo "========================================================="
