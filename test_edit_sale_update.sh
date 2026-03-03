#!/bin/bash

# Test edit sale modal update button
BASE_URL="http://localhost:5003"
TENANT_ID="95625589-a4ad-41ff-a99e-4955943bb421"

echo "=== Testing Edit Sale Update ==="
echo ""

# Get token
TOKEN=$(python3 gen_token_deneme.py 2>/dev/null)
echo "✓ Token obtained"

# Get a sale
SALE_ID=$(curl -s -X GET "$BASE_URL/api/parties/pat_01464a2b/sales?page=1&per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print(d['data'][0]['id'])" 2>/dev/null)

echo "✓ Sale ID: $SALE_ID"
echo ""

# Try to update the sale
echo "1. Updating sale..."
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "listPriceTotal": 15000,
    "finalAmount": 12000,
    "patientPayment": 12000,
    "paidAmount": 5000,
    "discountAmount": 1000,
    "sgkCoverage": 2000,
    "notes": "Test update from script",
    "status": "completed",
    "paymentMethod": "cash"
  }')

echo "$UPDATE_RESPONSE" | python3 -m json.tool

echo ""
echo "=== Test Complete ==="
