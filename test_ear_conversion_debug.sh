#!/bin/bash

BASE_URL="http://localhost:5003"
TOKEN=$(python3 gen_token_deneme.py)

echo "🔍 DEBUGGING EAR CONVERSION"
echo "=============================="

# Get test data
PARTIES=$(curl -s -X GET "$BASE_URL/api/parties" -H "Authorization: Bearer $TOKEN")
PARTY_ID=$(echo $PARTIES | jq -r '.data[0].id')

INVENTORY=$(curl -s -X GET "$BASE_URL/api/inventory" -H "Authorization: Bearer $TOKEN")
PRODUCT_ID=$(echo $INVENTORY | jq -r '.data[] | select(.price >= 10000) | .id' | head -1)

echo "Party: $PARTY_ID"
echo "Product: $PRODUCT_ID"
echo ""

# Create single sale
echo "1. Creating single sale..."
SINGLE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-debug-single-$(date +%s)-$RANDOM" \
  -d '{
    "partyId": "'$PARTY_ID'",
    "productId": "'$PRODUCT_ID'",
    "salesPrice": 10000,
    "earSide": "left",
    "paymentMethod": "cash",
    "sgkScheme": "over18_working"
  }')

SALE_ID=$(echo $SINGLE_RESPONSE | jq -r '.data.id')
echo "Created sale: $SALE_ID"
echo ""

# Check initial state
echo "2. Initial state (single):"
INITIAL=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" -H "Authorization: Bearer $TOKEN")
echo "   Devices: $(echo $INITIAL | jq -r '.data.devices | length')"
echo "   Ears: $(echo $INITIAL | jq -r '.data.devices[].ear')"
echo ""

# Try to convert to bilateral
echo "3. Converting to bilateral..."
EDIT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X PUT "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-debug-edit-$(date +%s)-$RANDOM" \
  -d '{
    "ear": "both"
  }')

echo "PUT Response:"
echo "$EDIT_RESPONSE" | grep -v "HTTP_STATUS"
HTTP_STATUS=$(echo "$EDIT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
echo "HTTP Status: $HTTP_STATUS"
echo ""

# Check after edit
echo "4. After edit:"
AFTER=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" -H "Authorization: Bearer $TOKEN")
echo "   Devices: $(echo $AFTER | jq -r '.data.devices | length')"
echo "   Ears: $(echo $AFTER | jq -r '.data.devices[].ear')"
echo ""

# Show full response
echo "5. Full sale data:"
echo $AFTER | jq '.data | {unitListPrice, actualListPriceTotal, devices: .devices | length}'
