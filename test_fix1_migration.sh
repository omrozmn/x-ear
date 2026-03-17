#!/bin/bash

# Test Fix #1: Database Migration (discount_type, discount_value)

echo "🔧 FIX #1: Testing Database Migration"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get auth token
echo "📡 Getting auth token..."
TOKEN=$(python3 gen_token_deneme.py 2>/dev/null | grep -o 'eyJ[^"]*' | head -1)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Failed to get auth token${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Got auth token${NC}"

# Test 1: Check if migration columns exist
echo ""
echo "🔍 Test 1: Check if new columns exist in Sale model"
echo "------------------------------------------------"

# Get a sale to check if new fields are returned
RESPONSE=$(curl -s -X GET "http://localhost:5003/api/parties/pat_a722c0ae/sales?include_details=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# Check if response contains new fields
if echo "$RESPONSE" | grep -q '"discountType"'; then
    echo -e "${GREEN}✅ discountType field found in response${NC}"
else
    echo -e "${RED}❌ discountType field NOT found in response${NC}"
fi

if echo "$RESPONSE" | grep -q '"discountValue"'; then
    echo -e "${GREEN}✅ discountValue field found in response${NC}"
else
    echo -e "${RED}❌ discountValue field NOT found in response${NC}"
fi

if echo "$RESPONSE" | grep -q '"unitListPrice"'; then
    echo -e "${GREEN}✅ unitListPrice field found in response${NC}"
else
    echo -e "${RED}❌ unitListPrice field NOT found in response${NC}"
fi

# Test 2: Check specific sale data
echo ""
echo "🔍 Test 2: Check specific sale discount data"
echo "-------------------------------------------"

# Parse first sale from response
FIRST_SALE=$(echo "$RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('success') and data.get('data'):
        sales = data['data']
        if sales:
            sale = sales[0]
            print(f'Sale ID: {sale.get(\"id\", \"N/A\")}')
            print(f'Discount Type: {sale.get(\"discountType\", \"N/A\")}')
            print(f'Discount Value: {sale.get(\"discountValue\", \"N/A\")}')
            print(f'Discount Amount: {sale.get(\"discountAmount\", \"N/A\")}')
            print(f'List Price Total: {sale.get(\"listPriceTotal\", \"N/A\")}')
            print(f'Unit List Price: {sale.get(\"unitListPrice\", \"N/A\")}')
        else:
            print('No sales found')
    else:
        print('API Error:', data.get('error', 'Unknown error'))
except Exception as e:
    print('Parse Error:', str(e))
")

echo "$FIRST_SALE"

# Test 3: Check discount display logic
echo ""
echo "🔍 Test 3: Check discount display logic"
echo "--------------------------------------"

# Test different discount types
echo "$RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('success') and data.get('data'):
        sales = data['data']
        for i, sale in enumerate(sales[:3]):  # Check first 3 sales
            sale_id = sale.get('id', 'N/A')
            discount_type = sale.get('discountType', 'none')
            discount_value = sale.get('discountValue', 0)
            discount_amount = sale.get('discountAmount', 0)
            
            print(f'Sale {i+1} ({sale_id}):')
            print(f'  Type: {discount_type}')
            print(f'  Value: {discount_value}')
            print(f'  Amount: {discount_amount}')
            
            # Test display logic
            if discount_type == 'percentage' and discount_value > 0:
                display = f'%{discount_value:.2f}'
            elif discount_type == 'amount' and discount_amount > 0:
                display = f'{discount_amount:,.2f} TRY'
            else:
                display = '-'
            
            print(f'  Display: {display}')
            print()
    else:
        print('No sales data available')
except Exception as e:
    print('Error:', str(e))
"

# Test 4: Check backend calculation consistency
echo ""
echo "🔍 Test 4: Check backend calculation consistency"
echo "----------------------------------------------"

echo "$RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('success') and data.get('data'):
        sales = data['data']
        for i, sale in enumerate(sales[:2]):  # Check first 2 sales
            sale_id = sale.get('id', 'N/A')
            discount_type = sale.get('discountType', 'none')
            discount_value = sale.get('discountValue', 0)
            discount_amount = sale.get('discountAmount', 0)
            list_price_total = sale.get('listPriceTotal', 0)
            devices = sale.get('devices', [])
            device_count = len(devices)
            
            print(f'Sale {i+1} ({sale_id}):')
            print(f'  Device Count: {device_count}')
            print(f'  List Price Total (Unit): {list_price_total}')
            
            # Calculate actual list price total
            actual_list_price_total = list_price_total * max(device_count, 1)
            print(f'  Actual List Price Total: {actual_list_price_total}')
            
            # Check discount calculation consistency
            if discount_type == 'percentage' and discount_value > 0:
                expected_discount = (actual_list_price_total * discount_value) / 100
                print(f'  Expected Discount Amount: {expected_discount:.2f}')
                print(f'  Actual Discount Amount: {discount_amount}')
                
                if abs(expected_discount - discount_amount) < 0.01:
                    print('  ✅ Discount calculation CONSISTENT')
                else:
                    print('  ❌ Discount calculation INCONSISTENT')
            elif discount_type == 'amount':
                if abs(discount_value - discount_amount) < 0.01:
                    print('  ✅ Fixed discount CONSISTENT')
                else:
                    print('  ❌ Fixed discount INCONSISTENT')
            
            print()
    else:
        print('No sales data available')
except Exception as e:
    print('Error:', str(e))
"

echo ""
echo "🎯 Fix #1 Migration Test Complete!"
echo "=================================="
echo ""
echo "Next: Run migration with 'alembic upgrade head' if tests show missing fields"
echo "Then re-run this test to verify migration worked"