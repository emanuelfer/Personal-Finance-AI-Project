#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LATEST_FILE="$ROOT_DIR/docker/backup/latest-backup.sql"

if [ ! -f "$LATEST_FILE" ]; then
    echo "⚠️  No backup file found at $LATEST_FILE. Nothing to restore."
    exit 0
fi

echo "🔄 Restoring PostgreSQL database from $LATEST_FILE..."

if ! docker ps | grep -q "pf-postgres"; then
    echo "Starting PostgreSQL container..."
    docker compose -f "$ROOT_DIR/docker-compose.yml" up -d postgres
    sleep 4
fi

# Execute restore
docker exec -i pf-postgres psql -U pf_user -d personal_finance < "$LATEST_FILE"

echo "✅ Database successfully restored from $LATEST_FILE!"
