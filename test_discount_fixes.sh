#!/bin/bash

# Test discount display and recalculation fixes

echo "🧪 Testing Discount Fixes"
echo "=========================="

# Get auth token
TOKEN=$(python3 get_token.py 2>/dev/null | grep -o 'eyJ[^"]*' | head -1)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get auth token"
    exit 1
fi

echo "✅ Got auth token"

# Get a sale with discount
echo ""
echo "📋 Step 1: Get existing sale"
SALE_RESPONSE=$(curl -s -X GET "http://localhost:5003/sales?per_page=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

SALE_ID=$(echo "$SALE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') else '')" 2>/dev/null)

if [ -z "$SALE_ID" ]; then
    echo "❌ No sales found"
    exit 1
fi

echo "✅ Found sale: $SALE_ID"

# Get sale details
echo ""
echo "📋 Step 2: Check discount fields in sale response"
SALE_DETAIL=$(curl -s -X GET "http://localhost:5003/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$SALE_DETAIL" | python3 << 'PYTHON'
import sys, json
data = json.load(sys.stdin)
sale = data.get('data', {})

print(f"\n🔍 Sale Discount Fields:")
print(f"  discountAmount: {sale.get('discountAmount', 'MISSING')}")
print(f"  discountType: {sale.get('discountType', 'MISSING')}")
print(f"  discountValue: {sale.get('discountValue', 'MISSING')}")
print(f"  totalAmount: {sale.get('totalAmount', 'MISSING')}")
print(f"  finalAmount: {sale.get('finalAmount', 'MISSING')}")
print(f"  paidAmount: {sale.get('paidAmount', 'MISSING')}")
print(f"  remainingAmount: {sale.get('remainingAmount', 'MISSING')}")

devices = sale.get('devices', [])
if devices:
    print(f"\n🔍 First Device Discount Fields:")
    dev = devices[0]
    print(f"  discountType: {dev.get('discountType', 'MISSING')}")
    print(f"  discountValue: {dev.get('discountValue', 'MISSING')}")

# Check if discount fields are present at sale level
has_discount_type = 'discountType' in sale
has_discount_value = 'discountValue' in sale

if has_discount_type and has_discount_value:
    print("\n✅ FIX 1: Discount type and value are present at sale level")
else:
    print("\n❌ FIX 1 FAILED: Missing discount fields at sale level")
    if not has_discount_type:
        print("  - Missing: discountType")
    if not has_discount_value:
        print("  - Missing: discountValue")
PYTHON

echo ""
echo "=========================="
echo "✅ Test completed"
