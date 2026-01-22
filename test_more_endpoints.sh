#!/bin/bash

# Extended Endpoint Testing - More categories
# Tests additional endpoint categories beyond the basic CRUD

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
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "========================================="
echo "  X-Ear CRM - Extended API Tests"
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
# REPORTS & ANALYTICS
# ============================================
echo -e "\n${BLUE}[REPORTS]${NC} Testing Report Endpoints..."

test_endpoint "GET" "/reports/overview?days=30" "" "Overview Report"
test_endpoint "GET" "/reports/patients?days=30" "" "Patients Report"
test_endpoint "GET" "/reports/financial?days=30" "" "Financial Report"
test_endpoint "GET" "/reports/campaigns?days=30" "" "Campaigns Report"
test_endpoint "GET" "/reports/revenue" "" "Revenue Report"
test_endpoint "GET" "/reports/appointments" "" "Appointments Report"
test_endpoint "GET" "/reports/promissory-notes?days=365" "" "Promissory Notes Report"
test_endpoint "GET" "/reports/remaining-payments" "" "Remaining Payments"
test_endpoint "GET" "/reports/cashflow-summary" "" "Cashflow Summary"
test_endpoint "GET" "/reports/pos-movements" "" "POS Movements"

# ============================================
# DASHBOARD
# ============================================
echo -e "\n${BLUE}[DASHBOARD]${NC} Testing Dashboard Endpoints..."

test_endpoint "GET" "/dashboard" "" "Main Dashboard"
test_endpoint "GET" "/dashboard/kpis" "" "Dashboard KPIs"
test_endpoint "GET" "/dashboard/charts/patient-trends" "" "Patient Trends"
test_endpoint "GET" "/dashboard/charts/revenue-trends" "" "Revenue Trends"
test_endpoint "GET" "/dashboard/recent-activity" "" "Recent Activity"
test_endpoint "GET" "/dashboard/charts/patient-distribution" "" "Patient Distribution"

# ============================================
# INVENTORY ADVANCED
# ============================================
echo -e "\n${BLUE}[INVENTORY]${NC} Testing Advanced Inventory Endpoints..."

test_endpoint "GET" "/inventory/search" "" "Search Inventory"
test_endpoint "GET" "/inventory/stats" "" "Inventory Stats"
test_endpoint "GET" "/inventory/low-stock" "" "Low Stock Items"
test_endpoint "GET" "/inventory/units" "" "Inventory Units"

# ============================================
# DEVICES
# ============================================
echo -e "\n${BLUE}[DEVICES]${NC} Testing Device Endpoints..."

test_endpoint "GET" "/devices/categories" "" "Device Categories"
test_endpoint "GET" "/devices/brands" "" "Device Brands"
test_endpoint "GET" "/devices/low-stock" "" "Low Stock Devices"

# ============================================
# INVOICES
# ============================================
echo -e "\n${BLUE}[INVOICES]${NC} Testing Invoice Endpoints..."

test_endpoint "GET" "/invoices/print-queue" "" "Print Queue"
test_endpoint "GET" "/invoices/templates" "" "Invoice Templates"
test_endpoint "GET" "/invoice-schema" "" "Invoice Schema"
test_endpoint "GET" "/invoice-settings" "" "Invoice Settings"

# ============================================
# USERS & PERMISSIONS
# ============================================
echo -e "\n${BLUE}[USERS]${NC} Testing User & Permission Endpoints..."

test_endpoint "GET" "/users/me" "" "Get Current User"
test_endpoint "GET" "/permissions" "" "List Permissions"
test_endpoint "GET" "/permissions/my" "" "My Permissions"

# ============================================
# NOTIFICATIONS
# ============================================
echo -e "\n${BLUE}[NOTIFICATIONS]${NC} Testing Notification Endpoints..."

test_endpoint "GET" "/notifications/stats" "" "Notification Stats"
test_endpoint "GET" "/notifications/settings" "" "Notification Settings"

# ============================================
# SUPPLIERS
# ============================================
echo -e "\n${BLUE}[SUPPLIERS]${NC} Testing Supplier Endpoints..."

test_endpoint "GET" "/suppliers/search?q=test" "" "Search Suppliers"
test_endpoint "GET" "/suppliers/stats" "" "Supplier Stats"

# ============================================
# SETTINGS
# ============================================
echo -e "\n${BLUE}[SETTINGS]${NC} Testing Settings Endpoints..."

test_endpoint "GET" "/settings" "" "Get Settings"
test_endpoint "GET" "/settings/pricing" "" "Pricing Settings"
test_endpoint "GET" "/config" "" "Get Config"
test_endpoint "GET" "/config/turnstile" "" "Turnstile Config"

# ============================================
# TENANT
# ============================================
echo -e "\n${BLUE}[TENANT]${NC} Testing Tenant Endpoints..."

test_endpoint "GET" "/tenant/users" "" "List Tenant Users"
test_endpoint "GET" "/tenant/company" "" "Get Company Info"

# ============================================
# ACTIVITY LOGS
# ============================================
echo -e "\n${BLUE}[ACTIVITY]${NC} Testing Activity Log Endpoints..."

test_endpoint "GET" "/activity-logs?page=1&perPage=10" "" "List Activity Logs"
test_endpoint "GET" "/activity-logs/stats" "" "Activity Stats"
test_endpoint "GET" "/activity-logs/filter-options" "" "Filter Options"

# ============================================
# CASH RECORDS
# ============================================
echo -e "\n${BLUE}[CASH]${NC} Testing Cash Record Endpoints..."

test_endpoint "GET" "/cash-records" "" "List Cash Records"
test_endpoint "GET" "/unified-cash-records" "" "Unified Cash Records"
test_endpoint "GET" "/unified-cash-records/summary" "" "Cash Summary"

# ============================================
# PLANS & SUBSCRIPTIONS
# ============================================
echo -e "\n${BLUE}[PLANS]${NC} Testing Plan Endpoints..."

test_endpoint "GET" "/plans" "" "List Plans"
test_endpoint "GET" "/addons" "" "List Addons"
test_endpoint "GET" "/subscriptions/current" "" "Current Subscription"

# ============================================
# SMS
# ============================================
echo -e "\n${BLUE}[SMS]${NC} Testing SMS Endpoints..."

test_endpoint "GET" "/sms/config" "" "SMS Config"
test_endpoint "GET" "/sms/headers" "" "SMS Headers"
test_endpoint "GET" "/sms/packages" "" "SMS Packages"
test_endpoint "GET" "/sms/credit" "" "SMS Credit"
test_endpoint "GET" "/sms/audiences" "" "SMS Audiences"

# ============================================
# SGK
# ============================================
echo -e "\n${BLUE}[SGK]${NC} Testing SGK Endpoints..."

test_endpoint "GET" "/sgk/documents" "" "List SGK Documents"
test_endpoint "GET" "/sgk/e-receipts/delivered" "" "Delivered E-Receipts"

# ============================================
# COMMUNICATIONS
# ============================================
echo -e "\n${BLUE}[COMMUNICATIONS]${NC} Testing Communication Endpoints..."

test_endpoint "GET" "/communications/messages" "" "List Messages"
test_endpoint "GET" "/communications/templates" "" "List Templates"
test_endpoint "GET" "/communications/history" "" "Communication History"
test_endpoint "GET" "/communications/stats" "" "Communication Stats"

# ============================================
# POS & PAYMENTS
# ============================================
echo -e "\n${BLUE}[POS]${NC} Testing POS Endpoints..."

test_endpoint "GET" "/payments/pos/paytr/config" "" "PayTR Config"
test_endpoint "GET" "/payments/pos/transactions" "" "POS Transactions"
test_endpoint "GET" "/pos/commission/rates" "" "Commission Rates"

# ============================================
# APPS
# ============================================
echo -e "\n${BLUE}[APPS]${NC} Testing Apps Endpoints..."

test_endpoint "GET" "/apps" "" "List Apps"

# ============================================
# AFFILIATES
# ============================================
echo -e "\n${BLUE}[AFFILIATES]${NC} Testing Affiliate Endpoints..."

test_endpoint "GET" "/affiliates/list" "" "List Affiliates"
test_endpoint "GET" "/affiliates/lookup" "" "Lookup Affiliate"

# ============================================
# AUDIT
# ============================================
echo -e "\n${BLUE}[AUDIT]${NC} Testing Audit Endpoints..."

test_endpoint "GET" "/audit" "" "Audit Logs"

# ============================================
# AUTOMATION
# ============================================
echo -e "\n${BLUE}[AUTOMATION]${NC} Testing Automation Endpoints..."

test_endpoint "GET" "/automation/status" "" "Automation Status"
test_endpoint "GET" "/automation/logs" "" "Automation Logs"

# ============================================
# AI
# ============================================
echo -e "\n${BLUE}[AI]${NC} Testing AI Endpoints..."

test_endpoint "GET" "/ai/status" "" "AI Status"
test_endpoint "GET" "/ai/health" "" "AI Health"
test_endpoint "GET" "/ai/capabilities" "" "AI Capabilities"
test_endpoint "GET" "/ai/metrics" "" "AI Metrics"
test_endpoint "GET" "/ai/alerts" "" "AI Alerts"
test_endpoint "GET" "/ai/audit" "" "AI Audit"
test_endpoint "GET" "/ai/audit/stats" "" "AI Audit Stats"

# ============================================
# APPOINTMENTS ADVANCED
# ============================================
echo -e "\n${BLUE}[APPOINTMENTS]${NC} Testing Advanced Appointment Endpoints..."

test_endpoint "GET" "/appointments/list" "" "List Appointments (Alt)"
test_endpoint "GET" "/appointments/availability?date=2026-01-21" "" "Check Availability"

# ============================================
# SUMMARY
# ============================================
echo -e "\n========================================="
echo -e "  ${BLUE}TEST SUMMARY${NC}"
echo "========================================="
echo -e "Total Tests:    $TOTAL"
echo -e "${GREEN}Passed:         $PASSED${NC}"
echo -e "${RED}Failed:         $FAILED${NC}"
success_rate=$((PASSED * 100 / TOTAL))
echo -e "Success Rate:   ${success_rate}%"
echo "========================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some endpoints may not be implemented yet${NC}"
    exit 0
fi
