#!/bin/bash

echo "=== Testing Calculation Sync Between Frontend and Backend ==="

# Get token
TOKEN=$(python3 get_token.py 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Failed to get token"
    exit 1
fi

# Test data
PARTY_ID="pat_01464a2b"
INVENTORY_ID="item_27022026112808_947d3a"

echo ""
echo "1. Creating a bilateral sale with known values..."

# Create sale with specific values for testing
SALE_RESPONSE=$(curl -s -X POST "http://localhost:5003/api/device-assignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"inventoryId\": \"$INVENTORY_ID\",
    \"ear\": \"both\",
    \"reason\": \"sale\",
    \"sgkScheme\": \"over18_retired\",
    \"discountType\": \"percentage\",
    \"discountValue\": 10,
    \"downPayment\": 2000,
    \"notes\": \"Test calculation sync\"
  }")

SALE_ID=$(echo "$SALE_RESPONSE" | jq -r '.data.saleId // empty')
if [ -z "$SALE_ID" ]; then
    echo "❌ Failed to create sale"
    echo "Response: $SALE_RESPONSE"
    exit 1
fi

echo "✅ Created Sale ID: $SALE_ID"

echo ""
echo "2. Getting sale details to see backend calculation..."

SALE_DETAILS=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Backend Calculation Results:"
echo "$SALE_DETAILS" | jq '{
  id: .data.id,
  unitListPrice: .data.unitListPrice,
  actualListPriceTotal: .data.actualListPriceTotal,
  listPriceTotal: .data.listPriceTotal,
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
echo "3. Frontend calculation with same values..."

# Extract values for frontend calculation
UNIT_PRICE=$(echo "$SALE_DETAILS" | jq -r '.data.unitListPrice // 0')
SGK_COVERAGE=$(echo "$SALE_DETAILS" | jq -r '.data.sgkCoverage // 0')
DISCOUNT_TYPE=$(echo "$SALE_DETAILS" | jq -r '.data.discountType // "none"')
DISCOUNT_VALUE=$(echo "$SALE_DETAILS" | jq -r '.data.discountValue // 0')

echo "Frontend Input Values:"
echo "  Unit Price: $UNIT_PRICE"
echo "  Ear: both (quantity = 2)"
echo "  SGK Scheme: over18_retired (4239.20 per unit)"
echo "  Discount Type: $DISCOUNT_TYPE"
echo "  Discount Value: $DISCOUNT_VALUE"
echo "  Down Payment: 2000"

# Calculate frontend values
node -e "
const unitPrice = $UNIT_PRICE;
const quantity = 2; // both ears
const totalListPrice = unitPrice * quantity;
const sgkPerUnit = 4239.20; // over18_retired
const totalSgkReduction = Math.min(sgkPerUnit, unitPrice) * quantity;
const totalAfterSgk = totalListPrice - totalSgkReduction;
const discountTotal = ('$DISCOUNT_TYPE' === 'percentage') ? (totalAfterSgk * $DISCOUNT_VALUE) / 100 : $DISCOUNT_VALUE;
const finalAmount = totalAfterSgk - discountTotal;
const remainingAmount = finalAmount - 2000;

console.log('Frontend Calculation:');
console.log('  Total List Price:', totalListPrice);
console.log('  SGK Reduction:', totalSgkReduction);
console.log('  After SGK:', totalAfterSgk);
console.log('  Discount Amount:', discountTotal);
console.log('  Final Amount:', finalAmount);
console.log('  Remaining Amount:', remainingAmount);
"

echo ""
echo "4. Comparing calculations..."

BACKEND_FINAL=$(echo "$SALE_DETAILS" | jq -r '.data.finalAmount // 0')
BACKEND_DISCOUNT=$(echo "$SALE_DETAILS" | jq -r '.data.discountAmount // 0')
BACKEND_REMAINING=$(echo "$SALE_DETAILS" | jq -r '.data.remainingAmount // 0')

echo "Backend vs Frontend:"
echo "  Final Amount: Backend=$BACKEND_FINAL"
echo "  Discount Amount: Backend=$BACKEND_DISCOUNT"
echo "  Remaining Amount: Backend=$BACKEND_REMAINING"

echo ""
echo "=== Test Complete ==="