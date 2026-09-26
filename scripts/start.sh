#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LATEST_FILE="$ROOT_DIR/docker/backup/latest-backup.sql"

echo "========================================================="
echo "Starting Personal Finance Docker Infrastructure"
echo "========================================================="

# 1. Start containers
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d

# 2. Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker exec pf-postgres pg_isready -U pf_user -d personal_finance >/dev/null 2>&1; do
    sleep 1
done

# 3. Check if database has data or needs restore from backup
if [ -f "$LATEST_FILE" ]; then
    TABLE_COUNT=$(docker exec pf-postgres psql -U pf_user -d personal_finance -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'spreadsheet_state';" 2>/dev/null || echo "0")
    if [ "$TABLE_COUNT" = "0" ] || [ -z "$TABLE_COUNT" ]; then
        echo "Detected fresh/empty database volume. Automatically restoring from $LATEST_FILE..."
        "$ROOT_DIR/scripts/restore-db.sh"
    else
        ROW_COUNT=$(docker exec pf-postgres psql -U pf_user -d personal_finance -tAc "SELECT count(*) FROM spreadsheet_state;" 2>/dev/null || echo "0")
        if [ "$ROW_COUNT" = "0" ]; then
            echo "Database tables exist but spreadsheet_state is empty. Restoring latest backup..."
            "$ROOT_DIR/scripts/restore-db.sh"
        fi
    fi
fi

echo "========================================================="
echo "✅ Infrastructure & Services are UP and ready!"
echo "   - Web App (SPA): http://localhost:8000 (Kong Proxy -> pf-frontend)"
echo "   - Backend API:   http://localhost:8000/api (Kong -> pf-backend-1 & pf-backend-2)"
echo "   - Keycloak IdP:  http://localhost:8088 (admin / admin)"
echo "   - Kong Manager:  http://localhost:8002 (Gateway Dashboard)"
echo "   - Kong Admin:    http://localhost:8001 (Admin API)"
echo "   - PostgreSQL:    localhost:5432"
echo "   - pgAdmin:       http://localhost:5050 (admin@admin.com / admin)"
echo "   - Redpanda:      http://localhost:8085 (Console)"
echo "   - Jaeger:        http://localhost:16686 (Tracing)"
echo "========================================================="
