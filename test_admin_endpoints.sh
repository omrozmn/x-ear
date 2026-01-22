#!/bin/bash

# Admin Endpoint Testing - Test with platform_admin permissions
# Tests endpoints that require admin access

BASE_URL="http://localhost:5003/api"
ADMIN_EMAIL="tenantadmin@test.com"
ADMIN_PASSWORD="Test123!"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Test result function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    TOTAL=$((TOTAL + 1))
    echo -e "\n${YELLOW}Testing:${NC} $description"
    echo "  $method $endpoint"
    
    IDEMPOTENCY_KEY="test-$(date +%s)-$RANDOM"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
            "$BASE_URL$endpoint" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
            -d "$data" \
            "$BASE_URL$endpoint" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    
    if [[ "$http_code" =~ ^(200|201|204)$ ]]; then
        echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "  ${RED}✗ FAIL${NC} (HTTP $http_code)"
        body=$(echo "$response" | sed '$d')
        echo "  Response: $body" | head -c 200
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "========================================="
echo "  X-Ear CRM - Admin Endpoint Tests"
echo "  Testing with platform_admin permissions"
echo "========================================="

# Login as admin
echo -e "\n${BLUE}[AUTH]${NC} Authenticating as admin..."
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $login_response | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Login failed!${NC}"
    echo "Response: $login_response"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated as admin${NC}"

# ============================================
# ADMIN-ONLY ENDPOINTS
# ============================================

echo -e "\n${BLUE}[TENANT MANAGEMENT]${NC} Testing Tenant Endpoints..."
test_endpoint "GET" "/tenant/users" "" "List Tenant Users"
test_endpoint "GET" "/tenant/company" "" "Get Company Info"

echo -e "\n${BLUE}[SETTINGS]${NC} Testing Settings Endpoints..."
test_endpoint "GET" "/settings" "" "Get Settings"
test_endpoint "GET" "/settings/pricing" "" "Pricing Settings"

echo -e "\n${BLUE}[NOTIFICATIONS]${NC} Testing Notification Endpoints..."
test_endpoint "GET" "/notifications/stats" "" "Notification Stats"
test_endpoint "GET" "/notifications/settings" "" "Notification Settings"

echo -e "\n${BLUE}[INVOICE SETTINGS]${NC} Testing Invoice Settings..."
test_endpoint "GET" "/invoice-settings" "" "Invoice Settings"

echo -e "\n${BLUE}[SMS]${NC} Testing SMS Endpoints..."
test_endpoint "GET" "/sms/config" "" "SMS Config"
test_endpoint "GET" "/sms/headers" "" "SMS Headers"
test_endpoint "GET" "/sms/packages" "" "SMS Packages"
test_endpoint "GET" "/sms/credit" "" "SMS Credit"
test_endpoint "GET" "/sms/audiences" "" "SMS Audiences"

echo -e "\n${BLUE}[POS]${NC} Testing POS Endpoints..."
test_endpoint "GET" "/payments/pos/paytr/config" "" "PayTR Config"

echo -e "\n${BLUE}[APPS]${NC} Testing Apps Endpoints..."
test_endpoint "GET" "/apps" "" "List Apps"

echo -e "\n${BLUE}[AFFILIATES]${NC} Testing Affiliate Endpoints..."
test_endpoint "GET" "/affiliates/list" "" "List Affiliates"

echo -e "\n${BLUE}[AUDIT]${NC} Testing Audit Endpoints..."
test_endpoint "GET" "/audit" "" "Audit Logs"

echo -e "\n${BLUE}[ACTIVITY LOGS]${NC} Testing Activity Log Endpoints..."
test_endpoint "GET" "/activity-logs?page=1&perPage=10" "" "List Activity Logs"

echo -e "\n${BLUE}[APPOINTMENTS]${NC} Testing Appointment Endpoints..."
test_endpoint "GET" "/appointments/list" "" "List Appointments (Alt)"
test_endpoint "GET" "/appointments/availability?date=2026-01-21" "" "Check Availability"

# ============================================
# ALL PREVIOUS TESTS WITH ADMIN
# ============================================

echo -e "\n${BLUE}[CORE CRUD]${NC} Testing Core CRUD Endpoints..."
test_endpoint "GET" "/parties?page=1&perPage=10" "" "List Parties"
test_endpoint "GET" "/sales?page=1&perPage=10" "" "List Sales"
test_endpoint "GET" "/inventory?page=1&per_page=10" "" "List Inventory"
test_endpoint "GET" "/appointments?page=1&per_page=10" "" "List Appointments"
test_endpoint "GET" "/devices?page=1&perPage=10" "" "List Devices"
test_endpoint "GET" "/invoices?page=1&perPage=10" "" "List Invoices"
test_endpoint "GET" "/campaigns?page=1&perPage=10" "" "List Campaigns"
test_endpoint "GET" "/branches?page=1&perPage=10" "" "List Branches"
test_endpoint "GET" "/users?page=1&perPage=10" "" "List Users"
test_endpoint "GET" "/roles" "" "List Roles"
test_endpoint "GET" "/suppliers?page=1&per_page=10" "" "List Suppliers"
test_endpoint "GET" "/notifications?page=1&perPage=10" "" "List Notifications"

echo -e "\n${BLUE}[REPORTS]${NC} Testing Report Endpoints..."
test_endpoint "GET" "/reports/overview?days=30" "" "Overview Report"
test_endpoint "GET" "/reports/patients?days=30" "" "Patients Report"
test_endpoint "GET" "/reports/financial?days=30" "" "Financial Report"
test_endpoint "GET" "/reports/campaigns?days=30" "" "Campaigns Report"
test_endpoint "GET" "/reports/revenue" "" "Revenue Report"
test_endpoint "GET" "/reports/appointments" "" "Appointments Report"

echo -e "\n${BLUE}[DASHBOARD]${NC} Testing Dashboard Endpoints..."
test_endpoint "GET" "/dashboard" "" "Main Dashboard"
test_endpoint "GET" "/dashboard/kpis" "" "Dashboard KPIs"
test_endpoint "GET" "/dashboard/recent-activity" "" "Recent Activity"
test_endpoint "GET" "/dashboard/charts/patient-trends" "" "Patient Trends"
test_endpoint "GET" "/dashboard/charts/revenue-trends" "" "Revenue Trends"
test_endpoint "GET" "/dashboard/charts/patient-distribution" "" "Patient Distribution"

echo -e "\n${BLUE}[INVENTORY ADVANCED]${NC} Testing Advanced Inventory..."
test_endpoint "GET" "/inventory/search" "" "Search Inventory"
test_endpoint "GET" "/inventory/stats" "" "Inventory Stats"
test_endpoint "GET" "/inventory/low-stock" "" "Low Stock Items"
test_endpoint "GET" "/inventory/units" "" "Inventory Units"

echo -e "\n${BLUE}[DEVICES]${NC} Testing Device Endpoints..."
test_endpoint "GET" "/devices/categories" "" "Device Categories"
test_endpoint "GET" "/devices/brands" "" "Device Brands"
test_endpoint "GET" "/devices/low-stock" "" "Low Stock Devices"

echo -e "\n${BLUE}[INVOICES]${NC} Testing Invoice Endpoints..."
test_endpoint "GET" "/invoices/print-queue" "" "Print Queue"
test_endpoint "GET" "/invoices/templates" "" "Invoice Templates"
test_endpoint "GET" "/invoice-schema" "" "Invoice Schema"

echo -e "\n${BLUE}[USERS & PERMISSIONS]${NC} Testing User Endpoints..."
test_endpoint "GET" "/users/me" "" "Get Current User"
test_endpoint "GET" "/permissions" "" "List Permissions"
test_endpoint "GET" "/permissions/my" "" "My Permissions"

echo -e "\n${BLUE}[SUPPLIERS]${NC} Testing Supplier Endpoints..."
test_endpoint "GET" "/suppliers/search?q=test" "" "Search Suppliers"
test_endpoint "GET" "/suppliers/stats" "" "Supplier Stats"

echo -e "\n${BLUE}[CONFIG]${NC} Testing Config Endpoints..."
test_endpoint "GET" "/config" "" "Get Config"
test_endpoint "GET" "/config/turnstile" "" "Turnstile Config"

echo -e "\n${BLUE}[CASH RECORDS]${NC} Testing Cash Record Endpoints..."
test_endpoint "GET" "/cash-records" "" "List Cash Records"
test_endpoint "GET" "/unified-cash-records" "" "Unified Cash Records"
test_endpoint "GET" "/unified-cash-records/summary" "" "Cash Summary"

echo -e "\n${BLUE}[PLANS]${NC} Testing Plan Endpoints..."
test_endpoint "GET" "/plans" "" "List Plans"
test_endpoint "GET" "/addons" "" "List Addons"
test_endpoint "GET" "/subscriptions/current" "" "Current Subscription"

echo -e "\n${BLUE}[SGK]${NC} Testing SGK Endpoints..."
test_endpoint "GET" "/sgk/documents" "" "List SGK Documents"
test_endpoint "GET" "/sgk/e-receipts/delivered" "" "Delivered E-Receipts"

echo -e "\n${BLUE}[COMMUNICATIONS]${NC} Testing Communication Endpoints..."
test_endpoint "GET" "/communications/messages" "" "List Messages"
test_endpoint "GET" "/communications/templates" "" "List Templates"
test_endpoint "GET" "/communications/history" "" "Communication History"
test_endpoint "GET" "/communications/stats" "" "Communication Stats"

echo -e "\n${BLUE}[POS TRANSACTIONS]${NC} Testing POS Transaction Endpoints..."
test_endpoint "GET" "/payments/pos/transactions" "" "POS Transactions"
test_endpoint "GET" "/pos/commission/rates" "" "Commission Rates"

echo -e "\n${BLUE}[AUTOMATION]${NC} Testing Automation Endpoints..."
test_endpoint "GET" "/automation/status" "" "Automation Status"
test_endpoint "GET" "/automation/logs" "" "Automation Logs"

echo -e "\n${BLUE}[AI]${NC} Testing AI Endpoints..."
test_endpoint "GET" "/ai/status" "" "AI Status"
test_endpoint "GET" "/ai/health" "" "AI Health"
test_endpoint "GET" "/ai/capabilities" "" "AI Capabilities"
test_endpoint "GET" "/ai/metrics" "" "AI Metrics"
test_endpoint "GET" "/ai/alerts" "" "AI Alerts"
test_endpoint "GET" "/ai/audit" "" "AI Audit"
test_endpoint "GET" "/ai/audit/stats" "" "AI Audit Stats"

# ============================================
# SUMMARY
# ============================================
echo -e "\n========================================="
echo -e "  ${BLUE}ADMIN TEST SUMMARY${NC}"
echo "========================================="
echo -e "Total Tests:    $TOTAL"
echo -e "${GREEN}Passed:         $PASSED${NC}"
echo -e "${RED}Failed:         $FAILED${NC}"
success_rate=$((PASSED * 100 / TOTAL))
echo -e "Success Rate:   ${success_rate}%"
echo "========================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL ADMIN TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some endpoints failed with admin permissions${NC}"
    exit 0
fi
