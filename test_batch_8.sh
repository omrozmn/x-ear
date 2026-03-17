#!/bin/bash

set -e

echo "=== Testing Batch 8 - Party Operations & Search ==="

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

# Create a party for testing
PARTY_ID=$(curl -s -X POST http://localhost:5003/api/parties \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d "{
    \"firstName\": \"Search\",
    \"lastName\": \"Test\",
    \"phone\": \"+9055512$(date +%s | tail -c 6)\",
    \"tcNo\": \"$(date +%s)12345\"
  }" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")

echo "Created party: $PARTY_ID"

# Test 1: GET /api/parties/{id}
echo -e "\n=== Test 1: GET /api/parties/{id} ==="
curl -s "http://localhost:5003/api/parties/$PARTY_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool

# Test 2: PUT /api/parties/{id}
echo -e "\n=== Test 2: PUT /api/parties/{id} ==="
curl -s -X PUT "http://localhost:5003/api/parties/$PARTY_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: update-$(date +%s)" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name"
  }' | python3 -m json.tool

# Test 3: GET /api/parties/search
echo -e "\n=== Test 3: GET /api/parties/search ==="
curl -s "http://localhost:5003/api/parties/search?q=Updated" \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 4: POST /api/parties/{id}/roles
echo -e "\n=== Test 4: POST /api/parties/{id}/roles ==="
curl -s -X POST "http://localhost:5003/api/parties/$PARTY_ID/roles" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: role-$(date +%s)" \
  -d '{
    "roleCode": "CUSTOMER"
  }' | python3 -m json.tool

# Test 5: GET /api/parties/{id}/roles
echo -e "\n=== Test 5: GET /api/parties/{id}/roles ==="
curl -s "http://localhost:5003/api/parties/$PARTY_ID/roles" \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool

# Test 6: GET /api/parties/{id}/hearing-profile
echo -e "\n=== Test 6: GET /api/parties/{id}/hearing-profile ==="
curl -s "http://localhost:5003/api/parties/$PARTY_ID/hearing-profile" \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool

# Test 7: PUT /api/parties/{id}/hearing-profile
echo -e "\n=== Test 7: PUT /api/parties/{id}/hearing-profile ==="
curl -s -X PUT "http://localhost:5003/api/parties/$PARTY_ID/hearing-profile" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: profile-$(date +%s)" \
  -d '{
    "sgkNumber": "12345678901",
    "eligibilityScheme": "over18_working"
  }' | python3 -m json.tool

# Test 8: GET /api/parties/{id}/sales
echo -e "\n=== Test 8: GET /api/parties/{id}/sales ==="
curl -s "http://localhost:5003/api/parties/$PARTY_ID/sales" \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 9: GET /api/parties/{id}/appointments
echo -e "\n=== Test 9: GET /api/parties/{id}/appointments ==="
curl -s "http://localhost:5003/api/parties/$PARTY_ID/appointments" \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 10: GET /api/parties/{id}/devices
echo -e "\n=== Test 10: GET /api/parties/{id}/devices ==="
curl -s "http://localhost:5003/api/parties/$PARTY_ID/devices" \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

echo -e "\n=== Batch 8 Complete ==="
