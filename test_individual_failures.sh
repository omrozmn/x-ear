#!/bin/bash

BASE_URL="http://localhost:5003/api"
ADMIN_EMAIL="tenantadmin@test.com"
ADMIN_PASSWORD="Test123!"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Login
echo "Authenticating..."
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $login_response | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Login failed!"
    exit 1
fi

echo "Token: ${TOKEN:0:20}..."
echo ""

# Test each failing endpoint individually
test_endpoint() {
    local num=$1
    local method=$2
    local endpoint=$3
    local description=$4
    
    echo -e "${BLUE}[$num] Testing: $description${NC}"
    echo "  $method $endpoint"
    
    response=$(curl -s -w "\n%{http_code}" -X $method \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        "$BASE_URL$endpoint" 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" =~ ^(200|201|204)$ ]]; then
        echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code)"
    else
        echo -e "  ${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "  Full Response:"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    fi
    echo ""
}

echo "========================================="
echo "  Testing Individual Failures"
echo "========================================="
echo ""

# 1-2: Tenant Management (404)
test_endpoint "1" "GET" "/tenant/users" "List Tenant Users"
test_endpoint "2" "GET" "/tenant/company" "Get Company Info"

# 3-4: Settings (500)
test_endpoint "3" "GET" "/settings" "Get Settings"
test_endpoint "4" "GET" "/settings/pricing" "Pricing Settings"

# 5-6: Notifications (422)
test_endpoint "5" "GET" "/notifications/stats" "Notification Stats"
test_endpoint "6" "GET" "/notifications/settings" "Notification Settings"

# 7: Invoice Settings (500)
test_endpoint "7" "GET" "/invoice-settings" "Invoice Settings"

# 8-12: SMS (500)
test_endpoint "8" "GET" "/sms/config" "SMS Config"
test_endpoint "9" "GET" "/sms/headers" "SMS Headers"
test_endpoint "10" "GET" "/sms/packages" "SMS Packages"
test_endpoint "11" "GET" "/sms/credit" "SMS Credit"
test_endpoint "12" "GET" "/sms/audiences" "SMS Audiences"

# 13: POS (500)
test_endpoint "13" "GET" "/payments/pos/paytr/config" "PayTR Config"

# 14: Apps (403)
test_endpoint "14" "GET" "/apps" "List Apps"

# 15: Affiliates (500)
test_endpoint "15" "GET" "/affiliates/list" "List Affiliates"

# 16: Audit (403)
test_endpoint "16" "GET" "/audit" "Audit Logs"

# 17-18: Appointments (404)
test_endpoint "17" "GET" "/appointments/list" "List Appointments (Alt)"
test_endpoint "18" "GET" "/appointments/availability?date=2026-01-21" "Check Availability"

