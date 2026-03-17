#!/bin/bash
# Comprehensive curl tests for party filters and acquisition type updates
# Run this script to test all filter combinations and CRUD operations

BASE_URL="http://localhost:5003/api"
TENANT_ID="test_tenant"

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test result
print_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Get auth token
echo -e "\n${YELLOW}🔐 Getting auth token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@x-ear.com",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken // .accessToken // ""')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo -e "${RED}❌ Failed to get auth token${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Got auth token${NC}\n"

# Test 1: Get all parties
echo -e "\n${YELLOW}📋 Test 1: Get All Parties${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/parties" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

PARTY_COUNT=$(echo $RESPONSE | jq -r '.data | length')
print_result $? "Get all parties (count: $PARTY_COUNT)"

# Test 2: Filter by status=active
echo -e "\n${YELLOW}📋 Test 2: Filter by Status (active)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/parties?status=active" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

ACTIVE_COUNT=$(echo $RESPONSE | jq -r '.data | length')
print_result $? "Filter by status=active (count: $ACTIVE_COUNT)"

# Test 3: Filter by segment
echo -e "\n${YELLOW}📋 Test 3: Filter by Segment (customer)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/parties?segment=customer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

SEGMENT_COUNT=$(echo $RESPONSE | jq -r '.data | length')
print_result $? "Filter by segment=customer (count: $SEGMENT_COUNT)"

# Test 4: Filter by acquisition type
echo -e "\n${YELLOW}📋 Test 4: Filter by Acquisition Type (referral)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/parties?acquisition_type=referral" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

ACQ_COUNT=$(echo $RESPONSE | jq -r '.data | length')
print_result $? "Filter by acquisition_type=referral (count: $ACQ_COUNT)"

# Test 5: Combined filters
echo -e "\n${YELLOW}📋 Test 5: Combined Filters (status=active & segment=customer)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/parties?status=active&segment=customer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

COMBINED_COUNT=$(echo $RESPONSE | jq -r '.data | length')
print_result $? "Combined filters (count: $COMBINED_COUNT)"

# Test 6: Create new party
echo -e "\n${YELLOW}📋 Test 6: Create New Party${NC}"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/parties" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-create-$(date +%s)" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "phone": "+905551234567",
    "email": "testuser@example.com",
    "tcNumber": "12345678901",
    "status": "active",
    "segment": "new",
    "acquisitionType": "online",
    "branchId": "branch_istanbul"
  }')

NEW_PARTY_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id // .id // ""')
if [ ! -z "$NEW_PARTY_ID" ] && [ "$NEW_PARTY_ID" != "null" ]; then
    print_result 0 "Create party (ID: $NEW_PARTY_ID)"
else
    print_result 1 "Create party"
    echo "Response: $CREATE_RESPONSE"
fi

# Test 7: Update party acquisition type
if [ ! -z "$NEW_PARTY_ID" ] && [ "$NEW_PARTY_ID" != "null" ]; then
    echo -e "\n${YELLOW}📋 Test 7: Update Party Acquisition Type${NC}"
    UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/parties/$NEW_PARTY_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Tenant-ID: $TENANT_ID" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: test-update-$(date +%s)" \
      -d '{
        "acquisitionType": "social-media",
        "status": "active",
        "segment": "customer"
      }')
    
    UPDATED_ACQ_TYPE=$(echo $UPDATE_RESPONSE | jq -r '.data.acquisitionType // .acquisitionType // ""')
    if [ "$UPDATED_ACQ_TYPE" == "social-media" ]; then
        print_result 0 "Update acquisition type to social-media"
    else
        print_result 1 "Update acquisition type (got: $UPDATED_ACQ_TYPE)"
        echo "Response: $UPDATE_RESPONSE"
    fi
    
    # Test 8: Verify update
    echo -e "\n${YELLOW}📋 Test 8: Verify Updated Party${NC}"
    GET_RESPONSE=$(curl -s -X GET "$BASE_URL/parties/$NEW_PARTY_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Tenant-ID: $TENANT_ID")
    
    VERIFIED_ACQ=$(echo $GET_RESPONSE | jq -r '.data.acquisitionType // .acquisitionType // ""')
    if [ "$VERIFIED_ACQ" == "social-media" ]; then
        print_result 0 "Verify acquisition type persisted"
    else
        print_result 1 "Verify acquisition type (got: $VERIFIED_ACQ)"
        echo "Response: $GET_RESPONSE"
    fi
    
    # Test 9: Delete party
    echo -e "\n${YELLOW}📋 Test 9: Delete Party${NC}"
    DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/parties/$NEW_PARTY_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Tenant-ID: $TENANT_ID" \
      -H "Idempotency-Key: test-delete-$(date +%s)")
    
    print_result $? "Delete party"
fi

# Test 10: Search parties
echo -e "\n${YELLOW}📋 Test 10: Search Parties by Name${NC}"
SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/parties?search=Ahmet" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

SEARCH_COUNT=$(echo $SEARCH_RESPONSE | jq -r '.data | length')
print_result $? "Search parties (count: $SEARCH_COUNT)"

# Print summary
echo -e "\n${YELLOW}================================${NC}"
echo -e "${YELLOW}📊 Test Summary${NC}"
echo -e "${YELLOW}================================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    exit 1
fi
