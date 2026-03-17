#!/bin/bash

set -e

echo "=== Testing Batch 10 - Admin Operations ==="

# Get admin token
TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: login-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

echo "Admin token ready!"

# Test 1: GET /api/admin/users
echo -e "\n=== Test 1: GET /api/admin/users ==="
curl -s http://localhost:5003/api/admin/users \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Test 2: POST /api/admin/users
echo -e "\n=== Test 2: POST /api/admin/users ==="
RANDOM_NUM=$(date +%s)
curl -s -X POST http://localhost:5003/api/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: admin-user-$RANDOM_NUM" \
  -d "{
    \"email\": \"admin${RANDOM_NUM}@test.com\",
    \"password\": \"Admin123!\",
    \"firstName\": \"Admin\",
    \"lastName\": \"User\"
  }" | python3 -m json.tool

# Test 3: GET /api/admin/system/health
echo -e "\n=== Test 3: GET /api/admin/system/health ==="
curl -s http://localhost:5003/api/admin/system/health \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Test 4: GET /api/admin/system/metrics
echo -e "\n=== Test 4: GET /api/admin/system/metrics ==="
curl -s http://localhost:5003/api/admin/system/metrics \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Test 5: GET /api/admin/audit-logs
echo -e "\n=== Test 5: GET /api/admin/audit-logs ==="
curl -s http://localhost:5003/api/admin/audit-logs \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Test 6: GET /api/admin/feature-flags
echo -e "\n=== Test 6: GET /api/admin/feature-flags ==="
curl -s http://localhost:5003/api/admin/feature-flags \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Test 7: PUT /api/admin/feature-flags/{flag}
echo -e "\n=== Test 7: PUT /api/admin/feature-flags/test_flag ==="
curl -s -X PUT http://localhost:5003/api/admin/feature-flags/test_flag \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: flag-$(date +%s)" \
  -d '{
    "enabled": true
  }' | python3 -m json.tool

# Test 8: GET /api/admin/settings
echo -e "\n=== Test 8: GET /api/admin/settings ==="
curl -s http://localhost:5003/api/admin/settings \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Test 9: PUT /api/admin/settings
echo -e "\n=== Test 9: PUT /api/admin/settings ==="
curl -s -X PUT http://localhost:5003/api/admin/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: settings-$(date +%s)" \
  -d '{
    "maintenanceMode": false
  }' | python3 -m json.tool | head -20

# Test 10: GET /api/admin/logs
echo -e "\n=== Test 10: GET /api/admin/logs ==="
curl -s http://localhost:5003/api/admin/logs \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

echo -e "\n=== Batch 10 Complete ==="
