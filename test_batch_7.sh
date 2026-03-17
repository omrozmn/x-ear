#!/bin/bash

set -e

echo "=== Testing Batch 7 - Invoices & Payments ==="

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

# Test 1: GET /api/invoices
echo -e "\n=== Test 1: GET /api/invoices ==="
curl -s http://localhost:5003/api/invoices \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 2: GET /api/payments (check if 307 redirect is fixed)
echo -e "\n=== Test 2: GET /api/payments ==="
curl -s -L http://localhost:5003/api/payments \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 3: GET /api/pricing/plans
echo -e "\n=== Test 3: GET /api/pricing/plans ==="
curl -s http://localhost:5003/api/pricing/plans \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 4: GET /api/pricing/devices
echo -e "\n=== Test 4: GET /api/pricing/devices ==="
curl -s http://localhost:5003/api/pricing/devices \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 5: GET /api/sgk/eligibility
echo -e "\n=== Test 5: GET /api/sgk/eligibility ==="
curl -s "http://localhost:5003/api/sgk/eligibility?tcNo=12345678901" \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 6: GET /api/sgk/schemes
echo -e "\n=== Test 6: GET /api/sgk/schemes ==="
curl -s http://localhost:5003/api/sgk/schemes \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 7: GET /api/integrations
echo -e "\n=== Test 7: GET /api/integrations ==="
curl -s http://localhost:5003/api/integrations \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 8: GET /api/integrations/birfatura/status
echo -e "\n=== Test 8: GET /api/integrations/birfatura/status ==="
curl -s http://localhost:5003/api/integrations/birfatura/status \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 9: GET /api/email/templates
echo -e "\n=== Test 9: GET /api/email/templates ==="
curl -s http://localhost:5003/api/email/templates \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 10: GET /api/sms/templates
echo -e "\n=== Test 10: GET /api/sms/templates ==="
curl -s http://localhost:5003/api/sms/templates \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

echo -e "\n=== Batch 7 Complete ==="
