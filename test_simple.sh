#!/bin/bash
# Simple API Test - Use existing resources

BASE_URL="http://localhost:5003"
ADMIN_EMAIL="admin@x-ear.com"
ADMIN_PASSWORD="admin123"

echo "=== Simple API Test ==="

# 1. Admin login
echo "1. Admin login..."
ADMIN_RES=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: login-$(date +%s)" \
  -d '{"email":"'"$ADMIN_EMAIL"'","password":"'"$ADMIN_PASSWORD"'"}')

ADMIN_TOKEN=$(echo "$ADMIN_RES" | jq -r '.data.token')
echo "Admin token: ${ADMIN_TOKEN:0:20}..."

# 2. Get existing tenant
echo "2. Get existing tenant..."
TENANT_RES=$(curl -s -X GET "$BASE_URL/api/admin/tenants?page=1&perPage=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TENANT_ID=$(echo "$TENANT_RES" | jq -r '.data.tenants[0].id')
echo "Tenant ID: $TENANT_ID"

# 3. Switch to tenant
echo "3. Switch to tenant..."
SWITCH_RES=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: switch-$(date +%s)" \
  -d '{"targetTenantId":"'"$TENANT_ID"'"}')

TENANT_TOKEN=$(echo "$SWITCH_RES" | jq -r '.data.accessToken')
echo "Tenant token: ${TENANT_TOKEN:0:20}..."

# 4. Test a few endpoints
echo ""
echo "=== Testing Endpoints ==="

# Test 1: GET /api/parties
echo "Test 1: GET /api/parties"
curl -s -X GET "$BASE_URL/api/parties?page=1&perPage=10" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.success, .data.parties | length'

# Test 2: POST /api/parties (create)
echo "Test 2: POST /api/parties"
PARTY_RES=$(curl -s -X POST "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d '{"firstName":"Test","lastName":"User","phone":"+9055512345'$(date +%s | tail -c 5)'","email":"test'$(date +%s)'@test.com","tcNumber":"'$(( 10000000000 + RANDOM ))'","status":"active"}')

PARTY_ID=$(echo "$PARTY_RES" | jq -r '.data.id')
echo "Created party: $PARTY_ID"
echo "Success: $(echo "$PARTY_RES" | jq -r '.success')"

# Test 3: GET /api/parties/{id}
echo "Test 3: GET /api/parties/$PARTY_ID"
curl -s -X GET "$BASE_URL/api/parties/$PARTY_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.success, .data.firstName, .data.lastName'

# Test 4: GET /api/inventory/items
echo "Test 4: GET /api/inventory/items"
curl -s -X GET "$BASE_URL/api/inventory/items?page=1&perPage=10" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.success, .data.items | length'

# Test 5: GET /api/sales
echo "Test 5: GET /api/sales"
curl -s -X GET "$BASE_URL/api/sales?page=1&perPage=10" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.success, .data.sales | length'

echo ""
echo "=== Test Complete ==="
