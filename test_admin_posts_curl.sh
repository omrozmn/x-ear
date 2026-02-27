#!/bin/bash

TOKEN=$(curl -s -X POST http://localhost:5003/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['accessToken'])")

echo "=== Testing Admin POST Endpoints with curl ==="
echo ""

# Test /api/admin/users
echo "POST /api/admin/users"
curl -s -X POST http://localhost:5003/api/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d "{\"email\":\"testuser$(date +%s)@example.com\",\"password\":\"Test123!\",\"firstName\":\"Test\",\"lastName\":\"User\"}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

# Test /api/admin/plans
echo "POST /api/admin/plans"
curl -s -X POST http://localhost:5003/api/admin/plans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"name":"Test Plan","price":99.99,"billingInterval":"monthly"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

# Test /api/admin/addons
echo "POST /api/admin/addons"
curl -s -X POST http://localhost:5003/api/admin/addons \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"name":"Test Addon","price":9.99}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

# Test /api/admin/suppliers
echo "POST /api/admin/suppliers"
curl -s -X POST http://localhost:5003/api/admin/suppliers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"companyName":"Test Supplier Co"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

# Test /api/admin/tickets
echo "POST /api/admin/tickets"
curl -s -X POST http://localhost:5003/api/admin/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"title":"Test Ticket"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

# Test /api/admin/spam-preview
echo "POST /api/admin/spam-preview"
curl -s -X POST http://localhost:5003/api/admin/spam-preview \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"subject":"Test Email","bodyText":"This is a test"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

# Test /api/admin/notifications/send
echo "POST /api/admin/notifications/send"
curl -s -X POST http://localhost:5003/api/admin/notifications/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"targetType":"user","title":"Test","message":"Test msg"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

# Test /api/admin/notifications/templates
echo "POST /api/admin/notifications/templates"
curl -s -X POST http://localhost:5003/api/admin/notifications/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"name":"test-tpl","subject":"Test","body":"Test"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

# Test /api/admin/api-keys
echo "POST /api/admin/api-keys"
curl -s -X POST http://localhost:5003/api/admin/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"tenantId":"test-tenant"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

# Test /api/admin/impersonate
echo "POST /api/admin/impersonate"
curl -s -X POST http://localhost:5003/api/admin/impersonate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"tenant_id":"test-tenant"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

# Test /api/admin/debug/switch-tenant
echo "POST /api/admin/debug/switch-tenant"
curl -s -X POST http://localhost:5003/api/admin/debug/switch-tenant \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"targetTenantId":"test-tenant"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

# Test /api/admin/complaints/process-fbl
echo "POST /api/admin/complaints/process-fbl"
curl -s -X POST http://localhost:5003/api/admin/complaints/process-fbl \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"fbl_content":"test content"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

# Test /api/admin/marketplaces/integrations
echo "POST /api/admin/marketplaces/integrations"
curl -s -X POST http://localhost:5003/api/admin/marketplaces/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"tenantId":"test-tenant","platform":"test"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

# Test /api/admin/invoices
echo "POST /api/admin/invoices"
curl -s -X POST http://localhost:5003/api/admin/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"subtotal":100,"vatAmount":18,"discountAmount":0}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ PASS' if d.get('success') else '✗ FAIL: ' + str(d.get('error',{}).get('message',''))[:60])"

echo ""
echo "=== Test Complete ==="
