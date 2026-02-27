#!/bin/bash

set -e

echo "=== Testing Batch 3 - Admin & Advanced Endpoints ==="

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

# Test 1: GET /api/admin/tenants
echo -e "\n=== Test 1: GET /api/admin/tenants ==="
curl -s http://localhost:5003/api/admin/tenants \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Test 2: GET /api/admin/dashboard
echo -e "\n=== Test 2: GET /api/admin/dashboard ==="
curl -s http://localhost:5003/api/admin/dashboard \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Test 3: GET /api/admin/plans
echo -e "\n=== Test 3: GET /api/admin/plans ==="
curl -s http://localhost:5003/api/admin/plans \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Test 4: GET /api/admin/addons
echo -e "\n=== Test 4: GET /api/admin/addons ==="
curl -s http://localhost:5003/api/admin/addons \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Test 5: GET /api/admin/analytics
echo -e "\n=== Test 5: GET /api/admin/analytics ==="
curl -s http://localhost:5003/api/admin/analytics \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Test 6: GET /api/plans
echo -e "\n=== Test 6: GET /api/plans ==="
curl -s http://localhost:5003/api/plans \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 7: GET /api/addons
echo -e "\n=== Test 7: GET /api/addons ==="
curl -s http://localhost:5003/api/addons \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 8: GET /api/subscriptions
echo -e "\n=== Test 8: GET /api/subscriptions ==="
curl -s http://localhost:5003/api/subscriptions \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 9: GET /api/invoices
echo -e "\n=== Test 9: GET /api/invoices ==="
curl -s http://localhost:5003/api/invoices \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 10: GET /api/payments
echo -e "\n=== Test 10: GET /api/payments ==="
curl -s http://localhost:5003/api/payments \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 11: GET /api/notifications
echo -e "\n=== Test 11: GET /api/notifications ==="
curl -s http://localhost:5003/api/notifications \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 12: GET /api/activity-logs
echo -e "\n=== Test 12: GET /api/activity-logs ==="
curl -s http://localhost:5003/api/activity-logs \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 13: GET /api/permissions
echo -e "\n=== Test 13: GET /api/permissions ==="
curl -s http://localhost:5003/api/permissions \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 14: GET /api/timeline
echo -e "\n=== Test 14: GET /api/timeline ==="
curl -s http://localhost:5003/api/timeline \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 15: GET /api/reports/overview
echo -e "\n=== Test 15: GET /api/reports/overview ==="
curl -s http://localhost:5003/api/reports/overview \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

echo -e "\n=== Batch 3 Complete ==="
