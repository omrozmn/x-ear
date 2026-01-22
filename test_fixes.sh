#!/bin/bash

BASE_URL="http://localhost:5003/api"
ADMIN_EMAIL="tenantadmin@test.com"
ADMIN_PASSWORD="Test123!"

# Login
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $login_response | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Testing Fixed Endpoints:"
echo "========================"
echo ""

# Test settings
echo "1. GET /settings"
curl -s -X GET "$BASE_URL/settings" \
    -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"Status: {'✓ PASS' if d.get('success') else '✗ FAIL ' + str(d.get('error',{}).get('message',''))}\")"

echo "2. GET /settings/pricing"
curl -s -X GET "$BASE_URL/settings/pricing" \
    -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"Status: {'✓ PASS' if d.get('success') else '✗ FAIL ' + str(d.get('error',{}).get('message',''))}\")"

# Test notifications
echo "3. GET /notifications/stats"
curl -s -X GET "$BASE_URL/notifications/stats" \
    -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"Status: {'✓ PASS' if d.get('success') else '✗ FAIL ' + str(d.get('error',{}).get('message',''))}\")"

echo "4. GET /notifications/settings"
curl -s -X GET "$BASE_URL/notifications/settings" \
    -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"Status: {'✓ PASS' if d.get('success') else '✗ FAIL ' + str(d.get('error',{}).get('message',''))}\")"

