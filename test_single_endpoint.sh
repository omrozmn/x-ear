#!/bin/bash

BASE_URL="http://localhost:5003"
ADMIN_EMAIL="admin@x-ear.com"
ADMIN_PASSWORD="admin123"
TARGET_TENANT_ID="938ab3ec-192a-4f89-8a63-6941212e2f2a"

# Login as admin
admin_login_response=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

ADMIN_TOKEN=$(echo $admin_login_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Switch to target tenant
switch_response=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"targetTenantId\":\"$TARGET_TENANT_ID\"}")

TOKEN=$(echo $switch_response | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Test endpoint
echo "Testing /api/admin/bounces..."
curl -v -X GET "$BASE_URL/api/admin/bounces" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" 2>&1
