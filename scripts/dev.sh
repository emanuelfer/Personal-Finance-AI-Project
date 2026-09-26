#!/usr/bin/env bash
set -e

echo "========================================================="
echo "Personal Finance & AI Advisory Platform (Apple Silicon Dev)"
echo "========================================================="

export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk-26.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "1. Checking Infrastructure Topology..."
if command -v docker >/dev/null 2>&1; then
    echo "Starting Docker/OrbStack containers..."
    docker compose -f "$ROOT_DIR/docker-compose.yml" up -d
else
    echo "Docker not directly in PATH, ensure PostgreSQL, Redis, and Redpanda are running."
fi

echo "2. Building & Testing Quarkus Backend..."
cd "$ROOT_DIR/backend"
./mvnw test -Dtest=AccountAggregateTest,ReceiptAggregateTest,BudgetAggregateTest,EmbeddingServiceTest

echo ""
echo "3. Starting Backend in Dev Mode..."
echo "Run './mvnw quarkus:dev' in backend/ directory."
echo ""
echo "4. Starting Angular Frontend..."
echo "Run 'npm start' in frontend/ directory."
echo "========================================================="
