#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/docker/backup"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"
LATEST_FILE="$BACKUP_DIR/latest-backup.sql"

echo "💾 Backing up PostgreSQL database from pf-postgres container..."

if ! docker ps | grep -q "pf-postgres"; then
    echo "⚠️  Container pf-postgres is not running. Starting temporarily to perform backup..."
    docker compose -f "$ROOT_DIR/docker-compose.yml" start postgres
    sleep 3
fi

# Dump database schema and data
docker exec -t pf-postgres pg_dump -U pf_user -d personal_finance --clean --if-exists > "$BACKUP_FILE"
cp "$BACKUP_FILE" "$LATEST_FILE"

echo "✅ Backup successfully created:"
echo "   - Snapshot: $BACKUP_FILE"
echo "   - Latest:   $LATEST_FILE"
