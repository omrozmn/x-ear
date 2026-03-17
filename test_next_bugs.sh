#!/bin/bash

set -e

echo "=== Backend Bug Testing - Curl Method ==="
echo "Getting admin token..."
TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: login-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

echo "Token: ${TOKEN:0:20}..."

echo -e "\nGetting tenant..."
TENANT_ID=$(curl -s http://localhost:5003/api/admin/tenants \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['tenants'][0]['id'])")

echo "Tenant: $TENANT_ID"

echo -e "\nSwitching to tenant..."
TENANT_TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/debug/switch-tenant \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: switch-$(date +%s)" \
  -d "{\"targetTenantId\": \"$TENANT_ID\"}" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

echo "Tenant Token: ${TENANT_TOKEN:0:20}..."

# Test 1: Create Party
echo -e "\n=== Test 1: Create Party ==="
PARTY=$(curl -s -X POST http://localhost:5003/api/parties \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"Party\",
    \"phone\": \"+905$(date +%s | tail -c 10)\",
    \"email\": \"test$(date +%s)@example.com\",
    \"tcNumber\": \"$(python3 -c 'import random; print(random.randint(10000000000, 99999999999))')\"
  }")

PARTY_ID=$(echo "$PARTY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('id', ''))" 2>/dev/null || echo "")

if [ -z "$PARTY_ID" ]; then
  echo "❌ Party creation failed"
  echo "$PARTY" | python3 -m json.tool | head -20
  exit 1
fi

echo "✓ Party created: $PARTY_ID"

# Test 2: Create Inventory Item
echo -e "\n=== Test 2: Create Inventory Item ==="
ITEM=$(curl -s -X POST http://localhost:5003/api/inventory \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: item-$(date +%s)" \
  -d "{
    \"name\": \"Test Device $(date +%s)\",
    \"brand\": \"TestBrand\",
    \"sku\": \"SKU-$(date +%s)\",
    \"category\": \"HEARING_AID\",
    \"price\": 5000.00,
    \"availableInventory\": 10
  }")

ITEM_ID=$(echo "$ITEM" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('id', ''))" 2>/dev/null || echo "")

if [ -z "$ITEM_ID" ]; then
  echo "❌ Item creation failed"
  echo "$ITEM" | python3 -m json.tool | head -20
else
  echo "✓ Item created: $ITEM_ID"
fi

# Test 3: Create Sale
echo -e "\n=== Test 3: POST /api/sales ==="
SALE=$(curl -s -X POST http://localhost:5003/api/sales \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: sale-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"productId\": \"$ITEM_ID\",
    \"quantity\": 1,
    \"paymentMethod\": \"cash\"
  }")

SALE_ID=$(echo "$SALE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('sale', {}).get('id', ''))" 2>/dev/null || echo "")

if [ -z "$SALE_ID" ]; then
  echo "❌ Sale creation failed"
  echo "$SALE" | python3 -m json.tool | head -20
else
  echo "✓ Sale created: $SALE_ID"
fi

# Test 4: Device Assignment
echo -e "\n=== Test 4: POST /api/parties/{partyId}/device-assignments ==="
if [ ! -z "$PARTY_ID" ] && [ ! -z "$ITEM_ID" ]; then
  ASSIGN=$(curl -s -X POST "http://localhost:5003/api/parties/$PARTY_ID/device-assignments" \
    -H "Authorization: Bearer $TENANT_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: assign-$(date +%s)" \
    -d "{
      \"deviceAssignments\": [{
        \"inventoryId\": \"$ITEM_ID\",
        \"ear\": \"LEFT\",
        \"partyId\": \"$PARTY_ID\"
      }]
    }")
  
  echo "$ASSIGN" | python3 -m json.tool | head -30
fi

# Test 5: Payment Plan
echo -e "\n=== Test 5: POST /api/sales/{saleId}/payment-plan ==="
if [ ! -z "$SALE_ID" ]; then
  PAYMENT_PLAN=$(curl -s -X POST "http://localhost:5003/api/sales/$SALE_ID/payment-plan" \
    -H "Authorization: Bearer $TENANT_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: payment-$(date +%s)" \
    -d "{
      \"planType\": \"installment\",
      \"installmentCount\": 3,
      \"downPayment\": 1000.0
    }")
  
  echo "$PAYMENT_PLAN" | python3 -m json.tool | head -20
fi

echo -e "\n=== Testing Complete ==="
