#!/bin/bash
BASE_URL="http://localhost:5003"

# 1. Admin login
admin_res=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@xear.com","password":"admin123"}')
ADMIN_TOKEN=$(echo $admin_res | jq -r '.data.token')
echo "Admin Token: ${ADMIN_TOKEN:0:50}..."

# 2. Test admin endpoint WITHOUT tenant context
echo -e "\n=== Test 1: Admin endpoint with admin token ==="
curl -s -X GET "$BASE_URL/api/admin/campaigns" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.error.message // .message // "OK"'

# 3. Test admin endpoint WITH tenant impersonation
echo -e "\n=== Test 2: Switch tenant ==="
switch_res=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"targetTenantId":"938ab3ec-192a-4f89-8a63-6941212e2f2a"}')
TENANT_TOKEN=$(echo $switch_res | jq -r '.data.accessToken // .accessToken')
echo "Tenant Token: ${TENANT_TOKEN:0:50}..."

echo -e "\n=== Test 3: Admin endpoint with tenant token ==="
curl -s -X GET "$BASE_URL/api/admin/campaigns" \
    -H "Authorization: Bearer $TENANT_TOKEN" | jq -r '.error.message // .message // "OK"'
