#!/bin/bash

# Simple test for ear selection in new sale modal

BASE_URL="http://localhost:5003"
TENANT_ID="95625589-a4ad-41ff-a99e-4955943bb421"

echo "=== Testing Ear Selection Fix ==="
echo ""

# Get token
TOKEN=$(python3 gen_token_deneme.py 2>/dev/null)
if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token"
    exit 1
fi
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

# Test LEFT ear
echo "Test 1: LEFT ear sale"
IDEMPOTENCY_KEY_1="test-left-$(date +%s)-$RANDOM"
SALE_LEFT=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY_1" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"devices\": [{
      \"inventoryId\": \"$DEVICE_ID\",
      \"quantity\": 1,
      \"unitPrice\": $DEVICE_PRICE,
      \"listPrice\": $DEVICE_PRICE,
      \"ear\": \"left\",
      \"discountType\": \"none\",
      \"discountValue\": 0
    }],
    \"paymentMethod\": \"cash\",
    \"saleDate\": \"$(date +%Y-%m-%d)\",
    \"totalAmount\": $DEVICE_PRICE,
    \"paidAmount\": $DEVICE_PRICE,
    \"sgkScheme\": \"no_coverage\",
    \"sgkAmount\": 0,
    \"discount\": 0,
    \"reportStatus\": \"no_report\"
  }")

SALE_ID_LEFT=$(echo "$SALE_LEFT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('id', ''))" 2>/dev/null)
echo "✓ Created sale: $SALE_ID_LEFT"

# Verify ear
EAR_SAVED=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID_LEFT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print(d['data']['devices'][0]['ear'])" 2>/dev/null)

if [ "$EAR_SAVED" = "left" ]; then
    echo "✓ LEFT ear correctly saved"
else
    echo "❌ Expected 'left', got '$EAR_SAVED'"
fi
echo ""

# Test RIGHT ear
echo "Test 2: RIGHT ear sale"
IDEMPOTENCY_KEY_2="test-right-$(date +%s)-$RANDOM"
SALE_RIGHT=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY_2" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"devices\": [{
      \"inventoryId\": \"$DEVICE_ID\",
      \"quantity\": 1,
      \"unitPrice\": $DEVICE_PRICE,
      \"listPrice\": $DEVICE_PRICE,
      \"ear\": \"right\",
      \"discountType\": \"none\",
      \"discountValue\": 0
    }],
    \"paymentMethod\": \"cash\",
    \"saleDate\": \"$(date +%Y-%m-%d)\",
    \"totalAmount\": $DEVICE_PRICE,
    \"paidAmount\": $DEVICE_PRICE,
    \"sgkScheme\": \"no_coverage\",
    \"sgkAmount\": 0,
    \"discount\": 0,
    \"reportStatus\": \"no_report\"
  }")

SALE_ID_RIGHT=$(echo "$SALE_RIGHT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('id', ''))" 2>/dev/null)
echo "✓ Created sale: $SALE_ID_RIGHT"

# Verify ear
EAR_SAVED=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID_RIGHT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print(d['data']['devices'][0]['ear'])" 2>/dev/null)

if [ "$EAR_SAVED" = "right" ]; then
    echo "✓ RIGHT ear correctly saved"
else
    echo "❌ Expected 'right', got '$EAR_SAVED'"
fi
echo ""

# Test BOTH ears (bilateral)
echo "Test 3: BOTH ears (bilateral) sale"
TOTAL_BOTH=$(echo "$DEVICE_PRICE * 2" | bc)
IDEMPOTENCY_KEY_3="test-both-$(date +%s)-$RANDOM"
SALE_BOTH=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY_3" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"devices\": [{
      \"inventoryId\": \"$DEVICE_ID\",
      \"quantity\": 2,
      \"unitPrice\": $DEVICE_PRICE,
      \"listPrice\": $DEVICE_PRICE,
      \"ear\": \"both\",
      \"discountType\": \"none\",
      \"discountValue\": 0
    }],
    \"paymentMethod\": \"cash\",
    \"saleDate\": \"$(date +%Y-%m-%d)\",
    \"totalAmount\": $TOTAL_BOTH,
    \"paidAmount\": $TOTAL_BOTH,
    \"sgkScheme\": \"no_coverage\",
    \"sgkAmount\": 0,
    \"discount\": 0,
    \"reportStatus\": \"no_report\"
  }")

SALE_ID_BOTH=$(echo "$SALE_BOTH" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('id', ''))" 2>/dev/null)
echo "✓ Created sale: $SALE_ID_BOTH"

# Verify 2 assignments created
ASSIGNMENT_COUNT=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID_BOTH" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d['data']['devices']))" 2>/dev/null)

if [ "$ASSIGNMENT_COUNT" = "2" ]; then
    echo "✓ BOTH ears created 2 assignments"
else
    echo "❌ Expected 2 assignments, got $ASSIGNMENT_COUNT"
fi

echo ""
echo "=== All Tests Complete ==="
