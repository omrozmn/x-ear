#!/bin/bash

set -e

echo "=== Testing Batch 4 - User Management & Settings ==="

# Get tokens
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

# Test 1: GET /api/users
echo -e "\n=== Test 1: GET /api/users ==="
curl -s http://localhost:5003/api/users \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 2: POST /api/users (Create user)
echo -e "\n=== Test 2: POST /api/users ==="
RANDOM_NUM=$(date +%s)
curl -s -X POST http://localhost:5003/api/users \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: user-$RANDOM_NUM" \
  -d "{
    \"email\": \"user${RANDOM_NUM}@test.com\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"password\": \"Test123!\",
    \"roleIds\": []
  }" | python3 -m json.tool

# Test 3: GET /api/settings
echo -e "\n=== Test 3: GET /api/settings ==="
curl -s http://localhost:5003/api/settings \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 4: PUT /api/settings (Update settings)
echo -e "\n=== Test 4: PUT /api/settings ==="
curl -s -X PUT http://localhost:5003/api/settings \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: settings-$(date +%s)" \
  -d '{
    "companyName": "Test Clinic",
    "timezone": "Europe/Istanbul"
  }' | python3 -m json.tool

# Test 5: GET /api/branches
echo -e "\n=== Test 5: GET /api/branches ==="
curl -s http://localhost:5003/api/branches \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 6: GET /api/campaigns
echo -e "\n=== Test 6: GET /api/campaigns ==="
curl -s http://localhost:5003/api/campaigns \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 7: GET /api/roles
echo -e "\n=== Test 7: GET /api/roles ==="
curl -s http://localhost:5003/api/roles \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 8: POST /api/roles (Create role)
echo -e "\n=== Test 8: POST /api/roles ==="
curl -s -X POST http://localhost:5003/api/roles \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: role-$(date +%s)" \
  -d '{
    "name": "Test Role",
    "description": "Test role description",
    "permissions": ["parties.view"]
  }' | python3 -m json.tool

# Test 9: GET /api/permissions
echo -e "\n=== Test 9: GET /api/permissions ==="
curl -s http://localhost:5003/api/permissions \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 10: GET /api/audit-logs
echo -e "\n=== Test 10: GET /api/audit-logs ==="
curl -s http://localhost:5003/api/audit-logs \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

echo -e "\n=== Batch 4 Complete ==="
