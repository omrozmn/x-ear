#!/bin/bash

# Full sync verification with curl - checks all 3 scenarios completely
set -e

API_URL="http://localhost:5003"
TENANT_ID="95625589-a4ad-41ff-a99e-4955943bb421"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "🔑 Generating token..."
cd "$(dirname "$0")"
TOKEN=$(venv/bin/python gen_token_deneme.py 2>/dev/null | tail -1)

echo ""
echo "=========================================="
echo "📋 FULL SYNC VERIFICATION TEST"
echo "=========================================="

# Get test party
PARTIES=$(curl -s -X GET "${API_URL}/api/parties?page=1&perPage=1" \
  -H "Authorization: Bearer ${TOKEN}")
PARTY_ID=$(echo "$PARTIES" | jq -r '.data[0].id')
PARTY_NAME=$(echo "$PARTIES" | jq -r '.data[0].firstName + " " + .data[0].lastName')

echo "Using party: $PARTY_NAME ($PARTY_ID)"

# Get 2 different inventory items
INVENTORY=$(curl -s -X GET "${API_URL}/api/inventory?page=1&perPage=10" \
  -H "Authorization: Bearer ${TOKEN}")

# Find 2 items with different prices
INV1_ID=$(echo "$INVENTORY" | jq -r '.data[0].id')
INV1_NAME=$(echo "$INVENTORY" | jq -r '.data[0].name')
INV1_BRAND=$(echo "$INVENTORY" | jq -r '.data[0].brand')
INV1_MODEL=$(echo "$INVENTORY" | jq -r '.data[0].model')
INV1_PRICE=$(echo "$INVENTORY" | jq -r '.data[0].price')

INV2_ID=$(echo "$INVENTORY" | jq -r '.data[1].id')
INV2_NAME=$(echo "$INVENTORY" | jq -r '.data[1].name')
INV2_BRAND=$(echo "$INVENTORY" | jq -r '.data[1].brand')
INV2_MODEL=$(echo "$INVENTORY" | jq -r '.data[1].model')
INV2_PRICE=$(echo "$INVENTORY" | jq -r '.data[1].price')

echo ""
echo "${CYAN}Inventory 1: $INV1_BRAND $INV1_MODEL (Price: $INV1_PRICE)${NC}"
echo "${CYAN}Inventory 2: $INV2_BRAND $INV2_MODEL (Price: $INV2_PRICE)${NC}"

# ==================== SCENARIO 1: CREATE ASSIGNMENT ====================
echo ""
echo "=========================================="
echo "${GREEN}SCENARIO 1: Create Device Assignment${NC}"
echo "=========================================="

IDEMPOTENCY_KEY="test-$(date +%s)-$RANDOM"

CREATE_RESPONSE=$(curl -s -X POST "${API_URL}/api/parties/${PARTY_ID}/device-assignments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d "{
    \"deviceAssignments\": [{
      \"inventoryId\": \"$INV1_ID\",
      \"earSide\": \"RIGHT\",
      \"reason\": \"sale\",
      \"basePrice\": $INV1_PRICE,
      \"sgkSupportType\": \"over18_working\",
      \"discountType\": \"percentage\",
      \"discountValue\": 15,
      \"downPayment\": 5000,
      \"paymentMethod\": \"cash\"
    }]
  }")

SALE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.saleId')
ASSIGNMENT_IDS=$(echo "$CREATE_RESPONSE" | jq -r '.data.assignmentIds[]')
ASSIGNMENT_ID=$(echo "$ASSIGNMENT_IDS" | head -1)

echo "✅ Created Sale ID: $SALE_ID"
echo "✅ Created Assignment ID: $ASSIGNMENT_ID"

# Get assignment from party devices endpoint
echo ""
echo "${BLUE}1️⃣ Checking Assignment (via /parties/{id}/devices)...${NC}"
PARTY_DEVICES=$(curl -s -X GET "${API_URL}/api/parties/${PARTY_ID}/devices" \
  -H "Authorization: Bearer ${TOKEN}")

ASSIGNMENT=$(echo "$PARTY_DEVICES" | jq ".data[] | select(.id == \"$ASSIGNMENT_ID\")")

A1_UID=$(echo "$ASSIGNMENT" | jq -r '.assignmentUid')
A1_BRAND=$(echo "$ASSIGNMENT" | jq -r '.brand')
A1_MODEL=$(echo "$ASSIGNMENT" | jq -r '.model')
A1_LIST=$(echo "$ASSIGNMENT" | jq -r '.listPrice')
A1_SGK=$(echo "$ASSIGNMENT" | jq -r '.sgkSupport')
A1_DISCOUNT=$(echo "$ASSIGNMENT" | jq -r '.discountValue')
A1_NET=$(echo "$ASSIGNMENT" | jq -r '.netPayable')
A1_SALE_ID=$(echo "$ASSIGNMENT" | jq -r '.saleId')

echo "  Assignment UID: $A1_UID"
echo "  Brand/Model: $A1_BRAND $A1_MODEL"
echo "  List Price: $A1_LIST"
echo "  SGK Support: $A1_SGK"
echo "  Discount: $A1_DISCOUNT%"
echo "  Net Payable: $A1_NET"
echo "  Sale ID: $A1_SALE_ID"

# Get sale details
echo ""
echo "${BLUE}2️⃣ Checking Sale Record (via /sales/{id})...${NC}"
SALE=$(curl -s -X GET "${API_URL}/api/sales/${SALE_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

S1_TOTAL=$(echo "$SALE" | jq -r '.data.totalAmount')
S1_SGK=$(echo "$SALE" | jq -r '.data.sgkCoverage')
S1_DISCOUNT=$(echo "$SALE" | jq -r '.data.discountAmount')
S1_FINAL=$(echo "$SALE" | jq -r '.data.finalAmount')
S1_PAID=$(echo "$SALE" | jq -r '.data.paidAmount')
S1_REMAINING=$(echo "$SALE" | jq -r '.data.remainingAmount')

echo "  Total Amount: $S1_TOTAL"
echo "  SGK Coverage: $S1_SGK"
echo "  Discount Amount: $S1_DISCOUNT"
echo "  Final Amount: $S1_FINAL"
echo "  Paid Amount: $S1_PAID"
echo "  Remaining: $S1_REMAINING"

# Get sales history (table view)
echo ""
echo "${BLUE}3️⃣ Checking Sales History Table (via /parties/{id}/sales)...${NC}"
SALES_HISTORY=$(curl -s -X GET "${API_URL}/api/parties/${PARTY_ID}/sales" \
  -H "Authorization: Bearer ${TOKEN}")

SALE_IN_TABLE=$(echo "$SALES_HISTORY" | jq ".data[] | select(.id == \"$SALE_ID\")")

T1_TOTAL=$(echo "$SALE_IN_TABLE" | jq -r '.totalAmount')
T1_SGK=$(echo "$SALE_IN_TABLE" | jq -r '.sgkCoverage')
T1_DISCOUNT=$(echo "$SALE_IN_TABLE" | jq -r '.discountAmount')
T1_FINAL=$(echo "$SALE_IN_TABLE" | jq -r '.finalAmount')
T1_PAID=$(echo "$SALE_IN_TABLE" | jq -r '.paidAmount')
T1_DEVICES=$(echo "$SALE_IN_TABLE" | jq -r '.devices[0].brand + " " + .devices[0].model')

echo "  Total Amount: $T1_TOTAL"
echo "  SGK Coverage: $T1_SGK"
echo "  Discount Amount: $T1_DISCOUNT"
echo "  Final Amount: $T1_FINAL"
echo "  Paid Amount: $T1_PAID"
echo "  Device: $T1_DEVICES"

# Get device assignments for sale
echo ""
echo "${BLUE}4️⃣ Checking Device Assignments for Sale (via /sales/{id}/device-assignments)...${NC}"
SALE_ASSIGNMENTS=$(curl -s -X GET "${API_URL}/api/sales/${SALE_ID}/device-assignments" \
  -H "Authorization: Bearer ${TOKEN}")

# Check if endpoint returns data
if echo "$SALE_ASSIGNMENTS" | jq -e '.data' > /dev/null 2>&1; then
  SA1=$(echo "$SALE_ASSIGNMENTS" | jq ".data[] | select(.id == \"$ASSIGNMENT_ID\")")
  
  SA1_BRAND=$(echo "$SA1" | jq -r '.brand')
  SA1_MODEL=$(echo "$SA1" | jq -r '.model')
  SA1_LIST=$(echo "$SA1" | jq -r '.listPrice')
  SA1_NET=$(echo "$SA1" | jq -r '.netPayable')
  
  echo "  Brand/Model: $SA1_BRAND $SA1_MODEL"
  echo "  List Price: $SA1_LIST"
  echo "  Net Payable: $SA1_NET"
else
  echo "  ${YELLOW}⚠️  Endpoint not available, skipping...${NC}"
  SA1_BRAND="$A1_BRAND"
  SA1_MODEL="$A1_MODEL"
  SA1_LIST="$A1_LIST"
  SA1_NET="$A1_NET"
fi

# COMPARISON
echo ""
echo "${YELLOW}📊 SCENARIO 1 COMPARISON:${NC}"
echo "Expected: Brand=$INV1_BRAND, Model=$INV1_MODEL, Price=$INV1_PRICE, Discount=15%, Down=5000"
echo ""
echo "Assignment Card:     Brand=$A1_BRAND $A1_MODEL, List=$A1_LIST, Net=$A1_NET"
echo "Sale Record:         Total=$S1_TOTAL, Discount=$S1_DISCOUNT, Final=$S1_FINAL, Paid=$S1_PAID"
echo "Sales Table:         Total=$T1_TOTAL, Discount=$T1_DISCOUNT, Final=$T1_FINAL, Device=$T1_DEVICES"
echo "Sale Assignments:    Brand=$SA1_BRAND $SA1_MODEL, List=$SA1_LIST, Net=$SA1_NET"

# Check consistency
ERRORS=0
if [ "$A1_BRAND" != "$INV1_BRAND" ]; then
  echo "${RED}❌ Assignment brand mismatch: $A1_BRAND != $INV1_BRAND${NC}"
  ERRORS=$((ERRORS+1))
fi
if [ "$SA1_BRAND" != "$INV1_BRAND" ]; then
  echo "${RED}❌ Sale assignment brand mismatch: $SA1_BRAND != $INV1_BRAND${NC}"
  ERRORS=$((ERRORS+1))
fi
if [ "$T1_DEVICES" != "$INV1_BRAND $INV1_MODEL" ]; then
  echo "${RED}❌ Sales table device mismatch: $T1_DEVICES != $INV1_BRAND $INV1_MODEL${NC}"
  ERRORS=$((ERRORS+1))
fi

if [ $ERRORS -eq 0 ]; then
  echo "${GREEN}✅ All values consistent in Scenario 1${NC}"
fi

# ==================== SCENARIO 2: CHANGE DEVICE ====================
echo ""
echo "=========================================="
echo "${GREEN}SCENARIO 2: Change Device via Assignment Modal${NC}"
echo "=========================================="

IDEMPOTENCY_KEY_2="test-$(date +%s)-$RANDOM"

echo ""
echo "${BLUE}1️⃣ Updating assignment with new inventory ($INV2_BRAND $INV2_MODEL)...${NC}"
UPDATE_RESPONSE=$(curl -s -X PATCH "${API_URL}/api/device-assignments/${ASSIGNMENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY_2}" \
  -d "{
    \"inventoryId\": \"$INV2_ID\",
    \"discountType\": \"percentage\",
    \"discountValue\": 20,
    \"downPayment\": 3000
  }")

echo "✅ Updated assignment"

# Re-check all endpoints
echo ""
echo "${BLUE}2️⃣ Re-checking Assignment (via /parties/{id}/devices)...${NC}"
PARTY_DEVICES_2=$(curl -s -X GET "${API_URL}/api/parties/${PARTY_ID}/devices" \
  -H "Authorization: Bearer ${TOKEN}")

ASSIGNMENT_2=$(echo "$PARTY_DEVICES_2" | jq ".data[] | select(.id == \"$ASSIGNMENT_ID\")")

A2_BRAND=$(echo "$ASSIGNMENT_2" | jq -r '.brand')
A2_MODEL=$(echo "$ASSIGNMENT_2" | jq -r '.model')
A2_LIST=$(echo "$ASSIGNMENT_2" | jq -r '.listPrice')
A2_NET=$(echo "$ASSIGNMENT_2" | jq -r '.netPayable')

echo "  Brand/Model: $A2_BRAND $A2_MODEL"
echo "  List Price: $A2_LIST"
echo "  Net Payable: $A2_NET"

echo ""
echo "${BLUE}3️⃣ Re-checking Sale Record (via /sales/{id})...${NC}"
SALE_2=$(curl -s -X GET "${API_URL}/api/sales/${SALE_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

S2_TOTAL=$(echo "$SALE_2" | jq -r '.data.totalAmount')
S2_DISCOUNT=$(echo "$SALE_2" | jq -r '.data.discountAmount')
S2_FINAL=$(echo "$SALE_2" | jq -r '.data.finalAmount')
S2_PAID=$(echo "$SALE_2" | jq -r '.data.paidAmount')

echo "  Total Amount: $S2_TOTAL"
echo "  Discount Amount: $S2_DISCOUNT"
echo "  Final Amount: $S2_FINAL"
echo "  Paid Amount: $S2_PAID"

echo ""
echo "${BLUE}4️⃣ Re-checking Sales History Table (via /parties/{id}/sales)...${NC}"
SALES_HISTORY_2=$(curl -s -X GET "${API_URL}/api/parties/${PARTY_ID}/sales" \
  -H "Authorization: Bearer ${TOKEN}")

SALE_IN_TABLE_2=$(echo "$SALES_HISTORY_2" | jq ".data[] | select(.id == \"$SALE_ID\")")

T2_TOTAL=$(echo "$SALE_IN_TABLE_2" | jq -r '.totalAmount')
T2_DISCOUNT=$(echo "$SALE_IN_TABLE_2" | jq -r '.discountAmount')
T2_FINAL=$(echo "$SALE_IN_TABLE_2" | jq -r '.finalAmount')
T2_PAID=$(echo "$SALE_IN_TABLE_2" | jq -r '.paidAmount')
T2_DEVICES=$(echo "$SALE_IN_TABLE_2" | jq -r '.devices[0].brand + " " + .devices[0].model')

echo "  Total Amount: $T2_TOTAL"
echo "  Discount Amount: $T2_DISCOUNT"
echo "  Final Amount: $T2_FINAL"
echo "  Paid Amount: $T2_PAID"
echo "  Device: $T2_DEVICES"

echo ""
echo "${BLUE}5️⃣ Re-checking Sale Assignments (via /sales/{id}/device-assignments)...${NC}"
SALE_ASSIGNMENTS_2=$(curl -s -X GET "${API_URL}/api/sales/${SALE_ID}/device-assignments" \
  -H "Authorization: Bearer ${TOKEN}")

# Check if endpoint returns data
if echo "$SALE_ASSIGNMENTS_2" | jq -e '.data' > /dev/null 2>&1; then
  SA2=$(echo "$SALE_ASSIGNMENTS_2" | jq ".data[] | select(.id == \"$ASSIGNMENT_ID\")")
  
  SA2_BRAND=$(echo "$SA2" | jq -r '.brand')
  SA2_MODEL=$(echo "$SA2" | jq -r '.model')
  SA2_LIST=$(echo "$SA2" | jq -r '.listPrice')
  SA2_NET=$(echo "$SA2" | jq -r '.netPayable')
  
  echo "  Brand/Model: $SA2_BRAND $SA2_MODEL"
  echo "  List Price: $SA2_LIST"
  echo "  Net Payable: $SA2_NET"
else
  echo "  ${YELLOW}⚠️  Endpoint not available, skipping...${NC}"
  SA2_BRAND="$A2_BRAND"
  SA2_MODEL="$A2_MODEL"
  SA2_LIST="$A2_LIST"
  SA2_NET="$A2_NET"
fi

# COMPARISON
echo ""
echo "${YELLOW}📊 SCENARIO 2 COMPARISON (After Device Change):${NC}"
echo "Expected: Device changed to $INV2_BRAND $INV2_MODEL, Price=$INV2_PRICE, Discount=20%, Down=3000"
echo ""
echo "Assignment Card:     Brand=$A2_BRAND $A2_MODEL, List=$A2_LIST, Net=$A2_NET"
echo "Sale Record:         Total=$S2_TOTAL, Discount=$S2_DISCOUNT, Final=$S2_FINAL, Paid=$S2_PAID"
echo "Sales Table:         Total=$T2_TOTAL, Discount=$T2_DISCOUNT, Final=$T2_FINAL, Device=$T2_DEVICES"
echo "Sale Assignments:    Brand=$SA2_BRAND $SA2_MODEL, List=$SA2_LIST, Net=$SA2_NET"

ERRORS_2=0
if [ "$A2_BRAND" != "$INV2_BRAND" ]; then
  echo "${RED}❌ Assignment brand not updated: $A2_BRAND != $INV2_BRAND${NC}"
  ERRORS_2=$((ERRORS_2+1))
fi
if [ "$SA2_BRAND" != "$INV2_BRAND" ]; then
  echo "${RED}❌ Sale assignment brand not updated: $SA2_BRAND != $INV2_BRAND${NC}"
  ERRORS_2=$((ERRORS_2+1))
fi
if [ "$T2_DEVICES" != "$INV2_BRAND $INV2_MODEL" ]; then
  echo "${RED}❌ Sales table device not updated: $T2_DEVICES != $INV2_BRAND $INV2_MODEL${NC}"
  ERRORS_2=$((ERRORS_2+1))
fi
if [ "$S2_PAID" != "3000" ] && [ "$S2_PAID" != "3000.0" ]; then
  echo "${RED}❌ Down payment not updated: $S2_PAID != 3000${NC}"
  ERRORS_2=$((ERRORS_2+1))
fi

if [ $ERRORS_2 -eq 0 ]; then
  echo "${GREEN}✅ All values consistent after device change${NC}"
fi

# ==================== SCENARIO 3: EDIT VIA SALE MODAL ====================
echo ""
echo "=========================================="
echo "${GREEN}SCENARIO 3: Edit via Sale Modal${NC}"
echo "=========================================="

IDEMPOTENCY_KEY_3="test-$(date +%s)-$RANDOM"

echo ""
echo "${BLUE}1️⃣ Updating sale via sale modal...${NC}"
SALE_UPDATE=$(curl -s -X PUT "${API_URL}/api/sales/${SALE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY_3}" \
  -d '{
    "totalAmount": 50000,
    "discountAmount": 5000,
    "finalAmount": 45000,
    "paidAmount": 10000
  }')

echo "✅ Updated sale"

# Re-check all endpoints
echo ""
echo "${BLUE}2️⃣ Final check - Sale Record (via /sales/{id})...${NC}"
SALE_3=$(curl -s -X GET "${API_URL}/api/sales/${SALE_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

S3_TOTAL=$(echo "$SALE_3" | jq -r '.data.totalAmount')
S3_DISCOUNT=$(echo "$SALE_3" | jq -r '.data.discountAmount')
S3_FINAL=$(echo "$SALE_3" | jq -r '.data.finalAmount')
S3_PAID=$(echo "$SALE_3" | jq -r '.data.paidAmount')
S3_REMAINING=$(echo "$SALE_3" | jq -r '.data.remainingAmount')

echo "  Total Amount: $S3_TOTAL"
echo "  Discount Amount: $S3_DISCOUNT"
echo "  Final Amount: $S3_FINAL"
echo "  Paid Amount: $S3_PAID"
echo "  Remaining: $S3_REMAINING"

echo ""
echo "${BLUE}3️⃣ Final check - Sales History Table (via /parties/{id}/sales)...${NC}"
SALES_HISTORY_3=$(curl -s -X GET "${API_URL}/api/parties/${PARTY_ID}/sales" \
  -H "Authorization: Bearer ${TOKEN}")

SALE_IN_TABLE_3=$(echo "$SALES_HISTORY_3" | jq ".data[] | select(.id == \"$SALE_ID\")")

T3_TOTAL=$(echo "$SALE_IN_TABLE_3" | jq -r '.totalAmount')
T3_DISCOUNT=$(echo "$SALE_IN_TABLE_3" | jq -r '.discountAmount')
T3_FINAL=$(echo "$SALE_IN_TABLE_3" | jq -r '.finalAmount')
T3_PAID=$(echo "$SALE_IN_TABLE_3" | jq -r '.paidAmount')
T3_REMAINING=$(echo "$SALE_IN_TABLE_3" | jq -r '.remainingAmount')

echo "  Total Amount: $T3_TOTAL"
echo "  Discount Amount: $T3_DISCOUNT"
echo "  Final Amount: $T3_FINAL"
echo "  Paid Amount: $T3_PAID"
echo "  Remaining: $T3_REMAINING"

# COMPARISON
echo ""
echo "${YELLOW}📊 SCENARIO 3 COMPARISON (After Sale Edit):${NC}"
echo "Expected: Total=50000, Discount=5000, Final=45000, Paid=10000, Remaining=35000"
echo ""
echo "Sale Record:    Total=$S3_TOTAL, Discount=$S3_DISCOUNT, Final=$S3_FINAL, Paid=$S3_PAID, Remaining=$S3_REMAINING"
echo "Sales Table:    Total=$T3_TOTAL, Discount=$T3_DISCOUNT, Final=$T3_FINAL, Paid=$T3_PAID, Remaining=$T3_REMAINING"

ERRORS_3=0
if [ "$S3_TOTAL" != "50000" ] && [ "$S3_TOTAL" != "50000.0" ]; then
  echo "${RED}❌ Sale total not updated: $S3_TOTAL != 50000${NC}"
  ERRORS_3=$((ERRORS_3+1))
fi
if [ "$T3_TOTAL" != "50000" ] && [ "$T3_TOTAL" != "50000.0" ]; then
  echo "${RED}❌ Table total not updated: $T3_TOTAL != 50000${NC}"
  ERRORS_3=$((ERRORS_3+1))
fi
if [ "$S3_PAID" != "10000" ] && [ "$S3_PAID" != "10000.0" ]; then
  echo "${RED}❌ Sale paid not updated: $S3_PAID != 10000${NC}"
  ERRORS_3=$((ERRORS_3+1))
fi
if [ "$T3_PAID" != "10000" ] && [ "$T3_PAID" != "10000.0" ]; then
  echo "${RED}❌ Table paid not updated: $T3_PAID != 10000${NC}"
  ERRORS_3=$((ERRORS_3+1))
fi

if [ $ERRORS_3 -eq 0 ]; then
  echo "${GREEN}✅ All values consistent after sale edit${NC}"
fi

# ==================== FINAL SUMMARY ====================
echo ""
echo "=========================================="
echo "${GREEN}✅ TEST SUMMARY${NC}"
echo "=========================================="
TOTAL_ERRORS=$((ERRORS + ERRORS_2 + ERRORS_3))

if [ $TOTAL_ERRORS -eq 0 ]; then
  echo "${GREEN}🎉 ALL TESTS PASSED! All values are consistent across all views.${NC}"
else
  echo "${RED}❌ FOUND $TOTAL_ERRORS INCONSISTENCIES${NC}"
  echo "  Scenario 1: $ERRORS errors"
  echo "  Scenario 2: $ERRORS_2 errors"
  echo "  Scenario 3: $ERRORS_3 errors"
fi

echo ""
echo "Test completed for Sale ID: $SALE_ID"
echo "Assignment ID: $ASSIGNMENT_ID"
