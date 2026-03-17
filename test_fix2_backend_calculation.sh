#!/bin/bash

# Test Fix #2: Backend _build_full_sale_data() Calculation Logic

echo "🔧 FIX #2: Testing Backend Calculation Logic"
echo "============================================"

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

# Test 1: Check discount calculation formula (SGK ÖNCE, İndirim SONRA)
echo ""
echo "🔍 Test 1: Check discount calculation formula"
echo "--------------------------------------------"

RESPONSE=$(curl -s -X GET "http://localhost:5003/api/parties/pat_a722c0ae/sales?include_details=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('success') and data.get('data'):
        sales = data['data']
        print(f'Found {len(sales)} sales to test')
        print()
        
        for i, sale in enumerate(sales[:3]):  # Test first 3 sales
            sale_id = sale.get('id', 'N/A')
            discount_type = sale.get('discountType', 'none')
            discount_value = sale.get('discountValue', 0)
            discount_amount = sale.get('discountAmount', 0)
            
            # Get pricing data
            list_price_total = sale.get('listPriceTotal', 0)  # Should be unit price
            actual_list_price_total = sale.get('actualListPriceTotal', 0)  # Should be total
            unit_list_price = sale.get('unitListPrice', 0)  # Should be unit price
            sgk_coverage = sale.get('sgkCoverage', 0)
            final_amount = sale.get('finalAmount', 0)
            devices = sale.get('devices', [])
            device_count = len(devices)
            
            print(f'Sale {i+1} ({sale_id}):')
            print(f'  Device Count: {device_count}')
            print(f'  List Price Total (from API): {list_price_total}')
            print(f'  Actual List Price Total: {actual_list_price_total}')
            print(f'  Unit List Price: {unit_list_price}')
            print(f'  SGK Coverage: {sgk_coverage}')
            print(f'  Discount Type: {discount_type}')
            print(f'  Discount Value: {discount_value}')
            print(f'  Discount Amount: {discount_amount}')
            print(f'  Final Amount: {final_amount}')
            
            # Test SGK ÖNCE, İndirim SONRA formula
            if device_count > 0 and unit_list_price > 0:
                expected_total = unit_list_price * device_count
                print(f'  Expected Total (unit × count): {expected_total}')
                
                # SGK ÖNCE
                after_sgk = expected_total - sgk_coverage
                print(f'  After SGK: {after_sgk}')
                
                # İndirim SONRA
                if discount_type == 'percentage' and discount_value > 0:
                    expected_discount = (after_sgk * discount_value) / 100
                    print(f'  Expected Discount (% of after-SGK): {expected_discount:.2f}')
                elif discount_type == 'amount':
                    expected_discount = discount_amount
                    print(f'  Expected Discount (fixed): {expected_discount}')
                else:
                    expected_discount = 0
                
                expected_final = after_sgk - expected_discount
                print(f'  Expected Final: {expected_final:.2f}')
                print(f'  Actual Final: {final_amount}')
                
                if abs(expected_final - final_amount) < 0.01:
                    print('  ✅ Calculation CORRECT')
                else:
                    print('  ❌ Calculation INCORRECT')
            
            print()
    else:
        print('No sales data available')
        print('Error:', data.get('error', 'Unknown error'))
except Exception as e:
    print('Error:', str(e))
"

# Test 2: Check new fields in response
echo ""
echo "🔍 Test 2: Check new fields in response"
echo "--------------------------------------"

echo "$RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('success') and data.get('data'):
        sales = data['data']
        first_sale = sales[0] if sales else {}
        
        # Check for new fields
        new_fields = ['actualListPriceTotal', 'unitListPrice', 'remainingAmount']
        
        print('Checking for new fields in response:')
        for field in new_fields:
            if field in first_sale:
                print(f'  ✅ {field}: {first_sale[field]}')
            else:
                print(f'  ❌ {field}: MISSING')
        
        # Check discount fields
        discount_fields = ['discountType', 'discountValue']
        print()
        print('Checking discount fields:')
        for field in discount_fields:
            if field in first_sale:
                value = first_sale[field]
                if value is not None and value != 'none' and value != 0:
                    print(f'  ✅ {field}: {value}')
                else:
                    print(f'  ⚠️ {field}: {value} (empty/none)')
            else:
                print(f'  ❌ {field}: MISSING')
    else:
        print('No sales data available')
except Exception as e:
    print('Error:', str(e))
"

# Test 3: Check bilateral sale calculations
echo ""
echo "🔍 Test 3: Check bilateral sale calculations"
echo "-------------------------------------------"

echo "$RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('success') and data.get('data'):
        sales = data['data']
        
        # Find bilateral sales (2 devices)
        bilateral_sales = [s for s in sales if len(s.get('devices', [])) == 2]
        
        if bilateral_sales:
            print(f'Found {len(bilateral_sales)} bilateral sales')
            
            for sale in bilateral_sales[:2]:  # Test first 2 bilateral
                sale_id = sale.get('id', 'N/A')
                devices = sale.get('devices', [])
                list_price_total = sale.get('listPriceTotal', 0)
                actual_list_price_total = sale.get('actualListPriceTotal', 0)
                
                print(f'Bilateral Sale {sale_id}:')
                print(f'  Device Count: {len(devices)}')
                print(f'  List Price Total: {list_price_total}')
                print(f'  Actual List Price Total: {actual_list_price_total}')
                
                # Check if actual = list × 2
                expected_actual = list_price_total * 2
                print(f'  Expected Actual (list × 2): {expected_actual}')
                
                if abs(expected_actual - actual_list_price_total) < 0.01:
                    print('  ✅ Bilateral calculation CORRECT')
                else:
                    print('  ❌ Bilateral calculation INCORRECT')
                
                # Check device prices
                for i, device in enumerate(devices):
                    device_list_price = device.get('listPrice', 0)
                    print(f'  Device {i+1} List Price: {device_list_price}')
                
                print()
        else:
            print('No bilateral sales found to test')
    else:
        print('No sales data available')
except Exception as e:
    print('Error:', str(e))
"

# Test 4: Check remaining amount calculation
echo ""
echo "🔍 Test 4: Check remaining amount calculation"
echo "--------------------------------------------"

echo "$RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('success') and data.get('data'):
        sales = data['data']
        
        for i, sale in enumerate(sales[:3]):  # Test first 3 sales
            sale_id = sale.get('id', 'N/A')
            final_amount = sale.get('finalAmount', 0)
            paid_amount = sale.get('paidAmount', 0)
            remaining_amount = sale.get('remainingAmount', 0)
            
            expected_remaining = max(0, final_amount - paid_amount)
            
            print(f'Sale {i+1} ({sale_id}):')
            print(f'  Final Amount: {final_amount}')
            print(f'  Paid Amount: {paid_amount}')
            print(f'  Remaining Amount: {remaining_amount}')
            print(f'  Expected Remaining: {expected_remaining}')
            
            if abs(expected_remaining - remaining_amount) < 0.01:
                print('  ✅ Remaining calculation CORRECT')
            else:
                print('  ❌ Remaining calculation INCORRECT')
            
            print()
    else:
        print('No sales data available')
except Exception as e:
    print('Error:', str(e))
"

echo ""
echo "🎯 Fix #2 Backend Calculation Test Complete!"
echo "==========================================="
echo ""
echo "If tests show incorrect calculations, check backend logs for detailed calculation info"