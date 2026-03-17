#!/bin/bash

# Test Ear Selection Changes - Comprehensive Test
echo "=== Ear Selection Change Test Suite ==="
echo ""

TOKEN=$(python3 gen_token_deneme.py 2>/dev/null)
BASE_URL="http://localhost:5003/api"

# Test sale ID (bilateral sale)
SALE_ID="2603020107"

echo "📋 Test Scenarios:"
echo "  1. Bilateral → Single Left (delete right assignment)"
echo "  2. Single Left → Bilateral (create right assignment)"
echo "  3. Bilateral → Single Right (delete left assignment)"
echo "  4. Single Right → Single Left (change ear field)"
echo ""

# Helper function to get current state
get_sale_state() {
    curl -s -X GET "$BASE_URL/sales/$1" \
      -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sale = data.get('data', {})
devices = sale.get('devices', [])
print(f'Assignments: {len(devices)}')
for d in devices:
    print(f\"  - {d.get('ear')}: {d.get('id')}, SGK={d.get('sgkSupport', 0):.2f}, NetPayable={d.get('netPayable', 0):.2f}\")
" 2>/dev/null
}

# Helper function to update ear selection
update_ear() {
    local sale_id=$1
    local ear=$2
    local test_name=$3
    
    echo ""
    echo "🔄 Test: $test_name"
    echo "   Changing ear to: $ear"
    
    RESPONSE=$(curl -s -X PUT "$BASE_URL/sales/$sale_id" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: ear-test-$(date +%s)-$RANDOM" \
      -d "{
        \"listPriceTotal\": 10000.0,
        \"finalAmount\": 6608.64,
        \"patientPayment\": 6608.64,
        \"paidAmount\": 5000.0,
        \"discountAmount\": 0.0,
        \"sgkCoverage\": 6782.72,
        \"ear\": \"$ear\",
        \"sgkScheme\": \"over18_working\",
        \"serialNumberLeft\": \"LEFT-TEST-123\",
        \"serialNumberRight\": \"RIGHT-TEST-456\",
        \"deliveryStatus\": \"delivered\",
        \"reportStatus\": \"received\"
      }")
    
    SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)
    
    if [ "$SUCCESS" = "True" ]; then
        echo "   ✅ Update successful"
        sleep 1
        echo "   Current state:"
        get_sale_state "$sale_id" | sed 's/^/   /'
    else
        echo "   ❌ Update failed"
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -20 | sed 's/^/   /'
    fi
}

# Get initial state
echo "📊 Initial State:"
get_sale_state "$SALE_ID"

# Test 1: Bilateral → Single Left
update_ear "$SALE_ID" "left" "Bilateral → Single Left"

# Test 2: Single Left → Bilateral
update_ear "$SALE_ID" "both" "Single Left → Bilateral"

# Test 3: Bilateral → Single Right
update_ear "$SALE_ID" "right" "Bilateral → Single Right"

# Test 4: Single Right → Single Left
update_ear "$SALE_ID" "left" "Single Right → Single Left"

# Final verification
echo ""
echo "🎯 Final Verification:"
echo ""
FINAL=$(curl -s -X GET "$BASE_URL/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$FINAL" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sale = data.get('data', {})
devices = sale.get('devices', [])

print('Final State:')
print(f'  Total Assignments: {len(devices)}')
print(f'  Total Amount: {sale.get(\"totalAmount\", 0):.2f} TRY')
print(f'  Total SGK: {sale.get(\"sgkCoverage\", 0):.2f} TRY')
print()
print('Devices:')
for i, dev in enumerate(devices, 1):
    print(f'  {i}. Ear: {dev.get(\"ear\")}')
    print(f'     ID: {dev.get(\"id\")}')
    print(f'     List Price: {dev.get(\"listPrice\", 0):.2f} TRY')
    print(f'     SGK Support: {dev.get(\"sgkSupport\", 0):.2f} TRY')
    print(f'     Net Payable: {dev.get(\"netPayable\", 0):.2f} TRY')
    print(f'     Serial: {dev.get(\"serialNumber\", \"N/A\")}')
    print()

# Validation
all_correct = True

# Check ear field
if len(devices) == 1:
    if devices[0].get('ear') != 'left':
        print('❌ Final ear should be \"left\"')
        all_correct = False
    else:
        print('✅ Final ear is correct: left')
else:
    print(f'❌ Should have 1 assignment, found {len(devices)}')
    all_correct = False

# Check serial number
if len(devices) == 1:
    serial = devices[0].get('serialNumber')
    if serial == 'LEFT-TEST-123':
        print('✅ Serial number correct: LEFT-TEST-123')
    else:
        print(f'❌ Serial number incorrect: {serial}')
        all_correct = False

# Check SGK scheme
if len(devices) == 1:
    scheme = devices[0].get('sgkScheme')
    if scheme == 'over18_working':
        print('✅ SGK scheme correct: over18_working')
    else:
        print(f'❌ SGK scheme incorrect: {scheme}')
        all_correct = False

# Check delivery/report status
if len(devices) == 1:
    delivery = devices[0].get('deliveryStatus')
    report = devices[0].get('reportStatus')
    if delivery == 'delivered' and report == 'received':
        print('✅ Delivery and report status correct')
    else:
        print(f'❌ Status incorrect: delivery={delivery}, report={report}')
        all_correct = False

print()
if all_correct:
    print('🎉 ALL TESTS PASSED!')
else:
    print('⚠️  SOME TESTS FAILED')
" 2>/dev/null

echo ""
echo "=== Test Suite Complete ==="
