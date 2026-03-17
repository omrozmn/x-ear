#!/bin/bash

# Test bilateral sale creation
# Verify that backend creates 2 separate assignments (left + right)

BASE_URL="http://localhost:5003"
TENANT_ID="95625589-a4ad-41ff-a99e-4955943bb421"

echo "=== Testing Bilateral Sale Creation ==="
echo ""

# Get token
TOKEN=$(python3 gen_token_deneme.py 2>/dev/null)
echo "✓ Token obtained"

# Get a party
PARTY_ID=$(curl -s -X GET "$BASE_URL/api/parties?page=1&per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print(d['data'][0]['id'])" 2>/dev/null)

echo "✓ Party ID: $PARTY_ID"

# Get a device
DEVICE_DATA=$(curl -s -X GET "$BASE_URL/api/inventory?category=hearing_aid&per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" | \
  python3 -c "import sys, json; d=json.load(sys.stdin); item=d['data'][0]; print(f\"{item['id']}|{item['price']}\")" 2>/dev/null)

DEVICE_ID=$(echo "$DEVICE_DATA" | cut -d'|' -f1)
DEVICE_PRICE=$(echo "$DEVICE_DATA" | cut -d'|' -f2)

echo "✓ Device ID: $DEVICE_ID"
echo "✓ Device Price: $DEVICE_PRICE TRY"
echo ""

# Create bilateral sale
echo "1. Creating bilateral sale (earSide=both)..."
IDEMPOTENCY_KEY="test-bilateral-$(date +%s)-$RANDOM"
SALE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"productId\": \"$DEVICE_ID\",
    \"quantity\": 2,
    \"salesPrice\": $DEVICE_PRICE,
    \"paymentMethod\": \"cash\",
    \"saleDate\": \"$(date +%Y-%m-%d)\",
    \"sgkScheme\": \"over18_retired\",
    \"earSide\": \"both\"
  }")

SALE_ID=$(echo "$SALE_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('id', ''))" 2>/dev/null)

if [ -z "$SALE_ID" ]; then
    echo "❌ Failed to create sale"
    echo "Response:"
    echo "$SALE_RESPONSE" | python3 -m json.tool
    exit 1
fi

echo "✓ Sale created: $SALE_ID"
echo ""

# Get sale details
echo "2. Getting sale details..."
SALE_DETAIL=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

# Check devices array
DEVICE_COUNT=$(echo "$SALE_DETAIL" | python3 -c "import sys, json; d=json.load(sys.stdin); devices=d.get('data', {}).get('devices', []); print(len(devices))" 2>/dev/null)

echo "✓ Number of devices: $DEVICE_COUNT"

if [ "$DEVICE_COUNT" = "2" ]; then
    echo "✅ SUCCESS: Bilateral sale created 2 device assignments!"
    
    # Check ears
    EARS=$(echo "$SALE_DETAIL" | python3 -c "import sys, json; d=json.load(sys.stdin); devices=d.get('data', {}).get('devices', []); print(','.join([dev.get('ear', '') for dev in devices]))" 2>/dev/null)
    echo "✓ Ears: $EARS"
    
    if [[ "$EARS" == *"left"* ]] && [[ "$EARS" == *"right"* ]]; then
        echo "✅ Both LEFT and RIGHT assignments created!"
    else
        echo "⚠️  Expected left and right, got: $EARS"
    fi
    
    # Check SGK amounts
    echo ""
    echo "3. Checking SGK amounts..."
    SGK_AMOUNTS=$(echo "$SALE_DETAIL" | python3 -c "
import sys, json
d = json.load(sys.stdin)
devices = d.get('data', {}).get('devices', [])
for i, dev in enumerate(devices):
    ear = dev.get('ear', '')
    sgk = dev.get('sgkSupport', 0) or dev.get('sgkCoverageAmount', 0)
    print(f'{ear}: {sgk} TRY')
" 2>/dev/null)
    
    echo "$SGK_AMOUNTS"
    
    # Calculate total SGK
    TOTAL_SGK=$(echo "$SALE_DETAIL" | python3 -c "
import sys, json
d = json.load(sys.stdin)
devices = d.get('data', {}).get('devices', [])
total = sum(dev.get('sgkSupport', 0) or dev.get('sgkCoverageAmount', 0) for dev in devices)
print(total)
" 2>/dev/null)
    
    echo "✓ Total SGK: $TOTAL_SGK TRY"
    
    # Expected: 2 x 4239.20 = 8478.40 (over18_retired)
    EXPECTED_SGK="8478.4"
    if [ "$TOTAL_SGK" = "$EXPECTED_SGK" ] || [ "$TOTAL_SGK" = "8478.40" ]; then
        echo "✅ SGK amount correct! (2 x 4239.20 = 8478.40)"
    else
        echo "⚠️  Expected $EXPECTED_SGK, got $TOTAL_SGK"
    fi
    
else
    echo "❌ FAILED: Expected 2 devices, got $DEVICE_COUNT"
    echo ""
    echo "Sale detail:"
    echo "$SALE_DETAIL" | python3 -m json.tool | head -50
fi

echo ""
echo "=== Test Complete ==="
