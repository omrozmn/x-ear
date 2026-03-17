#!/bin/bash
# Debug Authentication Flow

BASE_URL="http://localhost:5003"
ADMIN_EMAIL="admin@xear.com"
ADMIN_PASSWORD="admin123"

echo "=== Step 1: Admin Login ==="
admin_res=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: debug-$RANDOM" \
  -d '{"email":"'$ADMIN_EMAIL'","password":"'$ADMIN_PASSWORD'"}')

echo "Admin login response:"
echo "$admin_res" | jq '.'

ADMIN_TOKEN=$(echo "$admin_res" | jq -r '.data.token')
echo ""
echo "ADMIN_TOKEN: $ADMIN_TOKEN"

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo "ERROR: Admin authentication failed!"
    exit 1
fi

echo ""
echo "=== Step 2: Get Tenants ==="
tenants_res=$(curl -s -X GET "$BASE_URL/api/admin/tenants" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Tenants response:"
echo "$tenants_res" | jq '.'

# Get first tenant ID
TENANT_ID=$(echo "$tenants_res" | jq -r '.data.tenants[0].id // .data[0].id // empty' | head -n 1)
echo ""
echo "Using TENANT_ID: $TENANT_ID"

if [ -z "$TENANT_ID" ] || [ "$TENANT_ID" = "null" ]; then
    echo "ERROR: No tenant found!"
    exit 1
fi

echo ""
echo "=== Step 3: Switch to Tenant ==="
switch_res=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: switch-$RANDOM" \
  -d '{"targetTenantId":"'$TENANT_ID'"}')

echo "Switch tenant response:"
echo "$switch_res" | jq '.'

TENANT_TOKEN=$(echo "$switch_res" | jq -r '.data.accessToken // .data.access_token // .accessToken')
echo ""
echo "TENANT_TOKEN: $TENANT_TOKEN"

if [ "$TENANT_TOKEN" = "null" ] || [ -z "$TENANT_TOKEN" ]; then
    echo "ERROR: Tenant switch failed!"
    exit 1
fi

echo ""
echo "=== Step 4: Test TENANT_TOKEN with /api/parties ==="
parties_res=$(curl -s -X GET "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json")

echo "Parties response:"
echo "$parties_res" | jq '.'

echo ""
echo "=== Step 5: Test TENANT_TOKEN with /api/campaigns ==="
campaigns_res=$(curl -s -X GET "$BASE_URL/api/campaigns" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json")

echo "Campaigns response:"
echo "$campaigns_res" | jq '.'

echo ""
echo "=== Step 6: Test TENANT_TOKEN with /api/ai/status ==="
ai_status_res=$(curl -s -X GET "$BASE_URL/api/ai/status" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json")

echo "AI status response:"
echo "$ai_status_res" | jq '.'

echo ""
echo "=== Step 7: Decode TENANT_TOKEN (header.payload only) ==="
# Extract payload (second part of JWT)
PAYLOAD=$(echo "$TENANT_TOKEN" | cut -d'.' -f2)
# Add padding if needed
case $((${#PAYLOAD} % 4)) in
  2) PAYLOAD="${PAYLOAD}==" ;;
  3) PAYLOAD="${PAYLOAD}=" ;;
esac
echo "Token payload:"
echo "$PAYLOAD" | base64 -d 2>/dev/null | jq '.' || echo "Failed to decode"

echo ""
echo "=== Summary ==="
echo "ADMIN_TOKEN works: $([ ! -z "$ADMIN_TOKEN" ] && echo 'YES' || echo 'NO')"
echo "TENANT_TOKEN obtained: $([ ! -z "$TENANT_TOKEN" ] && echo 'YES' || echo 'NO')"
echo "Parties endpoint: $(echo "$parties_res" | jq -r 'if .success == true then "PASS" else "FAIL" end')"
echo "Campaigns endpoint: $(echo "$campaigns_res" | jq -r 'if .success == true then "PASS" else "FAIL" end')"
echo "AI status endpoint: $(echo "$ai_status_res" | jq -r 'if .success == true then "PASS" else "FAIL" end')"
