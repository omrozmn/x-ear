#!/bin/bash

# Get token
TOKEN=$(cat /tmp/tenant_token.txt)
BASE_URL="http://localhost:5003/api"

echo "==================================="
echo "COMPREHENSIVE ENDPOINT TEST"
echo "==================================="
echo ""

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local name=$4
    
    echo "Testing: $name"
    echo "  Method: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -H "Idempotency-Key: test-$(date +%s)-$RANDOM" \
            -d "$data" 2>/dev/null)
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -H "Idempotency-Key: test-$(date +%s)-$RANDOM" \
            -d "$data" 2>/dev/null)
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Idempotency-Key: test-$(date +%s)-$RANDOM" \
            2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    success=$(echo "$body" | jq -r '.success // "unknown"' 2>/dev/null)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        if [ "$success" = "true" ]; then
            echo "  ✅ Status: $http_code - Success: $success"
        else
            error_msg=$(echo "$body" | jq -r '.error.message // .message // "No error message"' 2>/dev/null)
            echo "  ⚠️  Status: $http_code - Success: $success - Error: $error_msg"
        fi
    else
        error_msg=$(echo "$body" | jq -r '.error.message // .message // "No error message"' 2>/dev/null)
        echo "  ❌ Status: $http_code - Error: $error_msg"
    fi
    echo ""
}

# 1. PARTIES (Already tested - just verify)
echo "1. PARTIES ENDPOINTS"
test_endpoint "GET" "/parties?page=1&per_page=5" "" "List Parties"

# 2. SALES
echo "2. SALES ENDPOINTS"
test_endpoint "GET" "/sales?page=1&per_page=5" "" "List Sales"

# 3. INVENTORY
echo "3. INVENTORY ENDPOINTS"
test_endpoint "GET" "/inventory?page=1&per_page=5" "" "List Inventory"

# 4. APPOINTMENTS
echo "4. APPOINTMENTS ENDPOINTS"
test_endpoint "GET" "/appointments?page=1&per_page=5" "" "List Appointments"

# 5. DEVICES
echo "5. DEVICES ENDPOINTS"
test_endpoint "GET" "/devices?page=1&per_page=5" "" "List Devices"

# 6. INVOICES
echo "6. INVOICES ENDPOINTS"
test_endpoint "GET" "/invoices?page=1&per_page=5" "" "List Invoices"

# 7. SMS
echo "7. SMS ENDPOINTS"
test_endpoint "GET" "/sms/balance" "" "Get SMS Balance"

# 8. CAMPAIGNS
echo "8. CAMPAIGNS ENDPOINTS"
test_endpoint "GET" "/campaigns?page=1&per_page=5" "" "List Campaigns"

# 9. BRANCHES
echo "9. BRANCHES ENDPOINTS"
test_endpoint "GET" "/branches" "" "List Branches"

# 10. REPORTS
echo "10. REPORTS ENDPOINTS"
test_endpoint "GET" "/reports/dashboard" "" "Dashboard Report"

# 11. USERS
echo "11. USERS ENDPOINTS"
test_endpoint "GET" "/users/me" "" "Get Current User"

# 12. ROLES
echo "12. ROLES ENDPOINTS"
test_endpoint "GET" "/roles" "" "List Roles"

# 13. PAYMENTS
echo "13. PAYMENTS ENDPOINTS"
test_endpoint "GET" "/payments?page=1&per_page=5" "" "List Payments"

# 14. SUPPLIERS
echo "14. SUPPLIERS ENDPOINTS"
test_endpoint "GET" "/suppliers?page=1&per_page=5" "" "List Suppliers"

# 15. NOTIFICATIONS
echo "15. NOTIFICATIONS ENDPOINTS"
test_endpoint "GET" "/notifications?page=1&per_page=5" "" "List Notifications"

echo "==================================="
echo "TEST COMPLETED"
echo "==================================="
