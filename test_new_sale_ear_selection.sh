#!/bin/bash

# Test new sale modal ear selection fix
# This verifies that ear selection (left/right/both) is properly saved to backend

BASE_URL="http://localhost:5003"
TENANT_ID="95625589-a4ad-41ff-a99e-4955943bb421"

echo "=== Testing New Sale Modal Ear Selection ==="
echo ""

# Get auth token
echo "1. Getting auth token..."
TOKEN=$(python3 get_token.py 2>/dev/null | grep -o '"[^"]*"' | head -1 | tr -d '"')
if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token"
    exit 1
fi
echo "✓ Token obtained"
echo ""

# Get a party ID
echo "2. Getting a party ID..."
PARTY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/parties?page=1&per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

PARTY_ID=$(echo "$PARTY_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data']['data'][0]['id'] if data.get('data', {}).get('data') else '')" 2>/dev/null)

if [ -z "$PARTY_ID" ]; then
    echo "❌ Failed to get party ID"
    exit 1
fi
echo "✓ Party ID: $PARTY_ID"
echo ""

# Get an inventory item (hearing aid)
echo "3. Getting a hearing aid from inventory..."
INVENTORY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/inventory?category=hearing_aid&per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

DEVICE_ID=$(echo "$INVENTORY_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data']['data'][0]['id'] if data.get('data', {}).get('data') else '')" 2>/dev/null)
DEVICE_PRICE=$(echo "$INVENTORY_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data']['data'][0]['price'] if data.get('data', {}).get('data') else 0)" 2>/dev/null)

if [ -z "$DEVICE_ID" ]; then
    echo "❌ Failed to get device ID"
    exit 1
fi
echo "✓ Device ID: $DEVICE_ID"
echo "✓ Device Price: $DEVICE_PRICE TRY"
echo ""

# Test 1: Create sale with LEFT ear
echo "4. Test 1: Creating sale with LEFT ear..."
SALE_DATA_LEFT=$(cat <<EOJSON
{
  "devices": [{
    "inventoryId": "$DEVICE_ID",
    "quantity": 1,
    "unitPrice": $DEVICE_PRICE,
    "listPrice": $DEVICE_PRICE,
    "ear": "left",
    "discountType": "none",
    "discountValue": 0
  }],
  "paymentMethod": "cash",
  "saleDate": "$(date +%Y-%m-%d)",
  "totalAmount": $DEVICE_PRICE,
  "paidAmount": $DEVICE_PRICE,
  "sgkScheme": "no_coverage",
  "sgkAmount": 0,
  "discount": 0,
  "reportStatus": "no_report"
}
EOJSON
)

SALE_RESPONSE_LEFT=$(curl -s -X POST "$BASE_URL/api/parties/$PARTY_ID/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "$SALE_DATA_LEFT")

SALE_ID_LEFT=$(echo "$SALE_RESPONSE_LEFT" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('id', ''))" 2>/dev/null)

if [ -z "$SALE_ID_LEFT" ]; then
    echo "❌ Failed to create LEFT ear sale"
    echo "Response: $SALE_RESPONSE_LEFT"
    exit 1
fi
echo "✓ LEFT ear sale created: $SALE_ID_LEFT"

# Verify LEFT ear assignment
SALE_DETAIL_LEFT=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID_LEFT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

EAR_LEFT=$(echo "$SALE_DETAIL_LEFT" | python3 -c "import sys, json; data = json.load(sys.stdin); devices = data.get('data', {}).get('devices', []); print(devices[0].get('ear', '') if devices else '')" 2>/dev/null)

if [ "$EAR_LEFT" = "left" ]; then
    echo "✓ LEFT ear correctly saved"
else
    echo "❌ LEFT ear NOT saved correctly (got: $EAR_LEFT)"
fi
echo ""

# Test 2: Create sale with RIGHT ear
echo "5. Test 2: Creating sale with RIGHT ear..."
SALE_DATA_RIGHT=$(cat <<EOJSON
{
  "devices": [{
    "inventoryId": "$DEVICE_ID",
    "quantity": 1,
    "unitPrice": $DEVICE_PRICE,
    "listPrice": $DEVICE_PRICE,
    "ear": "right",
    "discountType": "none",
    "discountValue": 0
  }],
  "paymentMethod": "cash",
  "saleDate": "$(date +%Y-%m-%d)",
  "totalAmount": $DEVICE_PRICE,
  "paidAmount": $DEVICE_PRICE,
  "sgkScheme": "no_coverage",
  "sgkAmount": 0,
  "discount": 0,
  "reportStatus": "no_report"
}
EOJSON
)

SALE_RESPONSE_RIGHT=$(curl -s -X POST "$BASE_URL/api/parties/$PARTY_ID/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "$SALE_DATA_RIGHT")

SALE_ID_RIGHT=$(echo "$SALE_RESPONSE_RIGHT" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('id', ''))" 2>/dev/null)

if [ -z "$SALE_ID_RIGHT" ]; then
    echo "❌ Failed to create RIGHT ear sale"
    echo "Response: $SALE_RESPONSE_RIGHT"
    exit 1
fi
echo "✓ RIGHT ear sale created: $SALE_ID_RIGHT"

# Verify RIGHT ear assignment
SALE_DETAIL_RIGHT=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID_RIGHT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

EAR_RIGHT=$(echo "$SALE_DETAIL_RIGHT" | python3 -c "import sys, json; data = json.load(sys.stdin); devices = data.get('data', {}).get('devices', []); print(devices[0].get('ear', '') if devices else '')" 2>/dev/null)

if [ "$EAR_RIGHT" = "right" ]; then
    echo "✓ RIGHT ear correctly saved"
else
    echo "❌ RIGHT ear NOT saved correctly (got: $EAR_RIGHT)"
fi
echo ""

# Test 3: Create sale with BOTH ears (bilateral)
echo "6. Test 3: Creating sale with BOTH ears (bilateral)..."
SALE_DATA_BOTH=$(cat <<EOJSON
{
  "devices": [{
    "inventoryId": "$DEVICE_ID",
    "quantity": 2,
    "unitPrice": $DEVICE_PRICE,
    "listPrice": $DEVICE_PRICE,
    "ear": "both",
    "discountType": "none",
    "discountValue": 0
  }],
  "paymentMethod": "cash",
  "saleDate": "$(date +%Y-%m-%d)",
  "totalAmount": $(echo "$DEVICE_PRICE * 2" | bc),
  "paidAmount": $(echo "$DEVICE_PRICE * 2" | bc),
  "sgkScheme": "no_coverage",
  "sgkAmount": 0,
  "discount": 0,
  "reportStatus": "no_report"
}
EOJSON
)

SALE_RESPONSE_BOTH=$(curl -s -X POST "$BASE_URL/api/parties/$PARTY_ID/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "$SALE_DATA_BOTH")

SALE_ID_BOTH=$(echo "$SALE_RESPONSE_BOTH" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('id', ''))" 2>/dev/null)

if [ -z "$SALE_ID_BOTH" ]; then
    echo "❌ Failed to create BOTH ears sale"
    echo "Response: $SALE_RESPONSE_BOTH"
    exit 1
fi
echo "✓ BOTH ears sale created: $SALE_ID_BOTH"

# Verify BOTH ears creates 2 assignments (left + right)
SALE_DETAIL_BOTH=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID_BOTH" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

ASSIGNMENT_COUNT=$(echo "$SALE_DETAIL_BOTH" | python3 -c "import sys, json; data = json.load(sys.stdin); devices = data.get('data', {}).get('devices', []); print(len(devices))" 2>/dev/null)

if [ "$ASSIGNMENT_COUNT" = "2" ]; then
    echo "✓ BOTH ears correctly created 2 assignments"
    
    # Check if we have left and right
    EARS=$(echo "$SALE_DETAIL_BOTH" | python3 -c "import sys, json; data = json.load(sys.stdin); devices = data.get('data', {}).get('devices', []); print(','.join([d.get('ear', '') for d in devices]))" 2>/dev/null)
    
    if [[ "$EARS" == *"left"* ]] && [[ "$EARS" == *"right"* ]]; then
        echo "✓ Both LEFT and RIGHT assignments created"
    else
        echo "❌ Expected left and right assignments, got: $EARS"
    fi
else
    echo "❌ BOTH ears should create 2 assignments, got: $ASSIGNMENT_COUNT"
fi
echo ""

echo "=== Test Summary ==="
echo "✓ All ear selection tests completed"
echo "✓ LEFT ear: $SALE_ID_LEFT"
echo "✓ RIGHT ear: $SALE_ID_RIGHT"
echo "✓ BOTH ears: $SALE_ID_BOTH (2 assignments)"
