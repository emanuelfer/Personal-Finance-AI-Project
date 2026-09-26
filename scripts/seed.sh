#!/usr/bin/env bash
set -e

BACKEND_URL="${1:-http://localhost:8000}"
TENANT_ID="${2:-default-user}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8088}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-personal-finance-realm}"
KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-personal-finance-frontend}"
KEYCLOAK_USER="${KEYCLOAK_USER:-admin}"
KEYCLOAK_PASS="${KEYCLOAK_PASS:-admin123}"

echo "========================================================="
echo "Seeding Spreadsheet & Expense Catalog for Tenant: $TENANT_ID"
echo "Backend Endpoint: $BACKEND_URL"
echo "========================================================="

# 1. Fetch Keycloak JWT Token if security is active
echo "Authenticating with Keycloak ($KEYCLOAK_URL)..."
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/$KEYCLOAK_REALM/protocol/openid-connect/token" \
  -d "client_id=$KEYCLOAK_CLIENT_ID" \
  -d "grant_type=password" \
  -d "username=$KEYCLOAK_USER" \
  -d "password=$KEYCLOAK_PASS" 2>/dev/null | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)

if [ -n "$TOKEN" ]; then
  echo "✓ Keycloak JWT token acquired successfully."
  AUTH_HEADER="Authorization: Bearer $TOKEN"
else
  echo "⚠️ Keycloak token could not be obtained; proceeding with tenant header only."
  AUTH_HEADER="X-Auth-Bypass: true"
fi

HEADERS=(-H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT_ID" -H "$AUTH_HEADER")

echo ""
echo "1. Seeding Expense Catalog in PostgreSQL..."
curl -s -X POST "$BACKEND_URL/api/spreadsheet/catalog" "${HEADERS[@]}" \
  -d '{"description":"Condomínio & IPTU","defaultAmount":1200.00,"owner":"Compartilhado","category":"MORADIA","icon":"🏢"}' >/dev/null || true

curl -s -X POST "$BACKEND_URL/api/spreadsheet/catalog" "${HEADERS[@]}" \
  -d '{"description":"Supermercado Mensal","defaultAmount":1800.00,"owner":"Compartilhado","category":"ALIMENTACAO","icon":"🛒"}' >/dev/null || true

curl -s -X POST "$BACKEND_URL/api/spreadsheet/catalog" "${HEADERS[@]}" \
  -d '{"description":"Internet Fibra 1Gbps","defaultAmount":150.00,"owner":"Compartilhado","category":"UTILIDADES","icon":"🌐"}' >/dev/null || true

curl -s -X POST "$BACKEND_URL/api/spreadsheet/catalog" "${HEADERS[@]}" \
  -d '{"description":"Academia & Saúde","defaultAmount":250.00,"owner":"Compartilhado","category":"SAUDE","icon":"💪"}' >/dev/null || true

curl -s -X POST "$BACKEND_URL/api/spreadsheet/catalog" "${HEADERS[@]}" \
  -d '{"description":"Lazer & Restaurantes","defaultAmount":600.00,"owner":"Compartilhado","category":"LAZER","icon":"🍽️"}' >/dev/null || true

echo "✓ Expense Catalog populated."

echo ""
echo "2. Seeding 2026 Annual Spreadsheet State (All 12 Months, Dynamic Members)..."
curl -s -X POST "$BACKEND_URL/api/spreadsheet/2026" "${HEADERS[@]}" \
  -d '{
    "baseInitialReserve": 21000.00,
    "members": [
      {
        "id": "member-1",
        "name": "Membro 1",
        "icon": "👤",
        "color": "indigo",
        "baseInitialReserve": 11000.00,
        "baseInitialCapitalGiro": 6000.00
      },
      {
        "id": "member-2",
        "name": "Membro 2",
        "icon": "👥",
        "color": "purple",
        "baseInitialReserve": 6000.00,
        "baseInitialCapitalGiro": 4000.00
      },
      {
        "id": "member-3",
        "name": "Membro 3",
        "icon": "👶",
        "color": "emerald",
        "baseInitialReserve": 4000.00,
        "baseInitialCapitalGiro": 2000.00
      }
    ],
    "months": [
      {
        "id": "m-0-2026",
        "monthIndex": 0,
        "monthName": "Janeiro",
        "year": 2026,
        "yearMonth": "2026-01",
        "income": 20000.00,
        "userIncomes": {"member-1": 12000.00, "member-2": 8000.00, "member-3": 0.00},
        "userCapitalGiro": {"member-1": 6000.00, "member-2": 4000.00, "member-3": 2000.00},
        "userInitialCash": {"member-1": 11000.00, "member-2": 6000.00, "member-3": 4000.00},
        "expenses": [
          {"id": "exp-1", "description": "Condomínio & IPTU", "amount": 1200.00, "owner": "Compartilhado", "category": "MORADIA", "paid": true},
          {"id": "exp-2", "description": "Supermercado Mensal", "amount": 1850.00, "owner": "Compartilhado", "category": "ALIMENTACAO", "paid": true},
          {"id": "exp-3", "description": "Internet Fibra 1Gbps", "amount": 150.00, "owner": "Compartilhado", "category": "UTILIDADES", "paid": true},
          {"id": "exp-4", "description": "Academia & Saúde", "amount": 250.00, "owner": "Compartilhado", "category": "SAUDE", "paid": true}
        ]
      },
      {
        "id": "m-1-2026",
        "monthIndex": 1,
        "monthName": "Fevereiro",
        "year": 2026,
        "yearMonth": "2026-02",
        "income": 20000.00,
        "userIncomes": {"member-1": 12000.00, "member-2": 8000.00, "member-3": 0.00},
        "userCapitalGiro": {"member-1": 6000.00, "member-2": 4000.00, "member-3": 2000.00},
        "userInitialCash": {"member-1": 11000.00, "member-2": 6000.00, "member-3": 4000.00},
        "expenses": [
          {"id": "exp-1", "description": "Condomínio & IPTU", "amount": 1200.00, "owner": "Compartilhado", "category": "MORADIA", "paid": true},
          {"id": "exp-2", "description": "Supermercado Mensal", "amount": 1780.00, "owner": "Compartilhado", "category": "ALIMENTACAO", "paid": true},
          {"id": "exp-3", "description": "Internet Fibra 1Gbps", "amount": 150.00, "owner": "Compartilhado", "category": "UTILIDADES", "paid": true}
        ]
      },
      {
        "id": "m-2-2026",
        "monthIndex": 2,
        "monthName": "Março",
        "year": 2026,
        "yearMonth": "2026-03",
        "income": 20000.00,
        "userIncomes": {"member-1": 12000.00, "member-2": 8000.00, "member-3": 0.00},
        "userCapitalGiro": {"member-1": 6000.00, "member-2": 4000.00, "member-3": 2000.00},
        "userInitialCash": {"member-1": 11000.00, "member-2": 6000.00, "member-3": 4000.00},
        "expenses": [
          {"id": "exp-1", "description": "Condomínio & IPTU", "amount": 1200.00, "owner": "Compartilhado", "category": "MORADIA", "paid": true},
          {"id": "exp-2", "description": "Supermercado Mensal", "amount": 1900.00, "owner": "Compartilhado", "category": "ALIMENTACAO", "paid": true},
          {"id": "exp-3", "description": "Internet Fibra 1Gbps", "amount": 150.00, "owner": "Compartilhado", "category": "UTILIDADES", "paid": true}
        ]
      },
      {
        "id": "m-3-2026",
        "monthIndex": 3,
        "monthName": "Abril",
        "year": 2026,
        "yearMonth": "2026-04",
        "income": 20000.00,
        "userIncomes": {"member-1": 12000.00, "member-2": 8000.00, "member-3": 0.00},
        "userCapitalGiro": {"member-1": 6000.00, "member-2": 4000.00, "member-3": 2000.00},
        "userInitialCash": {"member-1": 11000.00, "member-2": 6000.00, "member-3": 4000.00},
        "expenses": [
          {"id": "exp-1", "description": "Condomínio & IPTU", "amount": 1200.00, "owner": "Compartilhado", "category": "MORADIA", "paid": true},
          {"id": "exp-2", "description": "Supermercado Mensal", "amount": 1820.00, "owner": "Compartilhado", "category": "ALIMENTACAO", "paid": true}
        ]
      },
      {
        "id": "m-4-2026",
        "monthIndex": 4,
        "monthName": "Maio",
        "year": 2026,
        "yearMonth": "2026-05",
        "income": 20000.00,
        "userIncomes": {"member-1": 12000.00, "member-2": 8000.00, "member-3": 0.00},
        "userCapitalGiro": {"member-1": 6000.00, "member-2": 4000.00, "member-3": 2000.00},
        "userInitialCash": {"member-1": 11000.00, "member-2": 6000.00, "member-3": 4000.00},
        "expenses": [
          {"id": "exp-1", "description": "Condomínio & IPTU", "amount": 1200.00, "owner": "Compartilhado", "category": "MORADIA", "paid": true},
          {"id": "exp-2", "description": "Supermercado Mensal", "amount": 1800.00, "owner": "Compartilhado", "category": "ALIMENTACAO", "paid": true}
        ]
      },
      {
        "id": "m-5-2026",
        "monthIndex": 5,
        "monthName": "Junho",
        "year": 2026,
        "yearMonth": "2026-06",
        "income": 20000.00,
        "userIncomes": {"member-1": 12000.00, "member-2": 8000.00, "member-3": 0.00},
        "userCapitalGiro": {"member-1": 6000.00, "member-2": 4000.00, "member-3": 2000.00},
        "userInitialCash": {"member-1": 11000.00, "member-2": 6000.00, "member-3": 4000.00},
        "expenses": [
          {"id": "exp-1", "description": "Condomínio & IPTU", "amount": 1200.00, "owner": "Compartilhado", "category": "MORADIA", "paid": true},
          {"id": "exp-2", "description": "Supermercado Mensal", "amount": 1850.00, "owner": "Compartilhado", "category": "ALIMENTACAO", "paid": true}
        ]
      },
      {
        "id": "m-6-2026",
        "monthIndex": 6,
        "monthName": "Julho",
        "year": 2026,
        "yearMonth": "2026-07",
        "income": 20000.00,
        "userIncomes": {"member-1": 12000.00, "member-2": 8000.00, "member-3": 0.00},
        "userCapitalGiro": {"member-1": 6000.00, "member-2": 4000.00, "member-3": 2000.00},
        "userInitialCash": {"member-1": 11000.00, "member-2": 6000.00, "member-3": 4000.00},
        "expenses": [
          {"id": "exp-1", "description": "Condomínio & IPTU", "amount": 1200.00, "owner": "Compartilhado", "category": "MORADIA", "paid": true},
          {"id": "exp-2", "description": "Supermercado Mensal", "amount": 1790.00, "owner": "Compartilhado", "category": "ALIMENTACAO", "paid": true}
        ]
      },
      {
        "id": "m-7-2026",
        "monthIndex": 7,
        "monthName": "Agosto",
        "year": 2026,
        "yearMonth": "2026-08",
        "income": 20000.00,
        "userIncomes": {"member-1": 12000.00, "member-2": 8000.00, "member-3": 0.00},
        "userCapitalGiro": {"member-1": 6000.00, "member-2": 4000.00, "member-3": 2000.00},
        "userInitialCash": {"member-1": 11000.00, "member-2": 6000.00, "member-3": 4000.00},
        "expenses": [
          {"id": "exp-1", "description": "Condomínio & IPTU", "amount": 1200.00, "owner": "Compartilhado", "category": "MORADIA", "paid": true},
          {"id": "exp-2", "description": "Supermercado Mensal", "amount": 1810.00, "owner": "Compartilhado", "category": "ALIMENTACAO", "paid": true}
        ]
      },
      {
        "id": "m-8-2026",
        "monthIndex": 8,
        "monthName": "Setembro",
        "year": 2026,
        "yearMonth": "2026-09",
        "income": 20000.00,
        "userIncomes": {"member-1": 12000.00, "member-2": 8000.00, "member-3": 0.00},
        "userCapitalGiro": {"member-1": 6000.00, "member-2": 4000.00, "member-3": 2000.00},
        "userInitialCash": {"member-1": 11000.00, "member-2": 6000.00, "member-3": 4000.00},
        "expenses": [
          {"id": "exp-1", "description": "Condomínio & IPTU", "amount": 1200.00, "owner": "Compartilhado", "category": "MORADIA", "paid": true},
          {"id": "exp-2", "description": "Supermercado Mensal", "amount": 1840.00, "owner": "Compartilhado", "category": "ALIMENTACAO", "paid": true}
        ]
      },
      {
        "id": "m-9-2026",
        "monthIndex": 9,
        "monthName": "Outubro",
        "year": 2026,
        "yearMonth": "2026-09",
        "income": 20000.00,
        "userIncomes": {"member-1": 12000.00, "member-2": 8000.00, "member-3": 0.00},
        "userCapitalGiro": {"member-1": 6000.00, "member-2": 4000.00, "member-3": 2000.00},
        "userInitialCash": {"member-1": 11000.00, "member-2": 6000.00, "member-3": 4000.00},
        "expenses": [
          {"id": "exp-1", "description": "Condomínio & IPTU", "amount": 1200.00, "owner": "Compartilhado", "category": "MORADIA", "paid": true},
          {"id": "exp-2", "description": "Supermercado Mensal", "amount": 1800.00, "owner": "Compartilhado", "category": "ALIMENTACAO", "paid": true}
        ]
      },
      {
        "id": "m-10-2026",
        "monthIndex": 10,
        "monthName": "Novembro",
        "year": 2026,
        "yearMonth": "2026-11",
        "income": 20000.00,
        "userIncomes": {"member-1": 12000.00, "member-2": 8000.00, "member-3": 0.00},
        "userCapitalGiro": {"member-1": 6000.00, "member-2": 4000.00, "member-3": 2000.00},
        "userInitialCash": {"member-1": 11000.00, "member-2": 6000.00, "member-3": 4000.00},
        "expenses": [
          {"id": "exp-1", "description": "Condomínio & IPTU", "amount": 1200.00, "owner": "Compartilhado", "category": "MORADIA", "paid": true},
          {"id": "exp-2", "description": "Supermercado Mensal", "amount": 1860.00, "owner": "Compartilhado", "category": "ALIMENTACAO", "paid": true}
        ]
      },
      {
        "id": "m-11-2026",
        "monthIndex": 11,
        "monthName": "Dezembro",
        "year": 2026,
        "yearMonth": "2026-12",
        "income": 20000.00,
        "userIncomes": {"member-1": 12000.00, "member-2": 8000.00, "member-3": 0.00},
        "userCapitalGiro": {"member-1": 6000.00, "member-2": 4000.00, "member-3": 2000.00},
        "userInitialCash": {"member-1": 11000.00, "member-2": 6000.00, "member-3": 4000.00},
        "expenses": [
          {"id": "exp-1", "description": "Condomínio & IPTU", "amount": 1200.00, "owner": "Compartilhado", "category": "MORADIA", "paid": true},
          {"id": "exp-2", "description": "Supermercado Mensal", "amount": 2100.00, "owner": "Compartilhado", "category": "ALIMENTACAO", "paid": true}
        ]
      }
    ]
  }'

echo ""
echo "========================================================="
echo "Seed Data Generated Successfully!"
echo "Inspect the live Spreadsheet at http://localhost:8000"
echo "========================================================="
