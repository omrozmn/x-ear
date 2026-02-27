#!/bin/bash

BASE_URL="http://localhost:5003"
ADMIN_EMAIL="admin@xear.com"
ADMIN_PASSWORD="admin123"
TARGET_TENANT_ID="938ab3ec-192a-4f89-8a63-6941212e2f2a"

echo "=== Testing Auth Flow ==="

# 1. Admin Login
echo -e "\n1. Admin Login..."
admin_login_response=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

echo "Response: $admin_login_response" | head -c 200
echo ""

ADMIN_TOKEN=$(echo $admin_login_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Admin Token: ${ADMIN_TOKEN:0:50}..."

if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Admin login FAILED!"
    exit 1
fi
echo "✅ Admin login OK"

# 2. Test Admin Token
echo -e "\n2. Testing Admin Token..."
admin_test=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/admin/dashboard" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
admin_status=$(echo "$admin_test" | tail -n1)
echo "Admin Dashboard Status: $admin_status"

if [ "$admin_status" != "200" ]; then
    echo "❌ Admin token NOT working!"
    echo "Response: $(echo "$admin_test" | head -n -1 | head -c 200)"
else
    echo "✅ Admin token working"
fi

# 3. Tenant Impersonation
echo -e "\n3. Tenant Impersonation..."
switch_response=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"targetTenantId\":\"$TARGET_TENANT_ID\"}")

echo "Switch Response: $switch_response" | head -c 200
echo ""

TENANT_TOKEN=$(echo $switch_response | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "Tenant Token: ${TENANT_TOKEN:0:50}..."

if [ -z "$TENANT_TOKEN" ]; then
    echo "❌ Tenant impersonation FAILED!"
    echo "Full response: $switch_response"
    exit 1
fi
echo "✅ Tenant impersonation OK"

# 4. Test Tenant Token
echo -e "\n4. Testing Tenant Token..."
tenant_test=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/dashboard" \
    -H "Authorization: Bearer $TENANT_TOKEN")
tenant_status=$(echo "$tenant_test" | tail -n1)
echo "Tenant Dashboard Status: $tenant_status"

if [ "$tenant_status" != "200" ]; then
    echo "❌ Tenant token NOT working!"
    echo "Response: $(echo "$tenant_test" | head -n -1 | head -c 200)"
else
    echo "✅ Tenant token working"
fi

# 5. Test Idempotency
echo -e "\n5. Testing Idempotency..."
IDEMP_KEY="test-$(date +%s)-$RANDOM"
idemp_test=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/parties" \
    -H "Authorization: Bearer $TENANT_TOKEN" \
    -H "Idempotency-Key: $IDEMP_KEY")
idemp_status=$(echo "$idemp_test" | tail -n1)
echo "Parties List Status: $idemp_status"

if [ "$idemp_status" != "200" ]; then
    echo "❌ Idempotency test FAILED!"
    echo "Response: $(echo "$idemp_test" | head -n -1 | head -c 200)"
else
    echo "✅ Idempotency working"
fi

echo -e "\n=== Auth Flow Test Complete ==="
