#!/bin/bash
set -e

# Get tokens
TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

TENANT_ID=$(curl -s -X GET http://localhost:5003/api/admin/tenants \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; data=json.load(sys.stdin); items=data.get('data', {}).get('tenants', []); print(items[0]['id'] if items and len(items) > 0 else '')")

TENANT_TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/debug/switch-tenant \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d "{\"targetTenantId\": \"$TENANT_ID\"}" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('accessToken', '') if data.get('data') else '')")

echo "Step 1: Create Party"
TC=$(python3 -c "import random; print(random.randint(10000000000, 99999999999))")
PHONE=$(python3 -c "import time; print(f'+9055{int(time.time()) % 100000000}')")
EMAIL="test$(date +%s)@example.com"

PARTY=$(curl -s -X POST http://localhost:5003/api/parties \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d "{\"firstName\": \"Test\", \"lastName\": \"Patient\", \"phone\": \"$PHONE\", \"email\": \"$EMAIL\", \"tcNumber\": \"$TC\"}")

PARTY_ID=$(echo "$PARTY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('id', ''))")
echo "✓ Party ID: $PARTY_ID"

echo -e "\nStep 2: Create Inventory Item"
ITEM=$(curl -s -X POST http://localhost:5003/api/inventory \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{
    "name": "Test Hearing Aid",
    "brand": "TestBrand",
    "model": "TestModel",
    "category": "hearing_aid",
    "price": 1000.0,
    "quantity": 10
  }')

echo "$ITEM" | python3 -m json.tool | head -25

ITEM_ID=$(echo "$ITEM" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('id', ''))")
echo "✓ Item ID: $ITEM_ID"

echo -e "\nStep 3: Create Sale"
curl -s -X POST http://localhost:5003/api/sales \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"productId\": \"$ITEM_ID\",
    \"saleDate\": \"2026-02-22\",
    \"salesPrice\": 1000.0,
    \"paymentMethod\": \"cash\"
  }" | python3 -m json.tool | head -30

echo -e "\n✓ Sales flow test completed"
