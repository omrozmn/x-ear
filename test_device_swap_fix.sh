#!/bin/bash

# Test device swap in assignment modal
# This tests if changing inventory_id updates Sale totals correctly

set -e

# Configuration
API_URL="http://localhost:5003"
TENANT_ID="95625589-a4ad-41ff-a99e-4955943bb421"

# Generate token
echo "🔑 Generating token..."
cd "$(dirname "$0")"
TOKEN=$(python gen_token_deneme.py)

echo "📋 Testing Device Swap Fix"
echo "================================"

# Step 1: Get sale 2602280104 details
echo ""
echo "1️⃣ Getting sale 2602280104 before swap..."
SALE_BEFORE=$(curl -s -X GET "${API_URL}/api/sales/2602280104" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Sale before swap:"
echo "$SALE_BEFORE" | jq '.data | {id, totalAmount, finalAmount, discountAmount, sgkCoverage}'

# Get device assignments
ASSIGNMENTS=$(curl -s -X GET "${API_URL}/api/sales/2602280104/device-assignments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo ""
echo "Device assignments:"
echo "$ASSIGNMENTS" | jq '.data[] | {id, inventoryId, listPrice, netPayable, sgkSupport, ear}'

# Get first assignment ID
ASSIGNMENT_ID=$(echo "$ASSIGNMENTS" | jq -r '.data[0].id')
echo ""
echo "Will update assignment: $ASSIGNMENT_ID"

# Step 2: Find a different inventory item (KDV-TEST-001)
echo ""
echo "2️⃣ Finding inventory item KDV-TEST-001..."
INVENTORY=$(curl -s -X GET "${API_URL}/api/inventory?search=KDV-TEST-001" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

NEW_INVENTORY_ID=$(echo "$INVENTORY" | jq -r '.data[0].id')
NEW_PRICE=$(echo "$INVENTORY" | jq -r '.data[0].price')

echo "Found inventory: $NEW_INVENTORY_ID with price: $NEW_PRICE"

# Step 3: Update assignment with new inventory_id
echo ""
echo "3️⃣ Updating assignment with new inventory_id..."
UPDATE_RESPONSE=$(curl -s -X PUT "${API_URL}/api/device-assignments/${ASSIGNMENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"inventoryId\": \"${NEW_INVENTORY_ID}\"
  }")

echo "Update response:"
echo "$UPDATE_RESPONSE" | jq '.data | {id, inventoryId, listPrice, netPayable, brand, model}'

# Step 4: Get sale details after swap
echo ""
echo "4️⃣ Getting sale 2602280104 after swap..."
SALE_AFTER=$(curl -s -X GET "${API_URL}/api/sales/2602280104" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Sale after swap:"
echo "$SALE_AFTER" | jq '.data | {id, totalAmount, finalAmount, discountAmount, sgkCoverage}'

# Step 5: Get updated assignments
echo ""
echo "5️⃣ Getting updated device assignments..."
ASSIGNMENTS_AFTER=$(curl -s -X GET "${API_URL}/api/sales/2602280104/device-assignments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "Device assignments after swap:"
echo "$ASSIGNMENTS_AFTER" | jq '.data[] | {id, inventoryId, listPrice, netPayable, sgkSupport, brand, model}'

# Verification
echo ""
echo "================================"
echo "✅ VERIFICATION"
echo "================================"

TOTAL_BEFORE=$(echo "$SALE_BEFORE" | jq -r '.data.totalAmount')
TOTAL_AFTER=$(echo "$SALE_AFTER" | jq -r '.data.totalAmount')

echo "Total Amount Before: $TOTAL_BEFORE"
echo "Total Amount After: $TOTAL_AFTER"

if [ "$TOTAL_BEFORE" != "$TOTAL_AFTER" ]; then
  echo "✅ SUCCESS: Sale totals updated after device swap!"
else
  echo "❌ FAIL: Sale totals NOT updated after device swap!"
fi

echo ""
echo "Expected behavior:"
echo "- Assignment list_price should change to new inventory price ($NEW_PRICE)"
echo "- Assignment brand/model should update to new inventory"
echo "- Sale totalAmount should recalculate based on new prices"
echo "- Sale discountAmount should recalculate"
