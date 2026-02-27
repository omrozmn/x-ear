#!/bin/bash

BASE_URL="http://localhost:5003"
TENANT_ID="938ab3ec-192a-4f89-8a63-6941212e2f2a"

# 1. Admin login
echo "1. Admin login..."
admin_res=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$RANDOM" \
  -d '{"email":"admin@xear.com","password":"admin123"}')
ADMIN_TOKEN=$(echo "$admin_res" | jq -r '.data.token')
echo "Admin token: ${ADMIN_TOKEN:0:50}..."

# 2. Tenant switch
echo "2. Tenant switch..."
switch_res=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$RANDOM" \
  -d "{\"targetTenantId\":\"$TENANT_ID\"}")
TENANT_TOKEN=$(echo "$switch_res" | jq -r '.data.access_token // .data.accessToken')
echo "Tenant token: ${TENANT_TOKEN:0:50}..."

# 3. Test a few endpoints
echo "3. Testing endpoints..."

echo -n "  GET /api/admin/tickets ... "
http_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/admin/tickets" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Effective-Tenant-Id: $TENANT_ID")
echo "$http_code"

echo -n "  GET /api/parties ... "
http_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $TENANT_TOKEN")
echo "$http_code"

echo -n "  GET /health ... "
http_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/health")
echo "$http_code"

echo "Done!"
