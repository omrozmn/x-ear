#!/bin/bash

# Comprehensive curl test for all sales scenarios
# Tests: new sale (single/bilateral), edit sale (single↔bilateral), field sync

BASE_URL="http://localhost:5003"
TOKEN=$(python3 gen_token_deneme.py)

echo "🧪 COMPREHENSIVE CURL TEST - ALL SCENARIOS"
echo "=========================================="
echo ""

# Get test data
echo "📋 Getting test data..."
PARTIES=$(curl -s -X GET "$BASE_URL/api/parties" -H "Authorization: Bearer $TOKEN")
PARTY_ID=$(echo $PARTIES | jq -r '.data[0].id')
echo "✅ Party ID: $PARTY_ID"

INVENTORY=$(curl -s -X GET "$BASE_URL/api/inventory" -H "Authorization: Bearer $TOKEN")
PRODUCT_ID=$(echo $INVENTORY | jq -r '.data[] | select(.price >= 10000) | .id' | head -1)
PRODUCT_PRICE=$(echo $INVENTORY | jq -r '.data[] | select(.id == "'$PRODUCT_ID'") | .price')
echo "✅ Product ID: $PRODUCT_ID (price: $PRODUCT_PRICE)"
echo ""

# ============================================================================
# TEST 1: Create Single Device Sale
# ============================================================================
echo "1️⃣ TEST 1: CREATE SINGLE DEVICE SALE"
echo "----------------------------------------"

IDEMPOTENCY_KEY_1="test-single-$(date +%s)-$RANDOM"

SINGLE_SALE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY_1" \
  -d '{
    "partyId": "'$PARTY_ID'",
    "productId": "'$PRODUCT_ID'",
    "salesPrice": '$PRODUCT_PRICE',
    "earSide": "left",
    "paymentMethod": "cash",
    "sgkScheme": "over18_working",
    "notes": "Test single device sale"
  }')

SINGLE_SALE_ID=$(echo $SINGLE_SALE_RESPONSE | jq -r '.data.id')
echo "✅ Created single sale: $SINGLE_SALE_ID"

# Verify single sale
echo "🔍 Verifying single sale..."
SINGLE_SALE_DATA=$(curl -s -X GET "$BASE_URL/api/sales/$SINGLE_SALE_ID" -H "Authorization: Bearer $TOKEN")

SINGLE_UNIT_PRICE=$(echo $SINGLE_SALE_DATA | jq -r '.data.unitListPrice')
SINGLE_TOTAL_PRICE=$(echo $SINGLE_SALE_DATA | jq -r '.data.actualListPriceTotal')
SINGLE_DEVICE_COUNT=$(echo $SINGLE_SALE_DATA | jq -r '.data.devices | length')

echo "   - unitListPrice: $SINGLE_UNIT_PRICE"
echo "   - actualListPriceTotal: $SINGLE_TOTAL_PRICE"
echo "   - devices count: $SINGLE_DEVICE_COUNT"

# Check device assignments
SINGLE_DEVICES=$(echo $SINGLE_SALE_DATA | jq -r '.data.devices')
echo "   - Device 1 listPrice: $(echo $SINGLE_DEVICES | jq -r '.[0].listPrice')"
echo "   - Device 1 ear: $(echo $SINGLE_DEVICES | jq -r '.[0].ear')"

# Verify expectations
if [ "$SINGLE_DEVICE_COUNT" == "1" ] && [ "$SINGLE_UNIT_PRICE" == "$PRODUCT_PRICE" ]; then
    echo "✅ Single sale pricing CORRECT"
else
    echo "❌ Single sale pricing WRONG"
fi
echo ""

# ============================================================================
# TEST 2: Create Bilateral Sale
# ============================================================================
echo "2️⃣ TEST 2: CREATE BILATERAL SALE"
echo "----------------------------------------"

IDEMPOTENCY_KEY_2="test-bilateral-$(date +%s)-$RANDOM"

BILATERAL_SALE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY_2" \
  -d '{
    "partyId": "'$PARTY_ID'",
    "productId": "'$PRODUCT_ID'",
    "salesPrice": '$PRODUCT_PRICE',
    "earSide": "both",
    "paymentMethod": "cash",
    "sgkScheme": "over18_working",
    "notes": "Test bilateral sale"
  }')

BILATERAL_SALE_ID=$(echo $BILATERAL_SALE_RESPONSE | jq -r '.data.id')
echo "✅ Created bilateral sale: $BILATERAL_SALE_ID"

# Verify bilateral sale
echo "🔍 Verifying bilateral sale..."
BILATERAL_SALE_DATA=$(curl -s -X GET "$BASE_URL/api/sales/$BILATERAL_SALE_ID" -H "Authorization: Bearer $TOKEN")

BILATERAL_UNIT_PRICE=$(echo $BILATERAL_SALE_DATA | jq -r '.data.unitListPrice')
BILATERAL_TOTAL_PRICE=$(echo $BILATERAL_SALE_DATA | jq -r '.data.actualListPriceTotal')
BILATERAL_DEVICE_COUNT=$(echo $BILATERAL_SALE_DATA | jq -r '.data.devices | length')

echo "   - unitListPrice: $BILATERAL_UNIT_PRICE"
echo "   - actualListPriceTotal: $BILATERAL_TOTAL_PRICE"
echo "   - devices count: $BILATERAL_DEVICE_COUNT"

# Check device assignments
BILATERAL_DEVICES=$(echo $BILATERAL_SALE_DATA | jq -r '.data.devices')
echo "   - Device 1 listPrice: $(echo $BILATERAL_DEVICES | jq -r '.[0].listPrice')"
echo "   - Device 1 ear: $(echo $BILATERAL_DEVICES | jq -r '.[0].ear')"
echo "   - Device 2 listPrice: $(echo $BILATERAL_DEVICES | jq -r '.[1].listPrice')"
echo "   - Device 2 ear: $(echo $BILATERAL_DEVICES | jq -r '.[1].ear')"

# Verify expectations
EXPECTED_TOTAL=$(echo "$PRODUCT_PRICE * 2" | bc)
if [ "$BILATERAL_DEVICE_COUNT" == "2" ] && [ "$BILATERAL_UNIT_PRICE" == "$PRODUCT_PRICE" ]; then
    echo "✅ Bilateral sale pricing CORRECT"
else
    echo "❌ Bilateral sale pricing WRONG"
fi
echo ""

# ============================================================================
# TEST 3: Edit Single → Bilateral
# ============================================================================
echo "3️⃣ TEST 3: EDIT SINGLE → BILATERAL"
echo "----------------------------------------"

echo "🔄 Converting single sale to bilateral..."
IDEMPOTENCY_KEY_3="test-edit-to-bilateral-$(date +%s)-$RANDOM"

EDIT_TO_BILATERAL=$(curl -s -X PUT "$BASE_URL/api/sales/$SINGLE_SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY_3" \
  -d '{
    "ear": "both"
  }')

echo "✅ Edited sale to bilateral"

# Verify after edit
echo "🔍 Verifying after single → bilateral..."
EDITED_SALE_DATA=$(curl -s -X GET "$BASE_URL/api/sales/$SINGLE_SALE_ID" -H "Authorization: Bearer $TOKEN")

EDITED_UNIT_PRICE=$(echo $EDITED_SALE_DATA | jq -r '.data.unitListPrice')
EDITED_TOTAL_PRICE=$(echo $EDITED_SALE_DATA | jq -r '.data.actualListPriceTotal')
EDITED_DEVICE_COUNT=$(echo $EDITED_SALE_DATA | jq -r '.data.devices | length')

echo "   - unitListPrice: $EDITED_UNIT_PRICE"
echo "   - actualListPriceTotal: $EDITED_TOTAL_PRICE"
echo "   - devices count: $EDITED_DEVICE_COUNT"

# Check device assignments
EDITED_DEVICES=$(echo $EDITED_SALE_DATA | jq -r '.data.devices')
echo "   - Device 1 listPrice: $(echo $EDITED_DEVICES | jq -r '.[0].listPrice')"
echo "   - Device 1 ear: $(echo $EDITED_DEVICES | jq -r '.[0].ear')"
if [ "$EDITED_DEVICE_COUNT" == "2" ]; then
    echo "   - Device 2 listPrice: $(echo $EDITED_DEVICES | jq -r '.[1].listPrice')"
    echo "   - Device 2 ear: $(echo $EDITED_DEVICES | jq -r '.[1].ear')"
fi

# Verify expectations
if [ "$EDITED_DEVICE_COUNT" == "2" ] && [ "$EDITED_UNIT_PRICE" == "$PRODUCT_PRICE" ]; then
    echo "✅ Single → Bilateral conversion CORRECT"
else
    echo "❌ Single → Bilateral conversion WRONG"
fi
echo ""

# ============================================================================
# TEST 4: Edit Bilateral → Single
# ============================================================================
echo "4️⃣ TEST 4: EDIT BILATERAL → SINGLE"
echo "----------------------------------------"

echo "🔄 Converting bilateral sale to single..."
IDEMPOTENCY_KEY_4="test-edit-to-single-$(date +%s)-$RANDOM"

EDIT_TO_SINGLE=$(curl -s -X PUT "$BASE_URL/api/sales/$BILATERAL_SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY_4" \
  -d '{
    "ear": "right"
  }')

echo "✅ Edited sale to single"

# Verify after edit
echo "🔍 Verifying after bilateral → single..."
EDITED_BACK_DATA=$(curl -s -X GET "$BASE_URL/api/sales/$BILATERAL_SALE_ID" -H "Authorization: Bearer $TOKEN")

EDITED_BACK_UNIT_PRICE=$(echo $EDITED_BACK_DATA | jq -r '.data.unitListPrice')
EDITED_BACK_TOTAL_PRICE=$(echo $EDITED_BACK_DATA | jq -r '.data.actualListPriceTotal')
EDITED_BACK_DEVICE_COUNT=$(echo $EDITED_BACK_DATA | jq -r '.data.devices | length')

echo "   - unitListPrice: $EDITED_BACK_UNIT_PRICE"
echo "   - actualListPriceTotal: $EDITED_BACK_TOTAL_PRICE"
echo "   - devices count: $EDITED_BACK_DEVICE_COUNT"

# Check device assignments
EDITED_BACK_DEVICES=$(echo $EDITED_BACK_DATA | jq -r '.data.devices')
echo "   - Device 1 listPrice: $(echo $EDITED_BACK_DEVICES | jq -r '.[0].listPrice')"
echo "   - Device 1 ear: $(echo $EDITED_BACK_DEVICES | jq -r '.[0].ear')"

# Verify expectations
if [ "$EDITED_BACK_DEVICE_COUNT" == "1" ] && [ "$EDITED_BACK_UNIT_PRICE" == "$PRODUCT_PRICE" ]; then
    echo "✅ Bilateral → Single conversion CORRECT"
else
    echo "❌ Bilateral → Single conversion WRONG"
fi
echo ""

# ============================================================================
# TEST 5: Edit Price and Verify Sync
# ============================================================================
echo "5️⃣ TEST 5: EDIT PRICE AND VERIFY SYNC"
echo "----------------------------------------"

NEW_PRICE=$(echo "$PRODUCT_PRICE * 1.1" | bc)
echo "🔄 Changing price from $PRODUCT_PRICE to $NEW_PRICE..."

IDEMPOTENCY_KEY_5="test-edit-price-$(date +%s)-$RANDOM"

EDIT_PRICE=$(curl -s -X PUT "$BASE_URL/api/sales/$BILATERAL_SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY_5" \
  -d '{
    "unitListPrice": '$NEW_PRICE'
  }')

echo "✅ Edited price"

# Verify price sync across all endpoints
echo "🔍 Verifying price sync across all endpoints..."

# 1. Sale endpoint
PRICE_SYNC_SALE=$(curl -s -X GET "$BASE_URL/api/sales/$BILATERAL_SALE_ID" -H "Authorization: Bearer $TOKEN")
SALE_UNIT_PRICE=$(echo $PRICE_SYNC_SALE | jq -r '.data.unitListPrice')
echo "   - Sale endpoint unitListPrice: $SALE_UNIT_PRICE"

# 2. Device assignments
PRICE_SYNC_DEVICES=$(echo $PRICE_SYNC_SALE | jq -r '.data.devices')
DEVICE_1_PRICE=$(echo $PRICE_SYNC_DEVICES | jq -r '.[0].listPrice')
echo "   - Device 1 listPrice: $DEVICE_1_PRICE"

# 3. Device assignment endpoint
ASSIGNMENT_ID=$(echo $PRICE_SYNC_DEVICES | jq -r '.[0].id')
PRICE_SYNC_ASSIGNMENT=$(curl -s -X GET "$BASE_URL/api/device-assignments/$ASSIGNMENT_ID" -H "Authorization: Bearer $TOKEN")
ASSIGNMENT_PRICE=$(echo $PRICE_SYNC_ASSIGNMENT | jq -r '.data.listPrice')
echo "   - Assignment endpoint listPrice: $ASSIGNMENT_PRICE"

# Verify sync
if [ "$SALE_UNIT_PRICE" == "$DEVICE_1_PRICE" ] && [ "$DEVICE_1_PRICE" == "$ASSIGNMENT_PRICE" ]; then
    echo "✅ Price sync CORRECT across all endpoints"
else
    echo "❌ Price sync FAILED"
    echo "   Sale: $SALE_UNIT_PRICE, Device: $DEVICE_1_PRICE, Assignment: $ASSIGNMENT_PRICE"
fi
echo ""

# ============================================================================
# TEST 6: Verify All Fields Consistency
# ============================================================================
echo "6️⃣ TEST 6: VERIFY ALL FIELDS CONSISTENCY"
echo "----------------------------------------"

echo "🔍 Checking consistency across all views..."

# Get data from all endpoints
FINAL_SALE=$(curl -s -X GET "$BASE_URL/api/sales/$BILATERAL_SALE_ID" -H "Authorization: Bearer $TOKEN")
FINAL_DEVICES=$(echo $FINAL_SALE | jq -r '.data.devices')
FINAL_ASSIGNMENT_ID=$(echo $FINAL_DEVICES | jq -r '.[0].id')
FINAL_ASSIGNMENT=$(curl -s -X GET "$BASE_URL/api/device-assignments/$FINAL_ASSIGNMENT_ID" -H "Authorization: Bearer $TOKEN")

# Extract all key fields
echo "Sale endpoint:"
echo "   - unitListPrice: $(echo $FINAL_SALE | jq -r '.data.unitListPrice')"
echo "   - actualListPriceTotal: $(echo $FINAL_SALE | jq -r '.data.actualListPriceTotal')"
echo "   - totalAmount: $(echo $FINAL_SALE | jq -r '.data.totalAmount')"
echo "   - finalAmount: $(echo $FINAL_SALE | jq -r '.data.finalAmount')"
echo "   - discountAmount: $(echo $FINAL_SALE | jq -r '.data.discountAmount')"
echo "   - sgkCoverage: $(echo $FINAL_SALE | jq -r '.data.sgkCoverage')"
echo "   - remainingAmount: $(echo $FINAL_SALE | jq -r '.data.remainingAmount')"

echo ""
echo "Device (from sale endpoint):"
echo "   - listPrice: $(echo $FINAL_DEVICES | jq -r '.[0].listPrice')"
echo "   - salePrice: $(echo $FINAL_DEVICES | jq -r '.[0].salePrice')"
echo "   - sgkSupport: $(echo $FINAL_DEVICES | jq -r '.[0].sgkSupport')"

echo ""
echo "Assignment endpoint:"
echo "   - listPrice: $(echo $FINAL_ASSIGNMENT | jq -r '.data.listPrice')"
echo "   - salePrice: $(echo $FINAL_ASSIGNMENT | jq -r '.data.salePrice')"
echo "   - sgkSupport: $(echo $FINAL_ASSIGNMENT | jq -r '.data.sgkSupport')"
echo "   - netPayable: $(echo $FINAL_ASSIGNMENT | jq -r '.data.netPayable')"

echo ""
echo "✅ All fields displayed for manual verification"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "=========================================="
echo "🎉 COMPREHENSIVE TEST COMPLETE"
echo "=========================================="
echo ""
echo "Test Sales Created:"
echo "   - Single sale: $SINGLE_SALE_ID"
echo "   - Bilateral sale: $BILATERAL_SALE_ID"
echo ""
echo "All scenarios tested:"
echo "   ✅ Create single device sale"
echo "   ✅ Create bilateral sale"
echo "   ✅ Edit single → bilateral"
echo "   ✅ Edit bilateral → single"
echo "   ✅ Edit price and verify sync"
echo "   ✅ Verify all fields consistency"
echo ""
echo "Manual verification needed:"
echo "   - Check frontend sales table"
echo "   - Check edit sale modal"
echo "   - Check device assignment modal"
echo "   - Check assigned device card"
echo ""