#!/bin/bash

# Comprehensive test for device assignment, sale, and sync consistency
# Tests 3 scenarios:
# 1. Create device assignment → Check sale record
# 2. Change device via assignment modal → Check everywhere
# 3. Edit via sale modal → Check everywhere

set -e

API_URL="http://localhost:5003"
TENANT_ID="95625589-a4ad-41ff-a99e-4955943bb421"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔑 Generating token..."
cd "$(dirname "$0")"
TOKEN=$(python gen_token_deneme.py)

echo ""
echo "=========================================="
echo "📋 COMPREHENSIVE SYNC TEST"
echo "=========================================="

# Get a test party
echo ""
echo "${BLUE}🔍 Finding test party...${NC}"
PARTIES=$(curl -s -X GET "${API_URL}/api/parties?page=1&perPage=1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

PARTY_ID=$(echo "$PARTIES" | jq -r '.data[0].id')
PARTY_NAME=$(echo "$PARTIES" | jq -r '.data[0].firstName + " " + .data[0].lastName')

echo "Using party: $PARTY_NAME ($PARTY_ID)"

# Get inventory items
echo ""
echo "${BLUE}🔍 Finding inventory items...${NC}"
INVENTORY=$(curl -s -X GET "${API_URL}/api/inventory?page=1&perPage=5" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

INV1_ID=$(echo "$INVENTORY" | jq -r '.data[0].id')
INV1_NAME=$(echo "$INVENTORY" | jq -r '.data[0].name')
INV1_PRICE=$(echo "$INVENTORY" | jq -r '.data[0].price')

INV2_ID=$(echo "$INVENTORY" | jq -r '.data[1].id')
INV2_NAME=$(echo "$INVENTORY" | jq -r '.data[1].name')
INV2_PRICE=$(echo "$INVENTORY" | jq -r '.data[1].price')

echo "Inventory 1: $INV1_NAME (ID: $INV1_ID, Price: $INV1_PRICE)"
echo "Inventory 2: $INV2_NAME (ID: $INV2_ID, Price: $INV2_PRICE)"

# ==================== SCENARIO 1: CREATE ASSIGNMENT ====================
echo ""
echo "=========================================="
echo "${GREEN}SCENARIO 1: Create Device Assignment${NC}"
echo "=========================================="

echo ""
echo "1️⃣ Creating device assignment..."
CREATE_PAYLOAD=$(cat <<EOF
{
  "deviceAssignments": [
    {
      "inventoryId": "$INV1_ID",
      "earSide": "RIGHT",
      "reason": "sale",
      "basePrice": $INV1_PRICE,
      "sgkSupportType": "over18_working",
      "discountType": "percentage",
      "discountValue": 15,
      "downPayment": 5000,
      "paymentMethod": "cash"
    }
  ]
}
EOF
)

IDEMPOTENCY_KEY="test-$(date +%s)-$RANDOM"

CREATE_RESPONSE=$(curl -s -X POST "${API_URL}/api/parties/${PARTY_ID}/device-assignments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d "$CREATE_PAYLOAD")

SALE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.saleId')
ASSIGNMENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.assignmentIds[0]')

echo "✅ Created Sale ID: $SALE_ID"
echo "✅ Created Assignment ID: $ASSIGNMENT_ID"

# Get assignment details
echo ""
echo "2️⃣ Getting assignment details..."
ASSIGNMENT=$(curl -s -X GET "${API_URL}/api/device-assignments/${ASSIGNMENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Assignment Details:"
echo "$ASSIGNMENT" | jq '{
  assignmentUid: .data.assignmentUid,
  inventoryId: .data.inventoryId,
  listPrice: .data.listPrice,
  sgkSupport: .data.sgkSupport,
  discountValue: .data.discountValue,
  netPayable: .data.netPayable,
  brand: .data.brand,
  model: .data.model
}'

# Get sale details
echo ""
echo "3️⃣ Getting sale details..."
SALE=$(curl -s -X GET "${API_URL}/api/sales/${SALE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Sale Details:"
echo "$SALE" | jq '{
  id: .data.id,
  totalAmount: .data.totalAmount,
  sgkCoverage: .data.sgkCoverage,
  discountAmount: .data.discountAmount,
  finalAmount: .data.finalAmount,
  paidAmount: .data.paidAmount
}'

# Compare values
echo ""
echo "${YELLOW}📊 COMPARISON - Assignment vs Sale:${NC}"
ASSIGN_LIST=$(echo "$ASSIGNMENT" | jq -r '.data.listPrice')
ASSIGN_SGK=$(echo "$ASSIGNMENT" | jq -r '.data.sgkSupport')
ASSIGN_NET=$(echo "$ASSIGNMENT" | jq -r '.data.netPayable')

SALE_TOTAL=$(echo "$SALE" | jq -r '.data.totalAmount')
SALE_SGK=$(echo "$SALE" | jq -r '.data.sgkCoverage')
SALE_FINAL=$(echo "$SALE" | jq -r '.data.finalAmount')
SALE_PAID=$(echo "$SALE" | jq -r '.data.paidAmount')

echo "List Price:    Assignment=$ASSIGN_LIST | Sale Total=$SALE_TOTAL"
echo "SGK Support:   Assignment=$ASSIGN_SGK | Sale SGK=$SALE_SGK"
echo "Net Payable:   Assignment=$ASSIGN_NET | Sale Final=$SALE_FINAL"
echo "Down Payment:  5000 | Sale Paid=$SALE_PAID"

# ==================== SCENARIO 2: CHANGE DEVICE VIA ASSIGNMENT MODAL ====================
echo ""
echo "=========================================="
echo "${GREEN}SCENARIO 2: Change Device via Assignment Modal${NC}"
echo "=========================================="

echo ""
echo "1️⃣ Updating assignment with new inventory..."
UPDATE_PAYLOAD=$(cat <<EOF
{
  "inventoryId": "$INV2_ID",
  "discountType": "percentage",
  "discountValue": 20,
  "downPayment": 3000
}
EOF
)

IDEMPOTENCY_KEY_1="test-$(date +%s)-$RANDOM"

UPDATE_RESPONSE=$(curl -s -X PUT "${API_URL}/api/device-assignments/${ASSIGNMENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY_1}" \
  -d "$UPDATE_PAYLOAD")

echo "✅ Updated assignment"

# Get updated assignment
echo ""
echo "2️⃣ Getting updated assignment details..."
ASSIGNMENT_UPDATED=$(curl -s -X GET "${API_URL}/api/device-assignments/${ASSIGNMENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Updated Assignment Details:"
echo "$ASSIGNMENT_UPDATED" | jq '{
  assignmentUid: .data.assignmentUid,
  inventoryId: .data.inventoryId,
  listPrice: .data.listPrice,
  sgkSupport: .data.sgkSupport,
  discountValue: .data.discountValue,
  netPayable: .data.netPayable,
  brand: .data.brand,
  model: .data.model
}'

# Get updated sale
echo ""
echo "3️⃣ Getting updated sale details..."
SALE_UPDATED=$(curl -s -X GET "${API_URL}/api/sales/${SALE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Updated Sale Details:"
echo "$SALE_UPDATED" | jq '{
  id: .data.id,
  totalAmount: .data.totalAmount,
  sgkCoverage: .data.sgkCoverage,
  discountAmount: .data.discountAmount,
  finalAmount: .data.finalAmount,
  paidAmount: .data.paidAmount
}'

# Get device assignments for party (to check card display)
echo ""
echo "4️⃣ Getting party device assignments (for card display)..."
PARTY_DEVICES=$(curl -s -X GET "${API_URL}/api/parties/${PARTY_ID}/devices" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Party Device Card Data:"
echo "$PARTY_DEVICES" | jq '.data[] | select(.id == "'$ASSIGNMENT_ID'") | {
  assignmentUid: .assignmentUid,
  saleId: .saleId,
  brand: .brand,
  model: .model,
  listPrice: .listPrice,
  netPayable: .netPayable
}'

# Compare after device change
echo ""
echo "${YELLOW}📊 COMPARISON AFTER DEVICE CHANGE:${NC}"
ASSIGN_LIST_NEW=$(echo "$ASSIGNMENT_UPDATED" | jq -r '.data.listPrice')
ASSIGN_NET_NEW=$(echo "$ASSIGNMENT_UPDATED" | jq -r '.data.netPayable')
ASSIGN_BRAND_NEW=$(echo "$ASSIGNMENT_UPDATED" | jq -r '.data.brand')

SALE_TOTAL_NEW=$(echo "$SALE_UPDATED" | jq -r '.data.totalAmount')
SALE_FINAL_NEW=$(echo "$SALE_UPDATED" | jq -r '.data.finalAmount')
SALE_PAID_NEW=$(echo "$SALE_UPDATED" | jq -r '.data.paidAmount')

echo "Expected: Inventory changed from $INV1_NAME to $INV2_NAME"
echo "Expected: Price changed from $INV1_PRICE to $INV2_PRICE"
echo ""
echo "Assignment Brand: $ASSIGN_BRAND_NEW (should be from $INV2_NAME)"
echo "Assignment List Price: $ASSIGN_LIST_NEW (should be $INV2_PRICE)"
echo "Sale Total: $SALE_TOTAL_NEW (should match assignment list price)"
echo "Assignment Net Payable: $ASSIGN_NET_NEW"
echo "Sale Final: $SALE_FINAL_NEW (should match assignment net payable)"
echo "Sale Paid: $SALE_PAID_NEW (should be 3000)"

# ==================== SCENARIO 3: EDIT VIA SALE MODAL ====================
echo ""
echo "=========================================="
echo "${GREEN}SCENARIO 3: Edit via Sale Modal${NC}"
echo "=========================================="

echo ""
echo "1️⃣ Updating sale via sale modal..."
SALE_UPDATE_PAYLOAD=$(cat <<EOF
{
  "totalAmount": 50000,
  "discountAmount": 5000,
  "finalAmount": 45000,
  "paidAmount": 10000
}
EOF
)

IDEMPOTENCY_KEY_2="test-$(date +%s)-$RANDOM"

SALE_UPDATE_RESPONSE=$(curl -s -X PUT "${API_URL}/api/sales/${SALE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY_2}" \
  -d "$SALE_UPDATE_PAYLOAD")

echo "✅ Updated sale"

# Get final sale state
echo ""
echo "2️⃣ Getting final sale details..."
SALE_FINAL=$(curl -s -X GET "${API_URL}/api/sales/${SALE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Final Sale Details:"
echo "$SALE_FINAL" | jq '{
  id: .data.id,
  totalAmount: .data.totalAmount,
  discountAmount: .data.discountAmount,
  finalAmount: .data.finalAmount,
  paidAmount: .data.paidAmount,
  remainingAmount: .data.remainingAmount
}'

# Get final assignment state
echo ""
echo "3️⃣ Getting final assignment details..."
ASSIGNMENT_FINAL=$(curl -s -X GET "${API_URL}/api/device-assignments/${ASSIGNMENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Final Assignment Details:"
echo "$ASSIGNMENT_FINAL" | jq '{
  assignmentUid: .data.assignmentUid,
  listPrice: .data.listPrice,
  netPayable: .data.netPayable
}'

# Get sales history (table view)
echo ""
echo "4️⃣ Getting sales history (table view)..."
SALES_HISTORY=$(curl -s -X GET "${API_URL}/api/parties/${PARTY_ID}/sales" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Sales History Table Data:"
echo "$SALES_HISTORY" | jq '.data[] | select(.id == "'$SALE_ID'") | {
  id: .id,
  totalAmount: .totalAmount,
  discountAmount: .discountAmount,
  finalAmount: .finalAmount,
  paidAmount: .paidAmount,
  remainingAmount: .remainingAmount,
  devices: .devices
}'

# Final comparison
echo ""
echo "${YELLOW}📊 FINAL COMPARISON:${NC}"
SALE_TOTAL_FINAL=$(echo "$SALE_FINAL" | jq -r '.data.totalAmount')
SALE_DISCOUNT_FINAL=$(echo "$SALE_FINAL" | jq -r '.data.discountAmount')
SALE_FINAL_AMT=$(echo "$SALE_FINAL" | jq -r '.data.finalAmount')
SALE_PAID_FINAL=$(echo "$SALE_FINAL" | jq -r '.data.paidAmount')
SALE_REMAINING=$(echo "$SALE_FINAL" | jq -r '.data.remainingAmount')

echo "Sale Total: $SALE_TOTAL_FINAL (expected: 50000)"
echo "Sale Discount: $SALE_DISCOUNT_FINAL (expected: 5000)"
echo "Sale Final: $SALE_FINAL_AMT (expected: 45000)"
echo "Sale Paid: $SALE_PAID_FINAL (expected: 10000)"
echo "Sale Remaining: $SALE_REMAINING (expected: 35000)"

# ==================== SUMMARY ====================
echo ""
echo "=========================================="
echo "${GREEN}✅ TEST SUMMARY${NC}"
echo "=========================================="
echo ""
echo "Scenario 1: Device assignment created"
echo "  - Sale ID: $SALE_ID"
echo "  - Assignment ID: $ASSIGNMENT_ID"
echo ""
echo "Scenario 2: Device changed via assignment modal"
echo "  - Inventory changed: $INV1_NAME → $INV2_NAME"
echo "  - Price changed: $INV1_PRICE → $INV2_PRICE"
echo ""
echo "Scenario 3: Sale edited via sale modal"
echo "  - Manual price updates applied"
echo ""
echo "${YELLOW}⚠️  MANUAL VERIFICATION NEEDED:${NC}"
echo "1. Check frontend device card shows correct brand/model"
echo "2. Check sales history table shows correct amounts"
echo "3. Check EditSaleModal shows correct values"
echo "4. Check all three views are in sync"
echo ""
echo "Test completed! Review the output above for any discrepancies."
