#!/bin/bash

set -e

echo "=== Testing Batch 9 - Sales Operations ==="

# Get tokens
TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: login-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

TENANT_ID=$(curl -s http://localhost:5003/api/admin/tenants \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['tenants'][0]['id'])")

TENANT_TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/debug/switch-tenant \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: switch-$(date +%s)" \
  -d "{\"targetTenantId\": \"$TENANT_ID\"}" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

echo "Tokens ready!"

# Create resources for testing
PARTY_ID=$(curl -s -X POST http://localhost:5003/api/parties \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d "{
    \"firstName\": \"Sale\",
    \"lastName\": \"Test\",
    \"phone\": \"+9055512$(date +%s | tail -c 6)\",
    \"tcNo\": \"$(date +%s)12345\"
  }" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")

ITEM_ID=$(curl -s -X POST http://localhost:5003/api/inventory \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: item-$(date +%s)" \
  -d '{
    "name": "Test Device",
    "brand": "TestBrand",
    "model": "TD-100",
    "category": "hearing_aid",
    "quantity": 10,
    "unitPrice": 5000.00
  }' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")

SALE_ID=$(curl -s -X POST http://localhost:5003/api/sales \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: sale-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"items\": [{
      \"inventoryItemId\": \"$ITEM_ID\",
      \"quantity\": 1,
      \"unitPrice\": 5000.00
    }]
  }" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['data']['id'] if 'id' in d['data'] else d['data']['sale']['id'])")

echo "Created: Party=$PARTY_ID, Item=$ITEM_ID, Sale=$SALE_ID"

# Test 1: GET /api/sales/{id}
echo -e "\n=== Test 1: GET /api/sales/{id} ==="
curl -s "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -30

# Test 2: PUT /api/sales/{id}
echo -e "\n=== Test 2: PUT /api/sales/{id} ==="
curl -s -X PUT "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: update-$(date +%s)" \
  -d '{
    "notes": "Updated sale notes"
  }' | python3 -m json.tool | head -30

# Test 3: POST /api/sales/{id}/confirm
echo -e "\n=== Test 3: POST /api/sales/{id}/confirm ==="
curl -s -X POST "http://localhost:5003/api/sales/$SALE_ID/confirm" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: confirm-$(date +%s)" \
  -d '{}' | python3 -m json.tool | head -30

# Test 4: POST /api/sales/{id}/cancel
echo -e "\n=== Test 4: POST /api/sales/{id}/cancel ==="
curl -s -X POST "http://localhost:5003/api/sales/$SALE_ID/cancel" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: cancel-$(date +%s)" \
  -d '{
    "reason": "Test cancellation"
  }' | python3 -m json.tool | head -30

# Test 5: GET /api/inventory/{id}
echo -e "\n=== Test 5: GET /api/inventory/{id} ==="
curl -s "http://localhost:5003/api/inventory/$ITEM_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -30

# Test 6: PUT /api/inventory/{id}
echo -e "\n=== Test 6: PUT /api/inventory/{id} ==="
curl -s -X PUT "http://localhost:5003/api/inventory/$ITEM_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: inv-update-$(date +%s)" \
  -d '{
    "unitPrice": 5500.00
  }' | python3 -m json.tool | head -30

# Test 7: DELETE /api/inventory/{id}
echo -e "\n=== Test 7: DELETE /api/inventory/{id} (should fail - used in sale) ==="
curl -s -X DELETE "http://localhost:5003/api/inventory/$ITEM_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Idempotency-Key: inv-delete-$(date +%s)" | python3 -m json.tool

# Test 8: GET /api/inventory/categories
echo -e "\n=== Test 8: GET /api/inventory/categories ==="
curl -s http://localhost:5003/api/inventory/categories \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 9: GET /api/inventory/brands
echo -e "\n=== Test 9: GET /api/inventory/brands ==="
curl -s http://localhost:5003/api/inventory/brands \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

# Test 10: GET /api/inventory/low-stock
echo -e "\n=== Test 10: GET /api/inventory/low-stock ==="
curl -s http://localhost:5003/api/inventory/low-stock \
  -H "Authorization: Bearer $TENANT_TOKEN" | python3 -m json.tool | head -20

echo -e "\n=== Batch 9 Complete ==="
