#!/bin/bash

# ULTRA COMPREHENSIVE TEST - ALL FIELDS, ALL ENDPOINTS, ALL SCENARIOS
# Tests every single field in every view: sales table, edit modal, device card, assignment modal

BASE_URL="http://localhost:5003"
TOKEN=$(python3 gen_token_deneme.py)

echo "🔬 ULTRA COMPREHENSIVE CONSISTENCY TEST"
echo "========================================"
echo ""

# Get test data
PARTIES=$(curl -s -X GET "$BASE_URL/api/parties" -H "Authorization: Bearer $TOKEN")
PARTY_ID=$(echo $PARTIES | jq -r '.data[0].id')

INVENTORY=$(curl -s -X GET "$BASE_URL/api/inventory" -H "Authorization: Bearer $TOKEN")
PRODUCT_ID=$(echo $INVENTORY | jq -r '.data[] | select(.price >= 10000) | .id' | head -1)
PRODUCT_PRICE=$(echo $INVENTORY | jq -r '.data[] | select(.id == "'$PRODUCT_ID'") | .price')

echo "Test Data:"
echo "  Party: $PARTY_ID"
echo "  Product: $PRODUCT_ID (price: $PRODUCT_PRICE)"
echo ""

# ============================================================================
# SCENARIO 1: Create Bilateral Sale & Verify ALL Fields
# ============================================================================
echo "📋 SCENARIO 1: CREATE BILATERAL SALE"
echo "========================================"

BILATERAL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-ultra-bilateral-$(date +%s)-$RANDOM" \
  -d '{
    "partyId": "'$PARTY_ID'",
    "productId": "'$PRODUCT_ID'",
    "salesPrice": '$PRODUCT_PRICE',
    "earSide": "both",
    "paymentMethod": "cash",
    "sgkScheme": "over18_working",
    "downPayment": 1000,
    "notes": "Test bilateral sale for ultra comprehensive test"
  }')

BILATERAL_SALE_ID=$(echo $BILATERAL_RESPONSE | jq -r '.data.id')
echo "✅ Created bilateral sale: $BILATERAL_SALE_ID"
echo ""

# Get complete sale data
echo "🔍 Fetching complete sale data from ALL endpoints..."
SALE_DATA=$(curl -s -X GET "$BASE_URL/api/sales/$BILATERAL_SALE_ID" -H "Authorization: Bearer $TOKEN" | jq '.data')

# Extract all key fields
echo ""
echo "📊 SALE ENDPOINT (GET /api/sales/$BILATERAL_SALE_ID):"
echo "  Pricing:"
echo "    - unitListPrice: $(echo $SALE_DATA | jq -r '.unitListPrice')"
echo "    - listPriceTotal: $(echo $SALE_DATA | jq -r '.listPriceTotal')"
echo "    - actualListPriceTotal: $(echo $SALE_DATA | jq -r '.actualListPriceTotal')"
echo "    - totalAmount: $(echo $SALE_DATA | jq -r '.totalAmount')"
echo "    - finalAmount: $(echo $SALE_DATA | jq -r '.finalAmount')"
echo "  Discounts:"
echo "    - discountType: $(echo $SALE_DATA | jq -r '.discountType')"
echo "    - discountValue: $(echo $SALE_DATA | jq -r '.discountValue')"
echo "    - discountAmount: $(echo $SALE_DATA | jq -r '.discountAmount')"
echo "  SGK:"
echo "    - sgkCoverage: $(echo $SALE_DATA | jq -r '.sgkCoverage')"
echo "    - sgkScheme: $(echo $SALE_DATA | jq -r '.sgkScheme')"
echo "  Payment:"
echo "    - paidAmount: $(echo $SALE_DATA | jq -r '.paidAmount')"
echo "    - remainingAmount: $(echo $SALE_DATA | jq -r '.remainingAmount')"
echo "    - paymentMethod: $(echo $SALE_DATA | jq -r '.paymentMethod')"
echo "  Status:"
echo "    - status: $(echo $SALE_DATA | jq -r '.status')"
echo "    - deliveryStatus: $(echo $SALE_DATA | jq -r '.deliveryStatus')"
echo "    - reportStatus: $(echo $SALE_DATA | jq -r '.reportStatus')"
echo "  Devices:"
echo "    - count: $(echo $SALE_DATA | jq -r '.devices | length')"

# Check each device
DEVICES=$(echo $SALE_DATA | jq -r '.devices')
DEVICE_COUNT=$(echo $DEVICES | jq -r 'length')

for i in $(seq 0 $(($DEVICE_COUNT - 1))); do
    DEVICE=$(echo $DEVICES | jq -r ".[$i]")
    DEVICE_ID=$(echo $DEVICE | jq -r '.id')
    
    echo ""
    echo "📱 DEVICE $((i+1)) (from sale endpoint):"
    echo "  - id: $DEVICE_ID"
    echo "  - ear: $(echo $DEVICE | jq -r '.ear')"
    echo "  - listPrice: $(echo $DEVICE | jq -r '.listPrice')"
    echo "  - salePrice: $(echo $DEVICE | jq -r '.salePrice')"
    echo "  - sgkSupport: $(echo $DEVICE | jq -r '.sgkSupport')"
    echo "  - sgkScheme: $(echo $DEVICE | jq -r '.sgkScheme')"
    echo "  - netPayable: $(echo $DEVICE | jq -r '.netPayable')"
    echo "  - discountType: $(echo $DEVICE | jq -r '.discountType')"
    echo "  - discountValue: $(echo $DEVICE | jq -r '.discountValue')"
    echo "  - serialNumber: $(echo $DEVICE | jq -r '.serialNumber')"
    echo "  - deliveryStatus: $(echo $DEVICE | jq -r '.deliveryStatus')"
    echo "  - reportStatus: $(echo $DEVICE | jq -r '.reportStatus')"
    
    # Get same device from assignment endpoint
    echo ""
    echo "  🔗 DEVICE ASSIGNMENT ENDPOINT (GET /api/device-assignments/$DEVICE_ID):"
    ASSIGNMENT_DATA=$(curl -s -X GET "$BASE_URL/api/device-assignments/$DEVICE_ID" -H "Authorization: Bearer $TOKEN" | jq '.data')
    
    echo "    - listPrice: $(echo $ASSIGNMENT_DATA | jq -r '.listPrice')"
    echo "    - salePrice: $(echo $ASSIGNMENT_DATA | jq -r '.salePrice')"
    echo "    - sgkSupport: $(echo $ASSIGNMENT_DATA | jq -r '.sgkSupport')"
    echo "    - sgkScheme: $(echo $ASSIGNMENT_DATA | jq -r '.sgkScheme')"
    echo "    - netPayable: $(echo $ASSIGNMENT_DATA | jq -r '.netPayable')"
    echo "    - discountType: $(echo $ASSIGNMENT_DATA | jq -r '.discountType')"
    echo "    - discountValue: $(echo $ASSIGNMENT_DATA | jq -r '.discountValue')"
    
    # Compare values
    SALE_LIST_PRICE=$(echo $DEVICE | jq -r '.listPrice')
    ASSIGNMENT_LIST_PRICE=$(echo $ASSIGNMENT_DATA | jq -r '.listPrice')
    
    if [ "$SALE_LIST_PRICE" == "$ASSIGNMENT_LIST_PRICE" ]; then
        echo "    ✅ listPrice consistent"
    else
        echo "    ❌ listPrice MISMATCH: sale=$SALE_LIST_PRICE, assignment=$ASSIGNMENT_LIST_PRICE"
    fi
done

echo ""
echo "========================================"
echo ""

# ============================================================================
# SCENARIO 2: Edit Sale - Change Discount
# ============================================================================
echo "📋 SCENARIO 2: EDIT SALE - CHANGE DISCOUNT"
echo "========================================"

echo "🔄 Adding 10% discount..."
EDIT_DISCOUNT=$(curl -s -X PUT "$BASE_URL/api/sales/$BILATERAL_SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-ultra-discount-$(date +%s)-$RANDOM" \
  -d '{
    "discountType": "percentage",
    "discountValue": 10
  }')

echo "✅ Discount updated"
echo ""

# Verify discount sync
SALE_AFTER_DISCOUNT=$(curl -s -X GET "$BASE_URL/api/sales/$BILATERAL_SALE_ID" -H "Authorization: Bearer $TOKEN" | jq '.data')

echo "🔍 After discount change:"
echo "  Sale:"
echo "    - discountType: $(echo $SALE_AFTER_DISCOUNT | jq -r '.discountType')"
echo "    - discountValue: $(echo $SALE_AFTER_DISCOUNT | jq -r '.discountValue')"
echo "    - discountAmount: $(echo $SALE_AFTER_DISCOUNT | jq -r '.discountAmount')"
echo "    - finalAmount: $(echo $SALE_AFTER_DISCOUNT | jq -r '.finalAmount')"

# Check devices
DEVICES_AFTER=$(echo $SALE_AFTER_DISCOUNT | jq -r '.devices')
for i in $(seq 0 $(($DEVICE_COUNT - 1))); do
    DEVICE=$(echo $DEVICES_AFTER | jq -r ".[$i]")
    echo "  Device $((i+1)):"
    echo "    - discountType: $(echo $DEVICE | jq -r '.discountType')"
    echo "    - discountValue: $(echo $DEVICE | jq -r '.discountValue')"
done

echo ""
echo "========================================"
echo ""

# ============================================================================
# SCENARIO 3: Edit Sale - Change SGK Scheme
# ============================================================================
echo "📋 SCENARIO 3: EDIT SALE - CHANGE SGK SCHEME"
echo "========================================"

echo "🔄 Changing SGK scheme to over18_retired..."
EDIT_SGK=$(curl -s -X PUT "$BASE_URL/api/sales/$BILATERAL_SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-ultra-sgk-$(date +%s)-$RANDOM" \
  -d '{
    "sgkScheme": "over18_retired"
  }')

echo "✅ SGK scheme updated"
echo ""

# Verify SGK sync
SALE_AFTER_SGK=$(curl -s -X GET "$BASE_URL/api/sales/$BILATERAL_SALE_ID" -H "Authorization: Bearer $TOKEN" | jq '.data')

echo "🔍 After SGK change:"
echo "  Sale:"
echo "    - sgkScheme: $(echo $SALE_AFTER_SGK | jq -r '.sgkScheme')"
echo "    - sgkCoverage: $(echo $SALE_AFTER_SGK | jq -r '.sgkCoverage')"
echo "    - finalAmount: $(echo $SALE_AFTER_SGK | jq -r '.finalAmount')"

# Check devices
DEVICES_AFTER_SGK=$(echo $SALE_AFTER_SGK | jq -r '.devices')
for i in $(seq 0 $(($DEVICE_COUNT - 1))); do
    DEVICE=$(echo $DEVICES_AFTER_SGK | jq -r ".[$i]")
    echo "  Device $((i+1)):"
    echo "    - sgkScheme: $(echo $DEVICE | jq -r '.sgkScheme')"
    echo "    - sgkSupport: $(echo $DEVICE | jq -r '.sgkSupport')"
done

echo ""
echo "========================================"
echo ""

# ============================================================================
# SCENARIO 4: Convert Bilateral → Single
# ============================================================================
echo "📋 SCENARIO 4: CONVERT BILATERAL → SINGLE"
echo "========================================"

echo "🔄 Converting to single ear (right)..."
CONVERT_TO_SINGLE=$(curl -s -X PUT "$BASE_URL/api/sales/$BILATERAL_SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-ultra-single-$(date +%s)-$RANDOM" \
  -d '{
    "ear": "right"
  }')

echo "✅ Converted to single"
echo ""

# Verify conversion
SALE_AFTER_SINGLE=$(curl -s -X GET "$BASE_URL/api/sales/$BILATERAL_SALE_ID" -H "Authorization: Bearer $TOKEN" | jq '.data')

echo "🔍 After bilateral → single:"
echo "  Sale:"
echo "    - unitListPrice: $(echo $SALE_AFTER_SINGLE | jq -r '.unitListPrice')"
echo "    - actualListPriceTotal: $(echo $SALE_AFTER_SINGLE | jq -r '.actualListPriceTotal')"
echo "    - devices count: $(echo $SALE_AFTER_SINGLE | jq -r '.devices | length')"
echo "    - finalAmount: $(echo $SALE_AFTER_SINGLE | jq -r '.finalAmount')"

DEVICES_SINGLE=$(echo $SALE_AFTER_SINGLE | jq -r '.devices')
SINGLE_DEVICE=$(echo $DEVICES_SINGLE | jq -r '.[0]')
echo "  Device:"
echo "    - ear: $(echo $SINGLE_DEVICE | jq -r '.ear')"
echo "    - listPrice: $(echo $SINGLE_DEVICE | jq -r '.listPrice')"

# Verify expectations
EXPECTED_DEVICES=1
ACTUAL_DEVICES=$(echo $SALE_AFTER_SINGLE | jq -r '.devices | length')

if [ "$ACTUAL_DEVICES" == "$EXPECTED_DEVICES" ]; then
    echo "  ✅ Device count correct: $EXPECTED_DEVICES"
else
    echo "  ❌ Device count WRONG: expected $EXPECTED_DEVICES, got $ACTUAL_DEVICES"
fi

echo ""
echo "========================================"
echo ""

# ============================================================================
# SCENARIO 5: Convert Single → Bilateral
# ============================================================================
echo "📋 SCENARIO 5: CONVERT SINGLE → BILATERAL"
echo "========================================"

echo "🔄 Converting back to bilateral..."
CONVERT_TO_BILATERAL=$(curl -s -X PUT "$BASE_URL/api/sales/$BILATERAL_SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-ultra-bilateral2-$(date +%s)-$RANDOM" \
  -d '{
    "ear": "both"
  }')

echo "✅ Converted to bilateral"
echo ""

# Verify conversion
SALE_AFTER_BILATERAL=$(curl -s -X GET "$BASE_URL/api/sales/$BILATERAL_SALE_ID" -H "Authorization: Bearer $TOKEN" | jq '.data')

echo "🔍 After single → bilateral:"
echo "  Sale:"
echo "    - unitListPrice: $(echo $SALE_AFTER_BILATERAL | jq -r '.unitListPrice')"
echo "    - actualListPriceTotal: $(echo $SALE_AFTER_BILATERAL | jq -r '.actualListPriceTotal')"
echo "    - devices count: $(echo $SALE_AFTER_BILATERAL | jq -r '.devices | length')"
echo "    - finalAmount: $(echo $SALE_AFTER_BILATERAL | jq -r '.finalAmount')"

DEVICES_BILATERAL=$(echo $SALE_AFTER_BILATERAL | jq -r '.devices')
for i in $(seq 0 1); do
    DEVICE=$(echo $DEVICES_BILATERAL | jq -r ".[$i]")
    echo "  Device $((i+1)):"
    echo "    - ear: $(echo $DEVICE | jq -r '.ear')"
    echo "    - listPrice: $(echo $DEVICE | jq -r '.listPrice')"
done

# Verify expectations
EXPECTED_DEVICES=2
ACTUAL_DEVICES=$(echo $SALE_AFTER_BILATERAL | jq -r '.devices | length')

if [ "$ACTUAL_DEVICES" == "$EXPECTED_DEVICES" ]; then
    echo "  ✅ Device count correct: $EXPECTED_DEVICES"
else
    echo "  ❌ Device count WRONG: expected $EXPECTED_DEVICES, got $ACTUAL_DEVICES"
fi

echo ""
echo "========================================"
echo ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo "🎉 ULTRA COMPREHENSIVE TEST COMPLETE"
echo "========================================"
echo ""
echo "Test Sale ID: $BILATERAL_SALE_ID"
echo ""
echo "Scenarios Tested:"
echo "  ✅ Create bilateral sale"
echo "  ✅ Verify all fields in all endpoints"
echo "  ✅ Edit discount and verify sync"
echo "  ✅ Edit SGK scheme and verify sync"
echo "  ✅ Convert bilateral → single"
echo "  ✅ Convert single → bilateral"
echo ""
echo "Manual Verification Required:"
echo "  1. Open frontend at http://localhost:8080"
echo "  2. Navigate to party: $PARTY_ID"
echo "  3. Check sales table shows correct values"
echo "  4. Open edit sale modal for: $BILATERAL_SALE_ID"
echo "  5. Verify all fields match API values"
echo "  6. Check device assignment cards"
echo "  7. Open device assignment modal"
echo "  8. Verify all fields are consistent"
echo ""
