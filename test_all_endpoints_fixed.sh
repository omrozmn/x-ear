#!/bin/bash

# Comprehensive Endpoint Testing Script
# Tests ALL endpoints with proper authentication and validation

BASE_URL="http://localhost:5003/api"
TENANT_EMAIL="tenant@x-ear.com"
TENANT_PASSWORD="testpass123"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
    
    # Generate Idempotency-Key for write operations
    IDEMPOTENCY_KEY="test-$(date +%s)-$RANDOM"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" =~ ^(200|201)$ ]]; then
        echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "  ${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "  Response: $body" | head -c 200
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "========================================="
echo "  X-Ear CRM - Comprehensive API Tests"
echo "========================================="

# Step 1: Login
echo -e "\n${YELLOW}Step 1: Authentication${NC}"
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TENANT_EMAIL\",\"password\":\"$TENANT_PASSWORD\"}")

TOKEN=$(echo $login_response | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Login failed!${NC}"
    echo "Response: $login_response"
    exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo "Token: ${TOKEN:0:20}..."

# Extract tenant_id from token (decode JWT payload)
TENANT_ID=$(echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | grep -o '"tenant_id":"[^"]*' | cut -d'"' -f4)
echo "Tenant ID: $TENANT_ID"

# Step 2: GET Endpoints
echo -e "\n${YELLOW}Step 2: Testing GET Endpoints${NC}"

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
test_endpoint "GET" "/reports/overview?days=30" "" "Dashboard Report"

# Step 3: Create Party (needed for other tests)
echo -e "\n${YELLOW}Step 3: Creating Test Party${NC}"

PARTY_DATA="{
  \"firstName\": \"Test\",
  \"lastName\": \"User $(date +%s)\",
  \"phone\": \"05551234567\",
  \"email\": \"test$(date +%s)@example.com\",
  \"dateOfBirth\": \"1990-01-01\",
  \"gender\": \"M\",
  \"address\": {
    \"street\": \"Test Street\",
    \"city\": \"Istanbul\",
    \"country\": \"Turkey\"
  }
}"

IDEMPOTENCY_KEY="party-$(date +%s)-$RANDOM"

party_response=$(curl -s -X POST "$BASE_URL/parties" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
    -d "$PARTY_DATA")

PARTY_ID=$(echo $party_response | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$PARTY_ID" ]; then
    echo -e "${RED}✗ Party creation failed!${NC}"
    echo "Response: $party_response"
else
    echo -e "${GREEN}✓ Party created: $PARTY_ID${NC}"
    PASSED=$((PASSED + 1))
fi
TOTAL=$((TOTAL + 1))

# Step 4: Create Branch (needed for other tests)
echo -e "\n${YELLOW}Step 4: Creating Test Branch${NC}"

BRANCH_DATA="{
  \"name\": \"Test Branch $(date +%s)\",
  \"code\": \"TB$(date +%s | tail -c 5)\",
  \"address\": \"Test Address\",
  \"city\": \"Istanbul\",
  \"phone\": \"02121234567\",
  \"email\": \"branch$(date +%s)@example.com\",
  \"isActive\": true
}"

IDEMPOTENCY_KEY="branch-$(date +%s)-$RANDOM"

branch_response=$(curl -s -X POST "$BASE_URL/branches" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
    -d "$BRANCH_DATA")

BRANCH_ID=$(echo $branch_response | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$BRANCH_ID" ]; then
    echo -e "${RED}✗ Branch creation failed!${NC}"
    echo "Response: $branch_response"
else
    echo -e "${GREEN}✓ Branch created: $BRANCH_ID${NC}"
    PASSED=$((PASSED + 1))
fi
TOTAL=$((TOTAL + 1))

# Step 5: POST Endpoints (with proper data)
echo -e "\n${YELLOW}Step 5: Testing POST Endpoints${NC}"

# Inventory
if [ ! -z "$BRANCH_ID" ]; then
    INVENTORY_DATA="{
      \"name\": \"Test Device $(date +%s)\",
      \"brand\": \"Phonak\",
      \"model\": \"Audeo P90\",
      \"category\": \"hearing_aid\",
      \"unit\": \"adet\",
      \"availableInventory\": 10,
      \"totalInventory\": 10,
      \"reorderLevel\": 5,
      \"price\": 15000.0,
      \"cost\": 10000.0,
      \"vatRate\": 18.0,
      \"tenantId\": \"$TENANT_ID\",
      \"branchId\": \"$BRANCH_ID\"
    }"
    test_endpoint "POST" "/inventory" "$INVENTORY_DATA" "Create Inventory Item"
fi

# Appointment
if [ ! -z "$PARTY_ID" ] && [ ! -z "$BRANCH_ID" ]; then
    APPOINTMENT_DATE=$(date -u +"%Y-%m-%dT10:00:00Z")
    APPOINTMENT_DATA="{
      \"partyId\": \"$PARTY_ID\",
      \"branchId\": \"$BRANCH_ID\",
      \"date\": \"$APPOINTMENT_DATE\",
      \"time\": \"10:00\",
      \"duration\": 30,
      \"appointmentType\": \"consultation\",
      \"status\": \"scheduled\",
      \"notes\": \"Test appointment\"
    }"
    test_endpoint "POST" "/appointments" "$APPOINTMENT_DATA" "Create Appointment"
fi

# Campaign
CAMPAIGN_DATA="{
  \"name\": \"Test Campaign $(date +%s)\",
  \"description\": \"Test campaign description\",
  \"campaignType\": \"sms\",
  \"targetSegment\": \"all\",
  \"messageTemplate\": \"Test message\",
  \"discountType\": \"PERCENTAGE\",
  \"discountValue\": 10,
  \"isActive\": true,
  \"targetAudience\": \"ALL\"
}"
test_endpoint "POST" "/campaigns" "$CAMPAIGN_DATA" "Create Campaign"

# Supplier
SUPPLIER_DATA="{
  \"companyName\": \"Test Supplier $(date +%s)\",
  \"contactPerson\": \"John Doe\",
  \"phone\": \"02121234567\",
  \"email\": \"supplier$(date +%s)@example.com\",
  \"address\": \"Test Address\",
  \"city\": \"Istanbul\",
  \"isActive\": true
}"
test_endpoint "POST" "/suppliers" "$SUPPLIER_DATA" "Create Supplier"

# Step 6: Summary
echo -e "\n========================================="
echo -e "  ${YELLOW}Test Summary${NC}"
echo "========================================="
echo -e "Total Tests:  $TOTAL"
echo -e "${GREEN}Passed:       $PASSED${NC}"
echo -e "${RED}Failed:       $FAILED${NC}"
echo "========================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
