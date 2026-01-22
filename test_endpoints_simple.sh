#!/bin/bash

TOKEN=$(cat /tmp/tenant_token.txt)
BASE="http://localhost:5003/api"

echo "========================================="
echo "BACKEND ENDPOINT TEST - COMPREHENSIVE"
echo "========================================="
echo ""

test_get() {
    local endpoint=$1
    local name=$2
    echo "Testing: $name"
    result=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE$endpoint")
    code="${result: -3}"
    body="${result:0:${#result}-3}"
    success=$(echo "$body" | jq -r '.success // false' 2>/dev/null)
    
    if [ "$code" = "200" ] && [ "$success" = "true" ]; then
        count=$(echo "$body" | jq -r '.data | length // 0' 2>/dev/null)
        echo "  ✅ $code - Success - Items: $count"
    else
        error=$(echo "$body" | jq -r '.error.message // .message // "Unknown"' 2>/dev/null)
        echo "  ❌ $code - Error: $error"
    fi
    echo ""
}

# Test all major endpoints
test_get "/parties?page=1&per_page=5" "1. Parties"
test_get "/sales?page=1&per_page=5" "2. Sales"
test_get "/inventory?page=1&per_page=5" "3. Inventory"
test_get "/appointments?page=1&per_page=5" "4. Appointments"
test_get "/devices?page=1&per_page=5" "5. Devices"
test_get "/invoices?page=1&per_page=5" "6. Invoices"
test_get "/campaigns?page=1&per_page=5" "7. Campaigns"
test_get "/branches" "8. Branches"
test_get "/users/me" "9. Current User"
test_get "/roles" "10. Roles"
test_get "/payments?page=1&per_page=5" "11. Payments"
test_get "/suppliers?page=1&per_page=5" "12. Suppliers"
test_get "/notifications?page=1&per_page=5" "13. Notifications"
test_get "/sms/balance" "14. SMS Balance"
test_get "/reports/dashboard" "15. Dashboard Report"

echo "========================================="
echo "TEST COMPLETED"
echo "========================================="
