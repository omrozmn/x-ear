#!/bin/bash

# Test ear selection and discount type updates
# Backend: http://localhost:5003
# Tenant: deneme (95625589-a4ad-41ff-a99e-4955943bb421)

BASE_URL="http://localhost:5003"
TENANT_ID="95625589-a4ad-41ff-a99e-4955943bb421"

# Generate token
echo "🔑 Generating token..."
TOKEN=$(cd ../../ && python3 x-ear/gen_token_deneme.py 2>/dev/null | grep -o 'eyJ[^"]*')

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to generate token"
    exit 1
fi

echo "✅ Token generated"
echo ""

# Find a sale to test with
echo "📋 Finding a sale to test..."
SALE_RESPONSE=$(curl -s -X GET "$BASE_URL/sales?page=1&per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

SALE_ID=$(echo "$SALE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') and len(data['data']) > 0 else '')" 2>/dev/null)

if [ -z "$SALE_ID" ]; then
    echo "❌ No sales found"
    exit 1
fi

echo "✅ Found sale: $SALE_ID"
echo ""

# Get current sale details
echo "📊 Current sale details:"
CURRENT_SALE=$(curl -s -X GET "$BASE_URL/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$CURRENT_SALE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sale = data.get('data', {})
devices = sale.get('devices', [])
print(f\"Sale ID: {sale.get('id')}\")
print(f\"Devices count: {len(devices)}\")
for i, d in enumerate(devices):
    print(f\"  Device {i+1}: ear={d.get('ear')}, discountType={d.get('discountType')}\")
"
echo ""

# TEST 1: Update discount type
echo "🧪 TEST 1: Update discount type to 'percentage'"
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "discountType": "percentage"
  }')

echo "$UPDATE_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print('✅ Discount type update successful')
        devices = data.get('data', {}).get('devices', [])
        for i, d in enumerate(devices):
            print(f\"  Device {i+1}: discountType={d.get('discountType')}\")
    else:
        print('❌ Update failed:', data.get('error', {}).get('message', 'Unknown error'))
except Exception as e:
    print('❌ Error parsing response:', str(e))
"
echo ""

# TEST 2: Change ear selection (if bilateral, make it single left)
echo "🧪 TEST 2: Change ear selection"
CURRENT_DEVICES=$(echo "$CURRENT_SALE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', {}).get('devices', [])))")

if [ "$CURRENT_DEVICES" = "2" ]; then
    echo "Current: Bilateral → Changing to: Single Left"
    NEW_EAR="left"
else
    echo "Current: Single → Changing to: Bilateral"
    NEW_EAR="both"
fi

UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ear\": \"$NEW_EAR\"
  }")

echo "$UPDATE_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print('✅ Ear selection update successful')
        devices = data.get('data', {}).get('devices', [])
        print(f\"  Devices count: {len(devices)}\")
        for i, d in enumerate(devices):
            print(f\"  Device {i+1}: ear={d.get('ear')}\")
    else:
        error = data.get('error', {})
        if isinstance(error, dict):
            print('❌ Update failed:', error.get('message', 'Unknown error'))
        else:
            print('❌ Update failed:', error)
except Exception as e:
    print('❌ Error parsing response:', str(e))
"
echo ""

# TEST 3: Update both discount type and ear together
echo "🧪 TEST 3: Update both discount type and ear together"
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "discountType": "amount",
    "ear": "right"
  }')

echo "$UPDATE_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print('✅ Combined update successful')
        devices = data.get('data', {}).get('devices', [])
        print(f\"  Devices count: {len(devices)}\")
        for i, d in enumerate(devices):
            print(f\"  Device {i+1}: ear={d.get('ear')}, discountType={d.get('discountType')}\")
    else:
        error = data.get('error', {})
        if isinstance(error, dict):
            print('❌ Update failed:', error.get('message', 'Unknown error'))
        else:
            print('❌ Update failed:', error)
except Exception as e:
    print('❌ Error parsing response:', str(e))
"
echo ""

echo "✅ All tests completed"
