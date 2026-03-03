#!/bin/bash

# Test: When unitListPrice changes, device assignments should sync

BASE_URL="http://localhost:5003"
TOKEN=$(python3 get_token.py)

echo "🔬 PRICE SYNC TEST"
echo "========================================"

# Get test data
PARTY_ID="pat_01464a2b"
PRODUCT_ID=$(curl -s -X GET "$BASE_URL/api/inventory-items?page=1&perPage=10" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data.items[0].id')

echo "Test Data:"
echo "  Party: $PARTY_ID"
echo "  Product: $PRODUCT_ID"

# Create bilateral sale with initial price
echo ""
echo "📋 STEP 1: CREATE BILATERAL SALE (unitListPrice: 10000)"
echo "========================================"
SALE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"productId\": \"$PRODUCT_ID\",
    \"earSelection\": \"bilateral\",
    \"unitListPrice\": 10000.0,
    \"sgkScheme\": \"over18_working\",
    \"paymentMethod\": \"cash\",
    \"paidAmount\": 1000.0
  }")

SALE_ID=$(echo $SALE_RESPONSE | jq -r '.data.id')
echo "✅ Created sale: $SALE_ID"

# Get initial device prices
SALE_DATA=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

DEVICE1_ID=$(echo $SALE_DATA | jq -r '.data.deviceAssignments[0].id')
DEVICE2_ID=$(echo $SALE_DATA | jq -r '.data.deviceAssignments[1].id')
DEVICE1_PRICE=$(echo $SALE_DATA | jq -r '.data.deviceAssignments[0].listPrice')
DEVICE2_PRICE=$(echo $SALE_DATA | jq -r '.data.deviceAssignments[1].listPrice')

echo "Initial device prices:"
echo "  Device 1 ($DEVICE1_ID): $DEVICE1_PRICE"
echo "  Device 2 ($DEVICE2_ID): $DEVICE2_PRICE"

# Update sale with new price
echo ""
echo "📋 STEP 2: UPDATE SALE (unitListPrice: 12000)"
echo "========================================"
curl -s -X PUT "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"unitListPrice\": 12000.0,
    \"sgkScheme\": \"over18_working\",
    \"paymentMethod\": \"cash\",
    \"paidAmount\": 1000.0,
    \"earSelection\": \"bilateral\"
  }" > /dev/null

echo "✅ Updated unitListPrice to 12000"

# Check if device prices updated
echo ""
echo "📋 STEP 3: VERIFY DEVICE PRICES SYNCED"
echo "========================================"

SALE_DATA=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

NEW_DEVICE1_PRICE=$(echo $SALE_DATA | jq -r '.data.deviceAssignments[0].listPrice')
NEW_DEVICE2_PRICE=$(echo $SALE_DATA | jq -r '.data.deviceAssignments[1].listPrice')

echo "After update:"
echo "  Device 1: $NEW_DEVICE1_PRICE (expected: 12000.0)"
echo "  Device 2: $NEW_DEVICE2_PRICE (expected: 12000.0)"

# Verify via device assignment endpoint
DEVICE1_DATA=$(curl -s -X GET "$BASE_URL/api/device-assignments/$DEVICE1_ID" \
  -H "Authorization: Bearer $TOKEN")
DEVICE2_DATA=$(curl -s -X GET "$BASE_URL/api/device-assignments/$DEVICE2_ID" \
  -H "Authorization: Bearer $TOKEN")

DEVICE1_DIRECT=$(echo $DEVICE1_DATA | jq -r '.data.listPrice')
DEVICE2_DIRECT=$(echo $DEVICE2_DATA | jq -r '.data.listPrice')

echo ""
echo "Via device assignment endpoint:"
echo "  Device 1: $DEVICE1_DIRECT (expected: 12000.0)"
echo "  Device 2: $DEVICE2_DIRECT (expected: 12000.0)"

# Check results
echo ""
echo "========================================"
if [ "$NEW_DEVICE1_PRICE" = "12000.0" ] && [ "$NEW_DEVICE2_PRICE" = "12000.0" ] && \
   [ "$DEVICE1_DIRECT" = "12000.0" ] && [ "$DEVICE2_DIRECT" = "12000.0" ]; then
  echo "✅ PRICE SYNC TEST PASSED"
  echo "All device assignments updated correctly!"
else
  echo "❌ PRICE SYNC TEST FAILED"
  echo "Device assignments did NOT sync with new unitListPrice"
  echo ""
  echo "Expected: 12000.0 for all devices"
  echo "Got:"
  echo "  - Sale endpoint device 1: $NEW_DEVICE1_PRICE"
  echo "  - Sale endpoint device 2: $NEW_DEVICE2_PRICE"
  echo "  - Direct endpoint device 1: $DEVICE1_DIRECT"
  echo "  - Direct endpoint device 2: $DEVICE2_DIRECT"
fi

echo ""
echo "Test Sale ID: $SALE_ID"
