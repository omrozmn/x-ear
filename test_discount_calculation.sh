#!/bin/bash

echo "=== Testing Discount Calculation Fix ==="

# Get token
TOKEN=$(python3 get_token.py 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Failed to get token"
    exit 1
fi

echo "✅ Token obtained"

# Get existing sale
SALE_ID="2603030102"

echo ""
echo "1. Getting current sale details..."

SALE_DETAILS=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Current Sale Values:"
echo "$SALE_DETAILS" | jq '{
  id: .data.id,
  listPriceTotal: .data.listPriceTotal,
  unitListPrice: .data.unitListPrice,
  actualListPriceTotal: .data.actualListPriceTotal,
  sgkCoverage: .data.sgkCoverage,
  discountType: .data.discountType,
  discountValue: .data.discountValue,
  discountAmount: .data.discountAmount,
  totalAmount: .data.totalAmount,
  finalAmount: .data.finalAmount,
  paidAmount: .data.paidAmount,
  remainingAmount: .data.remainingAmount,
  deviceCount: (.data.devices | length)
}'

echo ""
echo "2. Testing discount update with discountValue field..."

# Update with new discount values
UPDATE_RESPONSE=$(curl -s -X PATCH "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "discountType": "percentage",
    "discountValue": 15,
    "notes": "Testing discountValue field - 15% discount"
  }')

echo "Update Response:"
echo "$UPDATE_RESPONSE" | jq '{
  success: .success,
  discountType: .data.discountType,
  discountValue: .data.discountValue,
  discountAmount: .data.discountAmount,
  finalAmount: .data.finalAmount,
  notes: .data.notes
}'

echo ""
echo "3. Verifying calculation..."

# Get updated sale
UPDATED_SALE=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Updated Sale Values:"
echo "$UPDATED_SALE" | jq '{
  discountType: .data.discountType,
  discountValue: .data.discountValue,
  discountAmount: .data.discountAmount,
  sgkCoverage: .data.sgkCoverage,
  totalAmount: .data.totalAmount,
  finalAmount: .data.finalAmount,
  remainingAmount: .data.remainingAmount
}'

# Extract values for manual calculation
UNIT_PRICE=$(echo "$UPDATED_SALE" | jq -r '.data.unitListPrice // .data.listPriceTotal // 0')
DEVICE_COUNT=$(echo "$UPDATED_SALE" | jq -r '.data.devices | length')
SGK_COVERAGE=$(echo "$UPDATED_SALE" | jq -r '.data.sgkCoverage // 0')
DISCOUNT_VALUE=$(echo "$UPDATED_SALE" | jq -r '.data.discountValue // 0')
BACKEND_DISCOUNT=$(echo "$UPDATED_SALE" | jq -r '.data.discountAmount // 0')
BACKEND_FINAL=$(echo "$UPDATED_SALE" | jq -r '.data.finalAmount // 0')

echo ""
echo "4. Manual calculation verification..."
echo "Input values:"
echo "  Unit Price: $UNIT_PRICE"
echo "  Device Count: $DEVICE_COUNT"
echo "  SGK Coverage: $SGK_COVERAGE"
echo "  Discount Value: $DISCOUNT_VALUE%"

# Manual calculation
node -e "
const unitPrice = $UNIT_PRICE;
const deviceCount = $DEVICE_COUNT;
const totalListPrice = unitPrice * deviceCount;
const sgkCoverage = $SGK_COVERAGE;
const afterSgk = totalListPrice - sgkCoverage;
const discountAmount = (afterSgk * $DISCOUNT_VALUE) / 100;
const finalAmount = afterSgk - discountAmount;

console.log('Manual Calculation:');
console.log('  Total List Price:', totalListPrice);
console.log('  After SGK:', afterSgk);
console.log('  Discount Amount:', discountAmount);
console.log('  Final Amount:', finalAmount);
console.log('');
console.log('Backend vs Manual:');
console.log('  Discount Amount: Backend=$BACKEND_DISCOUNT, Manual=' + discountAmount);
console.log('  Final Amount: Backend=$BACKEND_FINAL, Manual=' + finalAmount);
console.log('  Match:', Math.abs($BACKEND_DISCOUNT - discountAmount) < 0.01 && Math.abs($BACKEND_FINAL - finalAmount) < 0.01 ? '✅' : '❌');
"

echo ""
echo "=== Test Complete ==="