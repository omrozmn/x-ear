#!/bin/bash

set -e

echo "=== Testing Batch 6 - Appointments & Devices ==="

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

# Create a party first for appointments
PARTY_ID=$(curl -s -X POST http://localhost:5003/api/parties \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"Patient\",
    \"phone\": \"+9055512$(date +%s | tail -c 6)\",
    \"tcNo\": \"$(date +%s)12345\"
  }" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")

echo "Created party: $PARTY_ID"

# Test 1: POST /api/appointments
echo -e "\n=== Test 1: POST /api/appointments ==="
curl -s -X POST http://localhost:5003/api/appointments \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: appt-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"appointmentType\": \"hearing_test\",
    \"scheduledAt\": \"2026-03-01T10:00:00Z\",
    \"notes\": \"Initial consultation\"
  }" | python3 -m json.tool

# Test 2: GET /api/appointments (list)
echo -e "\n=== Test 2: GET /api/appointments ==="
curl -s http://localhost:5003/api/appointments \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 3: GET /api/devices (list)
echo -e "\n=== Test 3: GET /api/devices ==="
curl -s http://localhost:5003/api/devices \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 4: POST /api/devices
echo -e "\n=== Test 4: POST /api/devices ==="
curl -s -X POST http://localhost:5003/api/devices \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: device-$(date +%s)" \
  -d '{
    "name": "Test Hearing Aid",
    "model": "HA-2000",
    "manufacturer": "TestCorp",
    "deviceType": "hearing_aid"
  }' | python3 -m json.tool

# Test 5: GET /api/suppliers (list)
echo -e "\n=== Test 5: GET /api/suppliers ==="
curl -s http://localhost:5003/api/suppliers \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 6: POST /api/suppliers
echo -e "\n=== Test 6: POST /api/suppliers ==="
curl -s -X POST http://localhost:5003/api/suppliers \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: supplier-$(date +%s)" \
  -d '{
    "name": "Test Supplier",
    "contactPerson": "John Doe",
    "phone": "+905551234567",
    "email": "supplier@test.com"
  }' | python3 -m json.tool

# Test 7: GET /api/hearing-profiles
echo -e "\n=== Test 7: GET /api/hearing-profiles ==="
curl -s http://localhost:5003/api/hearing-profiles \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 8: POST /api/hearing-profiles
echo -e "\n=== Test 8: POST /api/hearing-profiles ==="
curl -s -X POST http://localhost:5003/api/hearing-profiles \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: profile-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"sgkNumber\": \"12345678901\",
    \"eligibilityScheme\": \"over18_working\"
  }" | python3 -m json.tool

# Test 9: GET /api/timeline
echo -e "\n=== Test 9: GET /api/timeline ==="
curl -s "http://localhost:5003/api/timeline?partyId=$PARTY_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 10: GET /api/dashboard/stats
echo -e "\n=== Test 10: GET /api/dashboard/stats ==="
curl -s http://localhost:5003/api/dashboard/stats \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

echo -e "\n=== Batch 6 Complete ==="
