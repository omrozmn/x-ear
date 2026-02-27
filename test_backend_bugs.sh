#!/bin/bash

BASE_URL="http://localhost:5003"

# Get admin token
echo "=== Getting admin token ==="
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)-$RANDOM" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}')
echo "$ADMIN_RESPONSE" | jq '.'
ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.data.token // .data.accessToken // empty')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "ERROR: Failed to get admin token"
  exit 1
fi

# Get tenant token
echo -e "\n=== Switching to tenant ==="
TENANT_ID="54e00319-e4fc-4fd3-9ad9-4f68e427e919"
SWITCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/auth/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)-$RANDOM" \
  -d "{\"tenantId\":\"$TENANT_ID\"}")
echo "$SWITCH_RESPONSE" | jq '.'
TENANT_TOKEN=$(echo "$SWITCH_RESPONSE" | jq -r '.data.token // .data.accessToken // empty')

if [ -z "$TENANT_TOKEN" ]; then
  echo "ERROR: Failed to get tenant token"
  exit 1
fi

# Bug 1: GET /api/reports/promissory-notes/list - 'PromissoryNote' object has no attribute 'party'
echo -e "\n=== Bug 1: GET /api/reports/promissory-notes/list ==="
curl -s -X GET "$BASE_URL/api/reports/promissory-notes/list" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.'

# Bug 2: GET /api/sales/{sale_id} - Internal server error
echo -e "\n=== Bug 2: GET /api/sales/2602230145 ==="
curl -s -X GET "$BASE_URL/api/sales/2602230145" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.'

# Bug 3: POST /api/deliverability/snapshot - Internal server error
echo -e "\n=== Bug 3: POST /api/deliverability/snapshot ==="
curl -s -X POST "$BASE_URL/api/deliverability/snapshot" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)-$RANDOM" \
  -d '{}' | jq '.'

echo -e "\n=== Tests complete ==="
