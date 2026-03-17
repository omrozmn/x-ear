#!/bin/bash

# Manual test - use token from browser
API_URL="http://localhost:5003"

echo "🧪 Testing Product Name Display"
echo "================================"
echo ""
echo "Please provide your JWT token from browser:"
echo "(Open DevTools → Application → Cookies → copy the token value)"
echo ""
read -p "Token: " TOKEN

if [ -z "$TOKEN" ]; then
  echo "❌ No token provided"
  exit 1
fi

SALE_ID="2603020112"

echo ""
echo "📋 Fetching sale data..."
echo "GET /api/sales/$SALE_ID"
echo ""

RESPONSE=$(curl -s -X GET "$API_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE" | jq '.'

echo ""
echo "📊 Product Name Analysis:"
echo "------------------------"
echo "Sale-level productName: $(echo "$RESPONSE" | jq -r '.data.productName // "null"')"
echo "Sale-level brand: $(echo "$RESPONSE" | jq -r '.data.brand // "null"')"
echo "Sale-level model: $(echo "$RESPONSE" | jq -r '.data.model // "null"')"
echo ""
echo "Device-level data:"
echo "$RESPONSE" | jq '.data.devices[] | {
  id,
  name,
  productName,
  brand,
  model,
  category
}'

