#!/bin/bash

# Get admin token
TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

# Get first tenant
TENANT_ID=$(curl -s -X GET http://localhost:5003/api/admin/tenants \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; data=json.load(sys.stdin); items=data.get('data', {}).get('tenants', []); print(items[0]['id'] if items and len(items) > 0 else '')")

echo "Tenant ID: $TENANT_ID"

# Switch to tenant
TENANT_TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/debug/switch-tenant \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d "{\"targetTenantId\": \"$TENANT_ID\"}" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('accessToken', '') if data.get('data') else '')")

echo "Tenant Token: ${TENANT_TOKEN:0:50}..."

# Now test POST /api/users with tenant token
echo "Testing POST /api/users..."
curl -s -X POST http://localhost:5003/api/users \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test123!",
    "username": "testuser123",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+905551234567"
  }' | python3 -m json.tool
