#!/bin/bash

# Test sale update fixes
# 1. Create a sale
# 2. Update it with paidAmount
# 3. Verify the update worked

BASE_URL="http://localhost:5003"
TENANT_ID="95625589-a4ad-41ff-a99e-4955943bb421"

echo "=== Testing Sale Update Fixes ==="
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

# Create a sale
echo "1. Creating a test sale..."
IDEMPOTENCY_KEY="test-update-$(date +%s)-$RANDOM"
SALE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"productId\": \"$DEVICE_ID\",
    \"quantity\": 1,
    \"salesPrice\": $DEVICE_PRICE,
    \"paymentMethod\": \"cash\",
    \"saleDate\": \"$(date +%Y-%m-%d)\",
    \"sgkScheme\": \"over18_working\",
    \"earSide\": \"left\"
  }")

SALE_ID=$(echo "$SALE_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('id', ''))" 2>/dev/null)

if [ -z "$SALE_ID" ]; then
    echo "❌ Failed to create sale"
    echo "Response: $SALE_RESPONSE"
    exit 1
fi

echo "✓ Sale created: $SALE_ID"
echo ""

# Get sale details before update
echo "2. Getting sale details before update..."
SALE_BEFORE=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

PAID_BEFORE=$(echo "$SALE_BEFORE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('paidAmount', 0))" 2>/dev/null)
echo "✓ Paid amount before: $PAID_BEFORE TRY"
echo ""

# Update sale with paidAmount
echo "3. Updating sale with paidAmount=5000..."
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: update-$(date +%s)-$RANDOM" \
  -d '{
    "paidAmount": 5000,
    "notes": "Test update with paidAmount"
  }')

echo "Update response:"
echo "$UPDATE_RESPONSE" | python3 -m json.tool
echo ""

# Get sale details after update
echo "4. Getting sale details after update..."
SALE_AFTER=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

PAID_AFTER=$(echo "$SALE_AFTER" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('paidAmount', 0))" 2>/dev/null)
echo "✓ Paid amount after: $PAID_AFTER TRY"
echo ""

# Verify
if [ "$PAID_AFTER" = "5000" ] || [ "$PAID_AFTER" = "5000.0" ]; then
    echo "✅ SUCCESS: paidAmount updated correctly!"
else
    echo "❌ FAILED: paidAmount not updated (expected 5000, got $PAID_AFTER)"
fi

echo ""
echo "=== Test Complete ==="
