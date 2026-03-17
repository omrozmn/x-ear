#!/bin/bash

set -e

echo "=== Testing Batch 2 - More Endpoints ==="

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

# Create test party for dependencies
PARTY=$(curl -s -X POST http://localhost:5003/api/parties \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"phone\": \"+905$(date +%s | tail -c 10)\",
    \"email\": \"test$(date +%s)@example.com\",
    \"tcNumber\": \"$(python3 -c 'import random; print(random.randint(10000000000, 99999999999))')\"
  }")

PARTY_ID=$(echo "$PARTY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('id', ''))" 2>/dev/null || echo "")

echo "Party ID: $PARTY_ID"

# Test 1: POST /api/appointments
echo -e "\n=== Test 1: POST /api/appointments ==="
curl -s -X POST http://localhost:5003/api/appointments \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: appt-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"appointmentDate\": \"2025-03-01T10:00:00Z\",
    \"type\": \"consultation\",
    \"status\": \"scheduled\"
  }" | python3 -m json.tool | head -20

# Test 2: GET /api/appointments
echo -e "\n=== Test 2: GET /api/appointments ==="
curl -s http://localhost:5003/api/appointments \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 3: POST /api/devices
echo -e "\n=== Test 3: POST /api/devices ==="
curl -s -X POST http://localhost:5003/api/devices \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: device-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"brand\": \"TestBrand\",
    \"model\": \"TestModel\",
    \"serialNumber\": \"SN$(date +%s)\"
  }" | python3 -m json.tool | head -20

# Test 4: GET /api/devices
echo -e "\n=== Test 4: GET /api/devices ==="
curl -s http://localhost:5003/api/devices \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 5: POST /api/suppliers
echo -e "\n=== Test 5: POST /api/suppliers ==="
curl -s -X POST http://localhost:5003/api/suppliers \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: supplier-$(date +%s)" \
  -d "{
    \"name\": \"Test Supplier $(date +%s)\",
    \"contactPerson\": \"John Doe\",
    \"phone\": \"+905551234567\"
  }" | python3 -m json.tool | head -20

# Test 6: GET /api/suppliers
echo -e "\n=== Test 6: GET /api/suppliers ==="
curl -s http://localhost:5003/api/suppliers \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 7: GET /api/dashboard
echo -e "\n=== Test 7: GET /api/dashboard ==="
curl -s http://localhost:5003/api/dashboard \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 8: GET /api/settings
echo -e "\n=== Test 8: GET /api/settings ==="
curl -s http://localhost:5003/api/settings \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 9: POST /api/roles
echo -e "\n=== Test 9: POST /api/roles ==="
curl -s -X POST http://localhost:5003/api/roles \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: role-$(date +%s)" \
  -d "{
    \"name\": \"Test Role $(date +%s)\",
    \"permissions\": [\"parties.view\"]
  }" | python3 -m json.tool | head -20

# Test 10: GET /api/roles
echo -e "\n=== Test 10: GET /api/roles ==="
curl -s http://localhost:5003/api/roles \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

echo -e "\n=== Batch 2 Complete ==="
