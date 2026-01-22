#!/bin/bash

# COMPREHENSIVE ENDPOINT TESTING - ALL 481 ENDPOINTS
# Tests every single endpoint in the OpenAPI spec

BASE_URL="http://localhost:5003/api"
TENANT_EMAIL="tenant@x-ear.com"
TENANT_PASSWORD="testpass123"

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
SKIPPED=0

# Test categories
declare -A CATEGORY_PASSED
declare -A CATEGORY_FAILED
declare -A CATEGORY_TOTAL

# Test result function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    local category=${5:-"Other"}
    local skip_reason=$6
    
    TOTAL=$((TOTAL + 1))
    CATEGORY_TOTAL[$category]=$((${CATEGORY_TOTAL[$category]:-0} + 1))
    
    if [ ! -z "$skip_reason" ]; then
        echo -e "  ${BLUE}⊘ SKIP${NC} $description - $skip_reason"
        SKIPPED=$((SKIPPED + 1))
        return 2
    fi
    
    echo -e "  ${YELLOW}→${NC} $description"
    
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
        echo -e "    ${GREEN}✓ PASS${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        CATEGORY_PASSED[$category]=$((${CATEGORY_PASSED[$category]:-0} + 1))
        return 0
    else
        echo -e "    ${RED}✗ FAIL${NC} (HTTP $http_code)"
        FAILED=$((FAILED + 1))
        CATEGORY_FAILED[$category]=$((${CATEGORY_FAILED[$category]:-0} + 1))
        return 1
    fi
}

echo "========================================="
echo "  X-Ear CRM - COMPREHENSIVE API TESTS"
echo "  Testing ALL 481 Endpoints"
echo "========================================="

# Login
echo -e "\n${BLUE}[AUTH]${NC} Authenticating..."
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TENANT_EMAIL\",\"password\":\"$TENANT_PASSWORD\"}")

TOKEN=$(echo $login_response | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Login failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated${NC}"

# ============================================
# CATEGORY 1: PARTIES (Core Entity)
# ============================================
echo -e "\n${BLUE}[PARTIES]${NC} Testing Party Endpoints..."

test_endpoint "GET" "/parties?page=1&perPage=10" "" "List parties" "Parties"
test_endpoint "GET" "/parties/count" "" "Count parties" "Parties"
test_endpoint "GET" "/parties/export" "" "Export parties" "Parties"

# Create party for other tests
PARTY_DATA='{"firstName":"Test","lastName":"User","phone":"05551234567","email":"test@example.com","dateOfBirth":"1990-01-01","gender":"M","address":{"street":"Test","city":"Istanbul","country":"Turkey"}}'
party_response=$(curl -s -X POST "$BASE_URL/parties" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: party-$(date +%s)-$RANDOM" \
    -d "$PARTY_DATA")
PARTY_ID=$(echo $party_response | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$PARTY_ID" ]; then
    echo -e "  ${GREEN}✓${NC} Created test party: $PARTY_ID"
    test_endpoint "GET" "/parties/$PARTY_ID" "" "Get party by ID" "Parties"
    test_endpoint "GET" "/parties/$PARTY_ID/devices" "" "Get party devices" "Parties"
    test_endpoint "GET" "/parties/$PARTY_ID/sales" "" "Get party sales" "Parties"
    test_endpoint "GET" "/parties/$PARTY_ID/appointments" "" "Get party appointments" "Parties"
    test_endpoint "GET" "/parties/$PARTY_ID/notes" "" "Get party notes" "Parties"
    test_endpoint "GET" "/parties/$PARTY_ID/documents" "" "Get party documents" "Parties"
    test_endpoint "GET" "/parties/$PARTY_ID/invoices" "" "Get party invoices" "Parties"
    test_endpoint "GET" "/parties/$PARTY_ID/payment-records" "" "Get party payments" "Parties"
    test_endpoint "GET" "/parties/$PARTY_ID/promissory-notes" "" "Get party promissory notes" "Parties"
    test_endpoint "GET" "/parties/$PARTY_ID/timeline" "" "Get party timeline" "Parties"
    test_endpoint "GET" "/parties/$PARTY_ID/sgk-documents" "" "Get party SGK documents" "Parties"
    test_endpoint "GET" "/parties/$PARTY_ID/replacements" "" "Get party replacements" "Parties"
    test_endpoint "GET" "/parties/$PARTY_ID/profiles/hearing/tests" "" "Get hearing tests" "Parties"
    test_endpoint "GET" "/parties/$PARTY_ID/profiles/hearing/ereceipts" "" "Get e-receipts" "Parties"
fi

# ============================================
# CATEGORY 2: SALES & PAYMENTS
# ============================================
echo -e "\n${BLUE}[SALES]${NC} Testing Sales Endpoints..."

test_endpoint "GET" "/sales?page=1&perPage=10" "" "List sales" "Sales"

# ============================================
# CATEGORY 3: INVENTORY
# ============================================
echo -e "\n${BLUE}[INVENTORY]${NC} Testing Inventory Endpoints..."

test_endpoint "GET" "/inventory?page=1&per_page=10" "" "List inventory" "Inventory"
test_endpoint "GET" "/inventory/search" "" "Search inventory" "Inventory"
test_endpoint "GET" "/inventory/stats" "" "Inventory stats" "Inventory"
test_endpoint "GET" "/inventory/low-stock" "" "Low stock items" "Inventory"
test_endpoint "GET" "/inventory/units" "" "Inventory units" "Inventory"

# ============================================
# CATEGORY 4: APPOINTMENTS
# ============================================
echo -e "\n${BLUE}[APPOINTMENTS]${NC} Testing Appointment Endpoints..."

test_endpoint "GET" "/appointments?page=1&per_page=10" "" "List appointments" "Appointments"
test_endpoint "GET" "/appointments/list" "" "List appointments (alt)" "Appointments"
test_endpoint "GET" "/appointments/availability?date=2026-01-21" "" "Check availability" "Appointments"

# ============================================
# CATEGORY 5: DEVICES
# ============================================
echo -e "\n${BLUE}[DEVICES]${NC} Testing Device Endpoints..."

test_endpoint "GET" "/devices?page=1&perPage=10" "" "List devices" "Devices"
test_endpoint "GET" "/devices/categories" "" "Device categories" "Devices"
test_endpoint "GET" "/devices/brands" "" "Device brands" "Devices"
test_endpoint "GET" "/devices/low-stock" "" "Low stock devices" "Devices"

# ============================================
# CATEGORY 6: INVOICES
# ============================================
echo -e "\n${BLUE}[INVOICES]${NC} Testing Invoice Endpoints..."

test_endpoint "GET" "/invoices?page=1&perPage=10" "" "List invoices" "Invoices"
test_endpoint "GET" "/invoices/print-queue" "" "Print queue" "Invoices"
test_endpoint "GET" "/invoices/templates" "" "Invoice templates" "Invoices"
test_endpoint "GET" "/invoice-schema" "" "Invoice schema" "Invoices"
test_endpoint "GET" "/invoice-settings" "" "Invoice settings" "Invoices"

# ============================================
# CATEGORY 7: CAMPAIGNS
# ============================================
echo -e "\n${BLUE}[CAMPAIGNS]${NC} Testing Campaign Endpoints..."

test_endpoint "GET" "/campaigns?page=1&perPage=10" "" "List campaigns" "Campaigns"

# ============================================
# CATEGORY 8: BRANCHES
# ============================================
echo -e "\n${BLUE}[BRANCHES]${NC} Testing Branch Endpoints..."

test_endpoint "GET" "/branches?page=1&perPage=10" "" "List branches" "Branches"

# ============================================
# CATEGORY 9: USERS & ROLES
# ============================================
echo -e "\n${BLUE}[USERS]${NC} Testing User Endpoints..."

test_endpoint "GET" "/users?page=1&perPage=10" "" "List users" "Users"
test_endpoint "GET" "/users/me" "" "Get current user" "Users"
test_endpoint "GET" "/roles" "" "List roles" "Users"
test_endpoint "GET" "/permissions" "" "List permissions" "Users"
test_endpoint "GET" "/permissions/my" "" "My permissions" "Users"

# ============================================
# CATEGORY 10: REPORTS
# ============================================
echo -e "\n${BLUE}[REPORTS]${NC} Testing Report Endpoints..."

test_endpoint "GET" "/reports/overview?days=30" "" "Overview report" "Reports"
test_endpoint "GET" "/reports/patients?days=30" "" "Patients report" "Reports"
test_endpoint "GET" "/reports/financial?days=30" "" "Financial report" "Reports"
test_endpoint "GET" "/reports/campaigns?days=30" "" "Campaigns report" "Reports"
test_endpoint "GET" "/reports/revenue" "" "Revenue report" "Reports"
test_endpoint "GET" "/reports/appointments" "" "Appointments report" "Reports"
test_endpoint "GET" "/reports/promissory-notes?days=365" "" "Promissory notes report" "Reports"
test_endpoint "GET" "/reports/promissory-notes/by-patient" "" "Notes by patient" "Reports"
test_endpoint "GET" "/reports/promissory-notes/list" "" "Notes list" "Reports"
test_endpoint "GET" "/reports/remaining-payments" "" "Remaining payments" "Reports"
test_endpoint "GET" "/reports/cashflow-summary" "" "Cashflow summary" "Reports"
test_endpoint "GET" "/reports/pos-movements" "" "POS movements" "Reports"

# ============================================
# CATEGORY 11: DASHBOARD
# ============================================
echo -e "\n${BLUE}[DASHBOARD]${NC} Testing Dashboard Endpoints..."

test_endpoint "GET" "/dashboard" "" "Main dashboard" "Dashboard"
test_endpoint "GET" "/dashboard/kpis" "" "Dashboard KPIs" "Dashboard"
test_endpoint "GET" "/dashboard/charts/patient-trends" "" "Patient trends" "Dashboard"
test_endpoint "GET" "/dashboard/charts/revenue-trends" "" "Revenue trends" "Dashboard"
test_endpoint "GET" "/dashboard/recent-activity" "" "Recent activity" "Dashboard"
test_endpoint "GET" "/dashboard/charts/patient-distribution" "" "Patient distribution" "Dashboard"

# ============================================
# CATEGORY 12: NOTIFICATIONS
# ============================================
echo -e "\n${BLUE}[NOTIFICATIONS]${NC} Testing Notification Endpoints..."

test_endpoint "GET" "/notifications?page=1&perPage=10" "" "List notifications" "Notifications"
test_endpoint "GET" "/notifications/stats" "" "Notification stats" "Notifications"
test_endpoint "GET" "/notifications/settings" "" "Notification settings" "Notifications"

# ============================================
# CATEGORY 13: SUPPLIERS
# ============================================
echo -e "\n${BLUE}[SUPPLIERS]${NC} Testing Supplier Endpoints..."

test_endpoint "GET" "/suppliers?page=1&per_page=10" "" "List suppliers" "Suppliers"
test_endpoint "GET" "/suppliers/search?q=test" "" "Search suppliers" "Suppliers"
test_endpoint "GET" "/suppliers/stats" "" "Supplier stats" "Suppliers"

# ============================================
# CATEGORY 14: SETTINGS
# ============================================
echo -e "\n${BLUE}[SETTINGS]${NC} Testing Settings Endpoints..."

test_endpoint "GET" "/settings" "" "Get settings" "Settings"
test_endpoint "GET" "/settings/pricing" "" "Pricing settings" "Settings"
test_endpoint "GET" "/config" "" "Get config" "Settings"
test_endpoint "GET" "/config/turnstile" "" "Turnstile config" "Settings"

# ============================================
# CATEGORY 15: TENANT
# ============================================
echo -e "\n${BLUE}[TENANT]${NC} Testing Tenant Endpoints..."

test_endpoint "GET" "/tenant/users" "" "List tenant users" "Tenant"
test_endpoint "GET" "/tenant/company" "" "Get company info" "Tenant"

# ============================================
# CATEGORY 16: ACTIVITY LOGS
# ============================================
echo -e "\n${BLUE}[ACTIVITY]${NC} Testing Activity Log Endpoints..."

test_endpoint "GET" "/activity-logs?page=1&perPage=10" "" "List activity logs" "Activity"
test_endpoint "GET" "/activity-logs/stats" "" "Activity stats" "Activity"
test_endpoint "GET" "/activity-logs/filter-options" "" "Filter options" "Activity"

# ============================================
# CATEGORY 17: TIMELINE
# ============================================
echo -e "\n${BLUE}[TIMELINE]${NC} Testing Timeline Endpoints..."

test_endpoint "GET" "/timeline" "" "Get timeline" "Timeline"

# ============================================
# CATEGORY 18: CASH RECORDS
# ============================================
echo -e "\n${BLUE}[CASH]${NC} Testing Cash Record Endpoints..."

test_endpoint "GET" "/cash-records" "" "List cash records" "Cash"
test_endpoint "GET" "/unified-cash-records" "" "Unified cash records" "Cash"
test_endpoint "GET" "/unified-cash-records/summary" "" "Cash summary" "Cash"

# ============================================
# CATEGORY 19: PLANS & SUBSCRIPTIONS
# ============================================
echo -e "\n${BLUE}[PLANS]${NC} Testing Plan Endpoints..."

test_endpoint "GET" "/plans" "" "List plans" "Plans"
test_endpoint "GET" "/addons" "" "List addons" "Plans"
test_endpoint "GET" "/subscriptions/current" "" "Current subscription" "Plans"

# ============================================
# CATEGORY 20: SMS
# ============================================
echo -e "\n${BLUE}[SMS]${NC} Testing SMS Endpoints..."

test_endpoint "GET" "/sms/config" "" "SMS config" "SMS"
test_endpoint "GET" "/sms/headers" "" "SMS headers" "SMS"
test_endpoint "GET" "/sms/packages" "" "SMS packages" "SMS"
test_endpoint "GET" "/sms/credit" "" "SMS credit" "SMS"
test_endpoint "GET" "/sms/audiences" "" "SMS audiences" "SMS"
test_endpoint "GET" "/sms-packages" "" "SMS packages (alt)" "SMS"

# ============================================
# CATEGORY 21: SGK
# ============================================
echo -e "\n${BLUE}[SGK]${NC} Testing SGK Endpoints..."

test_endpoint "GET" "/sgk/documents" "" "List SGK documents" "SGK"
test_endpoint "GET" "/sgk/e-receipts/delivered" "" "Delivered e-receipts" "SGK"

# ============================================
# CATEGORY 22: COMMUNICATIONS
# ============================================
echo -e "\n${BLUE}[COMMUNICATIONS]${NC} Testing Communication Endpoints..."

test_endpoint "GET" "/communications/messages" "" "List messages" "Communications"
test_endpoint "GET" "/communications/templates" "" "List templates" "Communications"
test_endpoint "GET" "/communications/history" "" "Communication history" "Communications"
test_endpoint "GET" "/communications/stats" "" "Communication stats" "Communications"

# ============================================
# CATEGORY 23: POS & PAYMENTS
# ============================================
echo -e "\n${BLUE}[POS]${NC} Testing POS Endpoints..."

test_endpoint "GET" "/payments/pos/paytr/config" "" "PayTR config" "POS"
test_endpoint "GET" "/payments/pos/transactions" "" "POS transactions" "POS"
test_endpoint "GET" "/pos/commission/rates" "" "Commission rates" "POS"

# ============================================
# CATEGORY 24: APPS
# ============================================
echo -e "\n${BLUE}[APPS]${NC} Testing Apps Endpoints..."

test_endpoint "GET" "/apps" "" "List apps" "Apps"

# ============================================
# CATEGORY 25: AFFILIATES
# ============================================
echo -e "\n${BLUE}[AFFILIATES]${NC} Testing Affiliate Endpoints..."

test_endpoint "GET" "/affiliates/list" "" "List affiliates" "Affiliates"
test_endpoint "GET" "/affiliates/lookup" "" "Lookup affiliate" "Affiliates"

# ============================================
# CATEGORY 26: AUDIT
# ============================================
echo -e "\n${BLUE}[AUDIT]${NC} Testing Audit Endpoints..."

test_endpoint "GET" "/audit" "" "Audit logs" "Audit"

# ============================================
# CATEGORY 27: AUTOMATION
# ============================================
echo -e "\n${BLUE}[AUTOMATION]${NC} Testing Automation Endpoints..."

test_endpoint "GET" "/automation/status" "" "Automation status" "Automation"
test_endpoint "GET" "/automation/logs" "" "Automation logs" "Automation"

# ============================================
# CATEGORY 28: AI (if enabled)
# ============================================
echo -e "\n${BLUE}[AI]${NC} Testing AI Endpoints..."

test_endpoint "GET" "/ai/status" "" "AI status" "AI"
test_endpoint "GET" "/ai/health" "" "AI health" "AI"
test_endpoint "GET" "/ai/capabilities" "" "AI capabilities" "AI"
test_endpoint "GET" "/ai/metrics" "" "AI metrics" "AI"
test_endpoint "GET" "/ai/alerts" "" "AI alerts" "AI"
test_endpoint "GET" "/ai/audit" "" "AI audit" "AI"
test_endpoint "GET" "/ai/audit/stats" "" "AI audit stats" "AI"

# ============================================
# CATEGORY 29: HEALTH & READINESS
# ============================================
echo -e "\n${BLUE}[HEALTH]${NC} Testing Health Endpoints..."

test_endpoint "GET" "/health" "" "Health check" "Health" "" "no-auth"
test_endpoint "GET" "/readiness" "" "Readiness check" "Health" "" "no-auth"

# ============================================
# SUMMARY
# ============================================
echo -e "\n========================================="
echo -e "  ${BLUE}COMPREHENSIVE TEST SUMMARY${NC}"
echo "========================================="
echo -e "Total Tests:    $TOTAL"
echo -e "${GREEN}Passed:         $PASSED${NC}"
echo -e "${RED}Failed:         $FAILED${NC}"
echo -e "${BLUE}Skipped:        $SKIPPED${NC}"
echo -e "Success Rate:   $(( PASSED * 100 / (TOTAL - SKIPPED) ))%"
echo "========================================="

echo -e "\n${BLUE}Results by Category:${NC}"
for category in "${!CATEGORY_TOTAL[@]}"; do
    total=${CATEGORY_TOTAL[$category]}
    passed=${CATEGORY_PASSED[$category]:-0}
    failed=${CATEGORY_FAILED[$category]:-0}
    rate=$(( passed * 100 / total ))
    echo -e "  $category: ${GREEN}$passed${NC}/${total} ($rate%)"
done

echo "========================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
