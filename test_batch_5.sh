#!/bin/bash

set -e

echo "=== Testing Batch 5 - Reports & Analytics ==="

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

# Test 1: GET /api/reports/inventory
echo -e "\n=== Test 1: GET /api/reports/inventory ==="
curl -s http://localhost:5003/api/reports/inventory \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 2: GET /api/reports/sales-summary
echo -e "\n=== Test 2: GET /api/reports/sales-summary ==="
curl -s http://localhost:5003/api/reports/sales-summary \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 3: GET /api/reports/party-analytics
echo -e "\n=== Test 3: GET /api/reports/party-analytics ==="
curl -s http://localhost:5003/api/reports/party-analytics \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 4: GET /api/analytics/dashboard
echo -e "\n=== Test 4: GET /api/analytics/dashboard ==="
curl -s http://localhost:5003/api/analytics/dashboard \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 5: GET /api/analytics/revenue
echo -e "\n=== Test 5: GET /api/analytics/revenue ==="
curl -s http://localhost:5003/api/analytics/revenue \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 6: GET /api/analytics/inventory
echo -e "\n=== Test 6: GET /api/analytics/inventory ==="
curl -s http://localhost:5003/api/analytics/inventory \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 7: GET /api/exports/parties
echo -e "\n=== Test 7: GET /api/exports/parties ==="
curl -s http://localhost:5003/api/exports/parties \
  -H "Authorization: Bearer $TENANT_TOKEN" | head -20

# Test 8: GET /api/exports/sales
echo -e "\n=== Test 8: GET /api/exports/sales ==="
curl -s http://localhost:5003/api/exports/sales \
  -H "Authorization: Bearer $TENANT_TOKEN" | head -20

# Test 9: GET /api/exports/inventory
echo -e "\n=== Test 9: GET /api/exports/inventory ==="
curl -s http://localhost:5003/api/exports/inventory \
  -H "Authorization: Bearer $TENANT_TOKEN" | head -20

# Test 10: GET /api/stats/summary
echo -e "\n=== Test 10: GET /api/stats/summary ==="
curl -s http://localhost:5003/api/stats/summary \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

echo -e "\n=== Batch 5 Complete ==="
