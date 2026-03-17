#!/bin/bash
# DEFINITIVE FUNCTIONAL VERIFICATION SUITE v8.0
# Bash 3.2+ Compatible & Precise JSON Extraction

BASE_URL="http://localhost:5003"
ADMIN_EMAIL="admin@xear.com"
ADMIN_PASSWORD="admin123"
FAILED_LOG="failed_endpoints.txt"
: > "$FAILED_LOG"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

TOTAL=0
PASSED=0
FAILED=0

# Category counters (simple variables instead of associative arrays)
ADMIN_PANEL_PASS=0
ADMIN_PANEL_FAIL=0
AFFILIATE_PASS=0
AFFILIATE_FAIL=0
SYSTEM_PASS=0
SYSTEM_FAIL=0
TENANT_WEB_APP_PASS=0
TENANT_WEB_APP_FAIL=0

test_endpoint() {
    local method=$1; local endpoint=$2; local data=$3
    local desc=$4; local token=$5; local cat=$6
    local eff_tenant=$7
    
    TOTAL=$((TOTAL + 1))
    printf "  -> [%s] %s ... " "$cat" "$desc"
    
    local body_file=$(mktemp)
    local http_code
    local idemp="id-$RANDOM-$(date +%s)"
    
    local curl_cmd=(curl -s --connect-timeout 5 --max-time 15 -o "$body_file" -w "%{http_code}" -X "$method")
    curl_cmd+=(-H "Authorization: Bearer $token")
    curl_cmd+=(-H "Content-Type: application/json")
    curl_cmd+=(-H "Idempotency-Key: $idemp")
    [ ! -z "$eff_tenant" ] && [ "$eff_tenant" != "null" ] && curl_cmd+=(-H "X-Effective-Tenant-Id: $eff_tenant")
    
    if [[ -z "$data" || "$data" == "{}" ]]; then
        http_code=$("${curl_cmd[@]}" "$BASE_URL$endpoint" 2>/dev/null)
    else
        http_code=$("${curl_cmd[@]}" -d "$data" "$BASE_URL$endpoint" 2>/dev/null)
    fi
    
    if [[ "$http_code" =~ ^(200|201|204)$ ]]; then
        printf "${GREEN}PASS${NC} (%s)\n" "$http_code"
        PASSED=$((PASSED + 1))
        case "$cat" in
            "ADMIN_PANEL") ADMIN_PANEL_PASS=$((ADMIN_PANEL_PASS + 1)) ;;
            "AFFILIATE") AFFILIATE_PASS=$((AFFILIATE_PASS + 1)) ;;
            "SYSTEM") SYSTEM_PASS=$((SYSTEM_PASS + 1)) ;;
            "TENANT_WEB_APP") TENANT_WEB_APP_PASS=$((TENANT_WEB_APP_PASS + 1)) ;;
        esac
    else
        printf "${RED}FAIL${NC} (%s)\n" "$http_code"
        FAILED=$((FAILED + 1))
        case "$cat" in
            "ADMIN_PANEL") ADMIN_PANEL_FAIL=$((ADMIN_PANEL_FAIL + 1)) ;;
            "AFFILIATE") AFFILIATE_FAIL=$((AFFILIATE_FAIL + 1)) ;;
            "SYSTEM") SYSTEM_FAIL=$((SYSTEM_FAIL + 1)) ;;
            "TENANT_WEB_APP") TENANT_WEB_APP_FAIL=$((TENANT_WEB_APP_FAIL + 1)) ;;
        esac
        err=$(cat "$body_file" | jq -r '.error.message // .message // "Error"' 2>/dev/null | head -c 80)
        printf "%s %s - %s - %s\n" "$method" "$endpoint" "$http_code" "$err" >> "$FAILED_LOG"
    fi
    rm "$body_file"
}

echo "Provisioning High-Fidelity Test Context (v8)..."

# 1. CORE AUTH
admin_res=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" -H "Content-Type: application/json" -H "Idempotency-Key: a-$RANDOM" -d '{"email":"'$ADMIN_EMAIL'","password":"'$ADMIN_PASSWORD'"}')
ADMIN_TOKEN=$(echo "$admin_res" | jq -r '.data.token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}✗ Admin Authentication failed!${NC}"
    echo "Response: $admin_res"
    exit 1
fi

echo "  -> Obtained Admin Token."

# 2. USE EXISTING TENANT
TN_ID="938ab3ec-192a-4f89-8a63-6941212e2f2a"
echo "  -> Using existing tenant: $TN_ID"

# 3. Switch to Tenant context
switch_res=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: s-$RANDOM" -d '{"targetTenantId":"'$TN_ID'"}')
TENANT_TOKEN=$(echo "$switch_res" | jq -r '.data.access_token // .data.accessToken')

if [ "$TENANT_TOKEN" = "null" ] || [ -z "$TENANT_TOKEN" ]; then
    echo -e "${RED}✗ Tenant Switch failed!${NC}"
    echo "Response: $switch_res"
    exit 1
fi

echo "  -> Obtained Tenant Token."

# 4. CREATE TEST DATA
PARTY_DATA='{"firstName": "Test", "lastName": "Party", "phone": "+905551234567", "email": "test@xear.com", "tcNumber": "12345678901", "status": "active"}'
party_res=$(curl -s -X POST "$BASE_URL/api/parties" -H "Authorization: Bearer $TENANT_TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: p-$RANDOM" -d "$PARTY_DATA")
P_ID=$(echo "$party_res" | jq -r '.data.id // .id' | head -n 1)

# Get existing plan and user IDs
PLAN_ID=$(curl -s -X GET "$BASE_URL/api/admin/plans" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.plans[0].id // .data[0].id' | head -n 1)
U_ID=$(curl -s -X GET "$BASE_URL/api/admin/users" -H "Authorization: Bearer $ADMIN_TOKEN" -H "X-Effective-Tenant-Id: $TN_ID" | jq -r '.data.users[0].id // .data[0].id' | head -n 1)

# Create ticket
TICKET_DATA='{"title": "Test Ticket", "description": "Test description", "priority": "high", "category": "technical", "tenantId": "'$TN_ID'"}'
ticket_res=$(curl -s -X POST "$BASE_URL/api/admin/tickets" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: t-$RANDOM" -H "X-Effective-Tenant-Id: $TN_ID" -d "$TICKET_DATA")
T_ID=$(echo "$ticket_res" | jq -r '.data.ticket.id // .data.id // .id' | head -n 1)

printf "  -> Context: Tenant:%s, Plan:%s, User:%s, Ticket:%s, Party:%s\n" "$TN_ID" "$PLAN_ID" "$U_ID" "$T_ID" "$P_ID"

echo ""
echo ">> ADMIN_PANEL Scrutiny"
test_endpoint "GET" "/api/admin/campaigns" "{}" "GET /api/admin/campaigns" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/auth/login" "{}" "POST /api/admin/auth/login" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/users" "$USER_DATA" "POST /api/admin/users" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/users" "{}" "GET /api/admin/users" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/users/all" "{}" "GET /api/admin/users/all" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "PUT" "/api/admin/users/all/${U_ID:-null}" "$USER_DATA" "PUT /api/admin/users/all/{user_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/tickets" "{}" "GET /api/admin/tickets" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/tickets" "$TICKET_DATA" "POST /api/admin/tickets" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "PUT" "/api/admin/tickets/${T_ID:-null}" "$TICKET_DATA" "PUT /api/admin/tickets/{ticket_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/tickets/${T_ID:-null}/responses" "$TICKET_DATA" "POST /api/admin/tickets/{ticket_id}/responses" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/debug/switch-role" "{}" "POST /api/admin/debug/switch-role" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/debug/available-roles" "{}" "GET /api/admin/debug/available-roles" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/debug/switch-tenant" "{}" "POST /api/admin/debug/switch-tenant" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/debug/exit-impersonation" "{}" "POST /api/admin/debug/exit-impersonation" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/debug/page-permissions/{page_key}" "{}" "GET /api/admin/debug/page-permissions/{page_key}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/tenants" "{}" "GET /api/admin/tenants" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/tenants" "$TENANT_DATA" "POST /api/admin/tenants" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/tenants/${TN_ID:-null}" "{}" "GET /api/admin/tenants/{tenant_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "PUT" "/api/admin/tenants/${TN_ID:-null}" "$TENANT_DATA" "PUT /api/admin/tenants/{tenant_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "DELETE" "/api/admin/tenants/${TN_ID:-null}" "{}" "DELETE /api/admin/tenants/{tenant_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/tenants/${TN_ID:-null}/users" "{}" "GET /api/admin/tenants/{tenant_id}/users" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/tenants/${TN_ID:-null}/users" "$TENANT_DATA" "POST /api/admin/tenants/{tenant_id}/users" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "PUT" "/api/admin/tenants/${TN_ID:-null}/users/${U_ID:-null}" "$TENANT_DATA" "PUT /api/admin/tenants/{tenant_id}/users/{user_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/tenants/${TN_ID:-null}/subscribe" "$TENANT_DATA" "POST /api/admin/tenants/{tenant_id}/subscribe" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/tenants/${TN_ID:-null}/addons" "$TENANT_DATA" "POST /api/admin/tenants/{tenant_id}/addons" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "DELETE" "/api/admin/tenants/${TN_ID:-null}/addons" "{}" "DELETE /api/admin/tenants/{tenant_id}/addons" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "PUT" "/api/admin/tenants/${TN_ID:-null}/status" "$TENANT_DATA" "PUT /api/admin/tenants/{tenant_id}/status" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/tenants/${TN_ID:-null}/sms-config" "{}" "GET /api/admin/tenants/{tenant_id}/sms-config" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/tenants/${TN_ID:-null}/sms-documents" "{}" "GET /api/admin/tenants/{tenant_id}/sms-documents" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/tenants/${TN_ID:-null}/sms-documents/{document_type}/download" "{}" "GET /api/admin/tenants/{tenant_id}/sms-documents/{document_type}/download" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "PUT" "/api/admin/tenants/${TN_ID:-null}/sms-documents/{document_type}/status" "$TENANT_DATA" "PUT /api/admin/tenants/{tenant_id}/sms-documents/{document_type}/status" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/tenants/${TN_ID:-null}/sms-documents/send-email" "$TENANT_DATA" "POST /api/admin/tenants/{tenant_id}/sms-documents/send-email" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/dashboard" "{}" "GET /api/admin/dashboard" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/dashboard/stats" "{}" "GET /api/admin/dashboard/stats" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/plans" "{}" "GET /api/admin/plans" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/plans" "$PLAN_DATA" "POST /api/admin/plans" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/plans/${PLAN_ID:-null}" "{}" "GET /api/admin/plans/{plan_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "PUT" "/api/admin/plans/${PLAN_ID:-null}" "$PLAN_DATA" "PUT /api/admin/plans/{plan_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "DELETE" "/api/admin/plans/${PLAN_ID:-null}" "{}" "DELETE /api/admin/plans/{plan_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/addons" "{}" "GET /api/admin/addons" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/addons" "{}" "POST /api/admin/addons" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/addons/{addon_id}" "{}" "GET /api/admin/addons/{addon_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "PUT" "/api/admin/addons/{addon_id}" "{}" "PUT /api/admin/addons/{addon_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "DELETE" "/api/admin/addons/{addon_id}" "{}" "DELETE /api/admin/addons/{addon_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/analytics/overview" "{}" "GET /api/admin/analytics/overview" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/analytics" "{}" "GET /api/admin/analytics" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/analytics/revenue" "{}" "GET /api/admin/analytics/revenue" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/analytics/users" "{}" "GET /api/admin/analytics/users" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/analytics/tenants" "{}" "GET /api/admin/analytics/tenants" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/bounces" "{}" "GET /api/admin/bounces" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/bounces/stats" "{}" "GET /api/admin/bounces/stats" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/bounces/{bounce_id}/unblacklist" "{}" "POST /api/admin/bounces/{bounce_id}/unblacklist" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/spam-preview" "{}" "POST /api/admin/spam-preview" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/unsubscribes" "{}" "GET /api/admin/unsubscribes" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/unsubscribes/stats" "{}" "GET /api/admin/unsubscribes/stats" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "DELETE" "/api/admin/unsubscribes/{unsubscribe_id}" "{}" "DELETE /api/admin/unsubscribes/{unsubscribe_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/email-approvals" "{}" "GET /api/admin/email-approvals" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/email-approvals/stats" "{}" "GET /api/admin/email-approvals/stats" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/email-approvals/{approval_id}/approve" "{}" "POST /api/admin/email-approvals/{approval_id}/approve" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/email-approvals/{approval_id}/reject" "{}" "POST /api/admin/email-approvals/{approval_id}/reject" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/complaints" "{}" "GET /api/admin/complaints" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/complaints/stats" "{}" "GET /api/admin/complaints/stats" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/complaints/process-fbl" "{}" "POST /api/admin/complaints/process-fbl" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/settings/init-db" "{}" "POST /api/admin/settings/init-db" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/settings" "{}" "GET /api/admin/settings" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/settings" "{}" "POST /api/admin/settings" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/settings/cache/clear" "{}" "POST /api/admin/settings/cache/clear" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/settings/backup" "{}" "POST /api/admin/settings/backup" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/roles" "{}" "GET /api/admin/roles" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "POST" "/api/admin/roles" "{}" "POST /api/admin/roles" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/roles/{role_id}" "{}" "GET /api/admin/roles/{role_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "PUT" "/api/admin/roles/{role_id}" "{}" "PUT /api/admin/roles/{role_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "DELETE" "/api/admin/roles/{role_id}" "{}" "DELETE /api/admin/roles/{role_id}" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/roles/{role_id}/permissions" "{}" "GET /api/admin/roles/{role_id}/permissions" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "PUT" "/api/admin/roles/{role_id}/permissions" "{}" "PUT /api/admin/roles/{role_id}/permissions" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"
test_endpoint "GET" "/api/admin/permissions" "{}" "GET /api/admin/permissions" "$ADMIN_TOKEN" "ADMIN_PANEL" "$TN_ID"

cleanup() {
    echo -e "
[CLEANUP] Test completed"
}
trap cleanup EXIT

echo ""
echo "========================================="
echo "SAMPLE TEST SCORECARD (First 50 endpoints)"
echo "========================================="
echo "ADMIN_PANEL:     $ADMIN_PANEL_PASS pass / $ADMIN_PANEL_FAIL fail"
echo "AFFILIATE:       $AFFILIATE_PASS pass / $AFFILIATE_FAIL fail"
echo "SYSTEM:          $SYSTEM_PASS pass / $SYSTEM_FAIL fail"
echo "TENANT_WEB_APP:  $TENANT_WEB_APP_PASS pass / $TENANT_WEB_APP_FAIL fail"
echo "========================================="
echo "TOTAL:           $PASSED pass / $FAILED fail / $TOTAL total ($(( PASSED * 100 / TOTAL ))%)"
echo "========================================="

