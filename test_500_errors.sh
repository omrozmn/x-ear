#!/bin/bash

echo "Getting admin token..."
TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: login-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

echo "Token: ${TOKEN:0:20}..."

echo -e "\nGetting tenant..."
TENANT_ID=$(curl -s http://localhost:5003/api/admin/tenants \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['tenants'][0]['id'])")

echo "Tenant: $TENANT_ID"

echo -e "\nSwitching to tenant..."
TENANT_TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/debug/switch-tenant \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: switch-$(date +%s)" \
  -d "{\"targetTenantId\": \"$TENANT_ID\"}" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

echo "Tenant Token: ${TENANT_TOKEN:0:20}..."

echo -e "\n=== Test 1: POST /api/users (500 error) ==="
curl -s -X POST http://localhost:5003/api/users \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: user-$(date +%s)" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test123!",
    "username": "testuser123",
    "firstName": "Test",
    "lastName": "User"
  }' | python3 -m json.tool | head -20

echo -e "\n✓ Test completed"
