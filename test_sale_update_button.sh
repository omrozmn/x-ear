#!/bin/bash

# Test Sale Update Button Issue
# This script tests the PUT /api/sales/{sale_id} endpoint

echo "=== Testing Sale Update Endpoint ==="
echo ""

# Get token for deneme tenant
TOKEN=$(python3 gen_token_deneme.py 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token"
    exit 1
fi

echo "✅ Got token"
echo ""

# Get a sale to update
echo "1. Getting existing sale..."
SALE_RESPONSE=$(curl -s -X GET "http://localhost:5003/api/sales?page=1&per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

SALE_ID=$(echo "$SALE_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') and len(data['data']) > 0 else '')" 2>/dev/null)

if [ -z "$SALE_ID" ]; then
    echo "❌ No sales found"
    exit 1
fi

echo "✅ Found sale: $SALE_ID"
echo ""

# Get full sale details
echo "2. Getting sale details..."
SALE_DETAIL=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Sale details:"
echo "$SALE_DETAIL" | python3 -m json.tool 2>/dev/null | head -50
echo ""

# Extract current values
CURRENT_LIST_PRICE=$(echo "$SALE_DETAIL" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data'].get('listPriceTotal', 0))" 2>/dev/null)
CURRENT_FINAL_AMOUNT=$(echo "$SALE_DETAIL" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data'].get('finalAmount', 0))" 2>/dev/null)
CURRENT_PAID=$(echo "$SALE_DETAIL" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data'].get('paidAmount', 0))" 2>/dev/null)

echo "Current values:"
echo "  listPriceTotal: $CURRENT_LIST_PRICE"
echo "  finalAmount: $CURRENT_FINAL_AMOUNT"
echo "  paidAmount: $CURRENT_PAID"
echo ""

# Test 1: Update with Idempotency-Key
echo "3. Testing update WITH Idempotency-Key..."
IDEMPOTENCY_KEY="test-$(date +%s)-$(openssl rand -hex 4)"

UPDATE_RESPONSE=$(curl -s -X PUT "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"listPriceTotal\": $CURRENT_LIST_PRICE,
    \"finalAmount\": $CURRENT_FINAL_AMOUNT,
    \"patientPayment\": $CURRENT_FINAL_AMOUNT,
    \"paidAmount\": $CURRENT_PAID,
    \"notes\": \"Test update at $(date)\"
  }")

echo "Response:"
echo "$UPDATE_RESPONSE" | python3 -m json.tool 2>/dev/null
echo ""

# Check if update was successful
SUCCESS=$(echo "$UPDATE_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('success', False))" 2>/dev/null)

if [ "$SUCCESS" = "True" ]; then
    echo "✅ Update successful!"
else
    echo "❌ Update failed!"
    echo "Error details:"
    echo "$UPDATE_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('error', 'Unknown error'))" 2>/dev/null
fi

echo ""
echo "=== Test Complete ==="
