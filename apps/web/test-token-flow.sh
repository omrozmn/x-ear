#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="http://localhost:5003"
ADMIN_EMAIL="admin@x-ear.com"
ADMIN_PASSWORD="admin123"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  TokenManager & Auth Flow Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"

# Test 1: Login
echo -e "\n${YELLOW}[TEST 1] Admin Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['refreshToken'])" 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ] || [ -z "$REFRESH_TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "$LOGIN_RESPONSE" | python3 -m json.tool
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   Access Token: ${ACCESS_TOKEN:0:40}..."
echo "   Refresh Token: ${REFRESH_TOKEN:0:40}..."

# Test 2: Decode tokens
echo -e "\n${YELLOW}[TEST 2] Decode & Validate Tokens${NC}"
python3 << PYTHON
import json, base64

def decode_token(token, name):
    try:
        parts = token.split('.')
        if len(parts) != 3:
            print(f"   ❌ {name}: Invalid format")
            return None
        payload = json.loads(base64.b64decode(parts[1] + '=='))
        print(f"   ✅ {name}:")
        print(f"      - sub: {payload.get('sub')}")
        print(f"      - role: {payload.get('role')}")
        print(f"      - type: {payload.get('type')}")
        print(f"      - user_type: {payload.get('user_type')}")
        print(f"      - exp: {payload.get('exp')}")
        return payload
    except Exception as e:
        print(f"   ❌ {name}: {e}")
        return None

access_payload = decode_token("$ACCESS_TOKEN", "Access Token")
refresh_payload = decode_token("$REFRESH_TOKEN", "Refresh Token")

if access_payload and refresh_payload:
    is_admin = str(access_payload.get('sub', '')).startswith('admin_')
    print(f"\n   Is Admin: {is_admin}")
    print(f"   Access Token Type: {access_payload.get('type')}")
    print(f"   Refresh Token Type: {refresh_payload.get('type')}")
PYTHON

# Test 3: Get current user
echo -e "\n${YELLOW}[TEST 3] Get Current User (with Access Token)${NC}"
USER_RESPONSE=$(curl -s -X GET "$API_BASE/api/users/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

USER_EMAIL=$(echo "$USER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['email'])" 2>/dev/null)
USER_ROLE=$(echo "$USER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['role'])" 2>/dev/null)

if [ -z "$USER_EMAIL" ]; then
  echo -e "${RED}❌ Failed to get current user${NC}"
  echo "$USER_RESPONSE" | python3 -m json.tool
else
  echo -e "${GREEN}✅ Got current user${NC}"
  echo "   Email: $USER_EMAIL"
  echo "   Role: $USER_ROLE"
fi

# Test 4: Token Refresh
echo -e "\n${YELLOW}[TEST 4] Token Refresh (with Refresh Token)${NC}"
REFRESH_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/refresh" \
  -H "Authorization: Bearer $REFRESH_TOKEN" \
  -H "Content-Type: application/json")

NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('access_token', data.get('accessToken', '')))" 2>/dev/null)

if [ -z "$NEW_ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ Token refresh failed${NC}"
  echo "$REFRESH_RESPONSE" | python3 -m json.tool
else
  echo -e "${GREEN}✅ Token refresh successful${NC}"
  echo "   New Access Token: ${NEW_ACCESS_TOKEN:0:40}..."
  
  # Verify new token works
  VERIFY_RESPONSE=$(curl -s -X GET "$API_BASE/api/users/me" \
    -H "Authorization: Bearer $NEW_ACCESS_TOKEN")
  
  VERIFY_EMAIL=$(echo "$VERIFY_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['email'])" 2>/dev/null)
  
  if [ "$VERIFY_EMAIL" = "$USER_EMAIL" ]; then
    echo -e "${GREEN}✅ New token is valid${NC}"
  else
    echo -e "${RED}❌ New token is invalid${NC}"
  fi
fi

# Test 5: Test with expired token (simulate)
echo -e "\n${YELLOW}[TEST 5] Test Dashboard Endpoint${NC}"
DASHBOARD_RESPONSE=$(curl -s -X GET "$API_BASE/api/dashboard" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

DASHBOARD_STATUS=$(echo "$DASHBOARD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)

if [ "$DASHBOARD_STATUS" = "True" ]; then
  echo -e "${GREEN}✅ Dashboard endpoint accessible${NC}"
else
  echo -e "${RED}❌ Dashboard endpoint failed${NC}"
  echo "$DASHBOARD_RESPONSE" | python3 -m json.tool | head -20
fi

# Test 6: Test admin debug endpoint
echo -e "\n${YELLOW}[TEST 6] Test Admin Debug Endpoint${NC}"
DEBUG_RESPONSE=$(curl -s -X GET "$API_BASE/api/admin/debug/available-roles" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

DEBUG_SUCCESS=$(echo "$DEBUG_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)

if [ "$DEBUG_SUCCESS" = "True" ]; then
  echo -e "${GREEN}✅ Admin debug endpoint accessible${NC}"
  echo "$DEBUG_RESPONSE" | python3 -m json.tool | head -30
else
  echo -e "${RED}❌ Admin debug endpoint failed${NC}"
  echo "$DEBUG_RESPONSE" | python3 -m json.tool | head -20
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✅ All tests completed${NC}"
echo -e "${BLUE}========================================${NC}"
