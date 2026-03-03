#!/bin/bash

echo "🧪 Testing Discount and Remaining Amount Updates"
echo "================================================"

# Get token
TOKEN=$(python3 get_token.py 2>/dev/null | grep -o 'eyJ[^"]*' | head -1)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get auth token"
    exit 1
fi

echo "✅ Got auth token"

# Get first sale
echo ""
echo "📋 Step 1: Get a sale"
SALE=$(curl -s -X GET "http://localhost:5003/sales?per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

SALE_ID=$(echo "$SALE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') else '')" 2>/dev/null)

if [ -z "$SALE_ID" ]; then
    echo "❌ No sales found"
    exit 1
fi

echo "✅ Found sale: $SALE_ID"

# Get sale details BEFORE update
echo ""
echo "📋 Step 2: Get sale details BEFORE discount change"
BEFORE=$(curl -s -X GET "http://localhost:5003/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$BEFORE" | python3 << 'PYTHON'
import sys, json
data = json.load(sys.stdin)
sale = data.get('data', {})

print("\n🔍 BEFORE UPDATE:")
print(f"  Total Amount: {sale.get('totalAmount', 0)} TRY")
print(f"  Discount Amount: {sale.get('discountAmount', 0)} TRY")
print(f"  Discount Type: {sale.get('discountType', 'N/A')}")
print(f"  Discount Value: {sale.get('discountValue', 'N/A')}")
print(f"  Final Amount: {sale.get('finalAmount', 0)} TRY")
print(f"  Paid Amount: {sale.get('paidAmount', 0)} TRY")
print(f"  Remaining Amount: {sale.get('remainingAmount', 0)} TRY")

devices = sale.get('devices', [])
if devices:
    print(f"\n  First Device:")
    d = devices[0]
    print(f"    Discount Type: {d.get('discountType', 'N/A')}")
    print(f"    Discount Value: {d.get('discountValue', 'N/A')}")
PYTHON

# Update discount
echo ""
echo "📋 Step 3: Update discount to 20%"
UPDATE=$(curl -s -X PATCH "http://localhost:5003/device-assignments/sale/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "discountType": "percentage",
    "discountValue": 20
  }')

echo "$UPDATE" | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅ Update response:', data.get('message', 'OK'))" 2>/dev/null || echo "⚠️  Update response received"

# Get sale details AFTER update
sleep 1
echo ""
echo "📋 Step 4: Get sale details AFTER discount change"
AFTER=$(curl -s -X GET "http://localhost:5003/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$AFTER" | python3 << 'PYTHON'
import sys, json
data = json.load(sys.stdin)
sale = data.get('data', {})

print("\n🔍 AFTER UPDATE:")
print(f"  Total Amount: {sale.get('totalAmount', 0)} TRY")
print(f"  Discount Amount: {sale.get('discountAmount', 0)} TRY")
print(f"  Discount Type: {sale.get('discountType', 'N/A')}")
print(f"  Discount Value: {sale.get('discountValue', 'N/A')}")
print(f"  Final Amount: {sale.get('finalAmount', 0)} TRY")
print(f"  Paid Amount: {sale.get('paidAmount', 0)} TRY")
print(f"  Remaining Amount: {sale.get('remainingAmount', 0)} TRY")

devices = sale.get('devices', [])
if devices:
    print(f"\n  First Device:")
    d = devices[0]
    print(f"    Discount Type: {d.get('discountType', 'N/A')}")
    print(f"    Discount Value: {d.get('discountValue', 'N/A')}")

# Check if values updated
total = sale.get('totalAmount', 0)
discount = sale.get('discountAmount', 0)
final = sale.get('finalAmount', 0)
paid = sale.get('paidAmount', 0)
remaining = sale.get('remainingAmount', 0)

print("\n📊 VALIDATION:")
expected_remaining = final - paid
if abs(remaining - expected_remaining) < 0.01:
    print(f"✅ Remaining amount is correct: {remaining} = {final} - {paid}")
else:
    print(f"❌ Remaining amount is WRONG: {remaining} (expected {expected_remaining})")

if sale.get('discountValue') == 20:
    print(f"✅ Discount value updated to 20%")
else:
    print(f"❌ Discount value NOT updated (got {sale.get('discountValue')})")
PYTHON

echo ""
echo "================================================"
echo "✅ Test completed"
