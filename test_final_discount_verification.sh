#!/bin/bash

echo "=== Final Discount Calculation Verification ==="

# Get token
TOKEN=$(python3 get_token.py 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Failed to get token"
    exit 1
fi

echo "✅ Token obtained"

# Test data
PARTY_ID="pat_01464a2b"
INVENTORY_ID="item_27022026112808_947d3a"

echo ""
echo "1. Creating a new bilateral sale with specific discount..."

# Create sale with 10% discount
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
    \"notes\": \"Final discount test - 10% discount\"
  }")

SALE_ID=$(echo "$SALE_RESPONSE" | jq -r '.data.saleId // empty')
if [ -z "$SALE_ID" ]; then
    echo "❌ Failed to create sale"
    echo "Response: $SALE_RESPONSE"
    exit 1
fi

echo "✅ Created Sale ID: $SALE_ID"

echo ""
echo "2. Getting sale details to verify discount calculation..."

SALE_DETAILS=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Sale Calculation Results:"
echo "$SALE_DETAILS" | jq '{
  id: .data.id,
  unitListPrice: .data.unitListPrice,
  actualListPriceTotal: .data.actualListPriceTotal,
  sgkCoverage: .data.sgkCoverage,
  discountType: .data.discountType,
  discountValue: .data.discountValue,
  discountAmount: .data.discountAmount,
  finalAmount: .data.finalAmount,
  paidAmount: .data.paidAmount,
  remainingAmount: .data.remainingAmount,
  deviceCount: (.data.devices | length)
}'

echo ""
echo "3. Manual verification of calculation..."

# Extract values
UNIT_PRICE=$(echo "$SALE_DETAILS" | jq -r '.data.unitListPrice // 0')
DEVICE_COUNT=$(echo "$SALE_DETAILS" | jq -r '.data.devices | length')
SGK_COVERAGE=$(echo "$SALE_DETAILS" | jq -r '.data.sgkCoverage // 0')
DISCOUNT_VALUE=$(echo "$SALE_DETAILS" | jq -r '.data.discountValue // 0')
BACKEND_DISCOUNT=$(echo "$SALE_DETAILS" | jq -r '.data.discountAmount // 0')
BACKEND_FINAL=$(echo "$SALE_DETAILS" | jq -r '.data.finalAmount // 0')

echo "Manual Calculation:"
echo "  Unit Price: $UNIT_PRICE TRY"
echo "  Device Count: $DEVICE_COUNT"
echo "  Total List Price: $(echo "$UNIT_PRICE * $DEVICE_COUNT" | bc) TRY"
echo "  SGK Coverage: $SGK_COVERAGE TRY"
echo "  After SGK: $(echo "$UNIT_PRICE * $DEVICE_COUNT - $SGK_COVERAGE" | bc) TRY"
echo "  Discount ($DISCOUNT_VALUE%): $(echo "scale=2; ($UNIT_PRICE * $DEVICE_COUNT - $SGK_COVERAGE) * $DISCOUNT_VALUE / 100" | bc) TRY"
echo "  Final Amount: $(echo "scale=2; ($UNIT_PRICE * $DEVICE_COUNT - $SGK_COVERAGE) * (100 - $DISCOUNT_VALUE) / 100" | bc) TRY"

echo ""
echo "Backend vs Manual:"
echo "  Discount Amount: Backend=$BACKEND_DISCOUNT TRY"
echo "  Final Amount: Backend=$BACKEND_FINAL TRY"

# Check if calculation is correct
EXPECTED_DISCOUNT=$(echo "scale=2; ($UNIT_PRICE * $DEVICE_COUNT - $SGK_COVERAGE) * $DISCOUNT_VALUE / 100" | bc)
EXPECTED_FINAL=$(echo "scale=2; ($UNIT_PRICE * $DEVICE_COUNT - $SGK_COVERAGE) * (100 - $DISCOUNT_VALUE) / 100" | bc)

DISCOUNT_DIFF=$(echo "scale=2; $BACKEND_DISCOUNT - $EXPECTED_DISCOUNT" | bc | sed 's/^-//')
FINAL_DIFF=$(echo "scale=2; $BACKEND_FINAL - $EXPECTED_FINAL" | bc | sed 's/^-//')

if (( $(echo "$DISCOUNT_DIFF < 0.01" | bc -l) )) && (( $(echo "$FINAL_DIFF < 0.01" | bc -l) )); then
    echo "✅ CALCULATION CORRECT: Backend matches manual calculation"
else
    echo "❌ CALCULATION ERROR: Backend doesn't match manual calculation"
    echo "  Discount difference: $DISCOUNT_DIFF TRY"
    echo "  Final amount difference: $FINAL_DIFF TRY"
fi

echo ""
echo "4. Testing frontend calculation with same values..."

node -e "
const unitPrice = $UNIT_PRICE;
const deviceCount = $DEVICE_COUNT;
const sgkCoverage = $SGK_COVERAGE;
const discountValue = $DISCOUNT_VALUE;

// Frontend calculation logic (from useEditSale.ts)
const totalListPrice = unitPrice * deviceCount;
const sgkReductionPerUnit = 4239.20; // over18_retired
const totalSgkReduction = Math.min(sgkReductionPerUnit, unitPrice) * deviceCount;
const totalAfterSgk = totalListPrice - totalSgkReduction;
const discountTotal = (totalAfterSgk * discountValue) / 100;
const finalAmount = totalAfterSgk - discountTotal;

console.log('Frontend Calculation:');
console.log('  Total List Price:', totalListPrice);
console.log('  SGK Reduction:', totalSgkReduction);
console.log('  After SGK:', totalAfterSgk);
console.log('  Discount Amount:', discountTotal);
console.log('  Final Amount:', finalAmount);
console.log('');
console.log('Frontend vs Backend:');
console.log('  Discount: Frontend=' + discountTotal + ', Backend=$BACKEND_DISCOUNT');
console.log('  Final: Frontend=' + finalAmount + ', Backend=$BACKEND_FINAL');

const frontendDiscountDiff = Math.abs(discountTotal - $BACKEND_DISCOUNT);
const frontendFinalDiff = Math.abs(finalAmount - $BACKEND_FINAL);

if (frontendDiscountDiff < 0.01 && frontendFinalDiff < 0.01) {
    console.log('✅ FRONTEND-BACKEND SYNC: Calculations match');
} else {
    console.log('❌ FRONTEND-BACKEND MISMATCH: Calculations differ');
    console.log('  Discount difference:', frontendDiscountDiff);
    console.log('  Final difference:', frontendFinalDiff);
}
"

echo ""
echo "=== Final Verification Complete ==="