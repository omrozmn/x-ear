#!/bin/bash

# Test Product Name Display and Serial Number Saving
# This script tests:
# 1. Product name (from inventory) is returned in sale data
# 2. Serial numbers are saved correctly when editing

set -e

API_URL="http://localhost:5003"
TOKEN=$(python3 get_token.py)

echo "🧪 Testing Product Name and Serial Number Fixes"
echo "================================================"
echo ""

# Test 1: Get existing sale and check product name
echo "📋 Test 1: Check product name in sale data"
echo "-------------------------------------------"
SALE_ID="2603020112"

echo "GET /api/sales/$SALE_ID"
SALE_RESPONSE=$(curl -s -X GET "$API_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$SALE_RESPONSE" | jq '.data | {
  id,
  productName,
  brand,
  model,
  devices: .devices | map({
    id,
    name,
    productName,
    brand,
    model,
    category
  })
}'

PRODUCT_NAME=$(echo "$SALE_RESPONSE" | jq -r '.data.productName // "null"')
DEVICE_PRODUCT_NAME=$(echo "$SALE_RESPONSE" | jq -r '.data.devices[0].productName // "null"')

echo ""
echo "✅ Sale-level productName: $PRODUCT_NAME"
echo "✅ Device-level productName: $DEVICE_PRODUCT_NAME"
echo ""

# Test 2: Update serial numbers
echo "📝 Test 2: Update serial numbers"
echo "---------------------------------"

# Get current device assignments
DEVICES=$(echo "$SALE_RESPONSE" | jq '.data.devices')
DEVICE_COUNT=$(echo "$DEVICES" | jq 'length')

echo "Current devices: $DEVICE_COUNT"

if [ "$DEVICE_COUNT" -eq "2" ]; then
  echo "Bilateral sale detected - updating both serial numbers"
  
  # Update with new serial numbers
  UPDATE_PAYLOAD=$(cat <<EOF
{
  "serialNumberLeft": "TEST-LEFT-$(date +%s)",
  "serialNumberRight": "TEST-RIGHT-$(date +%s)"
}
EOF
)
else
  echo "Single device sale - updating one serial number"
  
  EAR=$(echo "$DEVICES" | jq -r '.[0].ear')
  if [ "$EAR" = "left" ]; then
    UPDATE_PAYLOAD=$(cat <<EOF
{
  "serialNumberLeft": "TEST-SINGLE-$(date +%s)"
}
EOF
)
  else
    UPDATE_PAYLOAD=$(cat <<EOF
{
  "serialNumberRight": "TEST-SINGLE-$(date +%s)"
}
EOF
)
  fi
fi

echo ""
echo "PUT /api/sales/$SALE_ID"
echo "Payload: $UPDATE_PAYLOAD"

UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_PAYLOAD")

echo "Response:"
echo "$UPDATE_RESPONSE" | jq '.'

# Verify the update
echo ""
echo "🔍 Verifying serial number update..."
VERIFY_RESPONSE=$(curl -s -X GET "$API_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Updated serial numbers:"
echo "$VERIFY_RESPONSE" | jq '.data.devices | map({
  id,
  ear,
  serialNumber,
  serialNumberLeft,
  serialNumberRight
})'

echo ""
echo "✅ Serial number update test complete"
echo ""

# Test 3: Check consistency across endpoints
echo "🔄 Test 3: Check consistency across endpoints"
echo "----------------------------------------------"

# GET /api/sales/{id}
SALE_DATA=$(curl -s -X GET "$API_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data')

# GET /api/device-assignments (for first device)
FIRST_DEVICE_ID=$(echo "$SALE_DATA" | jq -r '.devices[0].id')
ASSIGNMENT_DATA=$(curl -s -X GET "$API_URL/api/device-assignments/$FIRST_DEVICE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data')

echo "Sale endpoint - productName: $(echo "$SALE_DATA" | jq -r '.productName // "null"')"
echo "Sale endpoint - brand: $(echo "$SALE_DATA" | jq -r '.brand // "null"')"
echo "Sale endpoint - model: $(echo "$SALE_DATA" | jq -r '.model // "null"')"
echo ""
echo "Device endpoint - productName: $(echo "$ASSIGNMENT_DATA" | jq -r '.productName // "null"')"
echo "Device endpoint - brand: $(echo "$ASSIGNMENT_DATA" | jq -r '.brand // "null"')"
echo "Device endpoint - model: $(echo "$ASSIGNMENT_DATA" | jq -r '.model // "null"')"
echo ""

# Compare
SALE_PRODUCT=$(echo "$SALE_DATA" | jq -r '.productName // "null"')
DEVICE_PRODUCT=$(echo "$ASSIGNMENT_DATA" | jq -r '.productName // "null"')

if [ "$SALE_PRODUCT" = "$DEVICE_PRODUCT" ]; then
  echo "✅ Product names match across endpoints"
else
  echo "❌ Product names DO NOT match!"
  echo "   Sale: $SALE_PRODUCT"
  echo "   Device: $DEVICE_PRODUCT"
fi

echo ""
echo "================================================"
echo "🎉 All tests complete!"
echo "================================================"
