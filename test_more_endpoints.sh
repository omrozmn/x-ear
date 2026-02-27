#!/bin/bash

set -e

echo "=== Testing More Endpoints - Session 30 ==="

# Get tokens
echo "Getting admin token..."
TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: login-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

TENANT_ID=$(curl -s http://localhost:5003/api/admin/tenants \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['tenants'][0]['id'])")

TENANT_TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/debug/switch-tenant \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: switch-$(date +%s)" \
  -d "{\"targetTenantId\": \"$TENANT_ID\"}" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

echo "Tokens ready!"

# Test 1: GET /api/parties (list)
echo -e "\n=== Test 1: GET /api/parties ==="
curl -s http://localhost:5003/api/parties \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 2: GET /api/inventory (list)
echo -e "\n=== Test 2: GET /api/inventory ==="
curl -s http://localhost:5003/api/inventory \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 3: GET /api/sales (list)
echo -e "\n=== Test 3: GET /api/sales ==="
curl -s http://localhost:5003/api/sales \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 4: POST /api/branches (create branch)
echo -e "\n=== Test 4: POST /api/branches ==="
BRANCH=$(curl -s -X POST http://localhost:5003/api/branches \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: branch-$(date +%s)" \
  -d "{
    \"name\": \"Test Branch $(date +%s)\",
    \"address\": \"Test Address\",
    \"phone\": \"+905551234567\"
  }")

echo "$BRANCH" | python3 -m json.tool | head -20

# Test 5: POST /api/campaigns (create campaign)
echo -e "\n=== Test 5: POST /api/campaigns ==="
CAMPAIGN=$(curl -s -X POST http://localhost:5003/api/campaigns \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: campaign-$(date +%s)" \
  -d "{
    \"name\": \"Test Campaign $(date +%s)\",
    \"type\": \"email\",
    \"status\": \"draft\"
  }")

echo "$CAMPAIGN" | python3 -m json.tool | head -20

# Test 6: POST /api/notifications/templates (create notification template)
echo -e "\n=== Test 6: POST /api/notifications/templates ==="
TEMPLATE=$(curl -s -X POST http://localhost:5003/api/notifications/templates \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: template-$(date +%s)" \
  -d "{
    \"name\": \"Test Template $(date +%s)\",
    \"type\": \"email\",
    \"subject\": \"Test Subject\",
    \"body\": \"Test Body\"
  }")

echo "$TEMPLATE" | python3 -m json.tool | head -20

# Test 7: GET /api/admin/users (list users)
echo -e "\n=== Test 7: GET /api/admin/users ==="
curl -s http://localhost:5003/api/admin/users \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Test 8: POST /api/tickets (create ticket)
echo -e "\n=== Test 8: POST /api/tickets ==="
TICKET=$(curl -s -X POST http://localhost:5003/api/tickets \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ticket-$(date +%s)" \
  -d "{
    \"title\": \"Test Ticket $(date +%s)\",
    \"description\": \"Test Description\",
    \"priority\": \"medium\"
  }")

echo "$TICKET" | python3 -m json.tool | head -20

# Test 9: GET /api/reports/sales (sales report)
echo -e "\n=== Test 9: GET /api/reports/sales ==="
curl -s "http://localhost:5003/api/reports/sales?startDate=2025-01-01&endDate=2025-12-31" \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 10: POST /api/inventory/bulk-upload (bulk upload - will fail without file)
echo -e "\n=== Test 10: POST /api/inventory/bulk-upload ==="
curl -s -X POST http://localhost:5003/api/inventory/bulk-upload \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Idempotency-Key: bulk-$(date +%s)" | python3 -m json.tool | head -20

echo -e "\n=== Testing Complete ==="
