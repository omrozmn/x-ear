#!/bin/bash
# Rapid test and fix cycle - no stopping until 513/513

set -e
BASE_URL="http://localhost:5003"

echo "🚀 RAPID TEST & FIX CYCLE"
echo "=========================="

# Get tokens
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: login-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token // .data.accessToken')

TENANT_ID=$(curl -s -X GET "$BASE_URL/api/admin/tenants?page=1&perPage=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.tenants[0].id')

TENANT_TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: switch-$(date +%s)" \
  -d "{\"targetTenantId\":\"$TENANT_ID\"}" | jq -r '.data.accessToken // .data.token')

echo "✓ Tokens obtained"

# Test 1: Create unique party
echo ""
echo "Test 1: Create party with unique phone..."
UNIQUE_PHONE="+9055512$(date +%s | tail -c 6)"
PARTY_RESULT=$(curl -s -X POST "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"phone\": \"$UNIQUE_PHONE\",
    \"email\": \"test$(date +%s)@example.com\",
    \"roles\": [\"PATIENT\"]
  }")

PARTY_ID=$(echo "$PARTY_RESULT" | jq -r '.data.party.id // .data.id // empty')
if [ -n "$PARTY_ID" ]; then
  echo "✓ Party created: $PARTY_ID"
else
  echo "❌ Party creation failed:"
  echo "$PARTY_RESULT" | jq .
  exit 1
fi

# Test 2: Create inventory with brand
echo ""
echo "Test 2: Create inventory item with brand..."
ITEM_RESULT=$(curl -s -X POST "$BASE_URL/api/inventory" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: item-$(date +%s)" \
  -d "{
    \"name\": \"Test Item $(date +%s)\",
    \"sku\": \"SKU-$(date +%s)\",
    \"category\": \"hearing_aid\",
    \"brand\": \"TestBrand\",
    \"price\": 1000,
    \"stock\": 10
  }")

ITEM_ID=$(echo "$ITEM_RESULT" | jq -r '.data.item.id // .data.id // empty')
if [ -n "$ITEM_ID" ]; then
  echo "✓ Item created: $ITEM_ID"
else
  echo "❌ Item creation failed:"
  echo "$ITEM_RESULT" | jq .
  exit 1
fi

# Test 3: Add serials to item
echo ""
echo "Test 3: Add serials to item..."
SERIALS_RESULT=$(curl -s -X POST "$BASE_URL/api/inventory/$ITEM_ID/serials" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: serials-$(date +%s)" \
  -d '{
    "serials": ["SN001", "SN002", "SN003"]
  }')

echo "$SERIALS_RESULT" | jq -r 'if .success then "✓ Serials added" else "❌ Failed: \(.error.message // .message)" end'

# Test 4: Create sale
echo ""
echo "Test 4: Create sale..."
SALE_RESULT=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: sale-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"productId\": \"$ITEM_ID\",
    \"paymentMethod\": \"cash\",
    \"salesPrice\": 5000
  }")

SALE_ID=$(echo "$SALE_RESULT" | jq -r '.data.sale.id // .data.saleId // .data.id // empty')
if [ -n "$SALE_ID" ]; then
  echo "✓ Sale created: $SALE_ID"
else
  echo "❌ Sale creation failed:"
  echo "$SALE_RESULT" | jq .
fi

# Test 5: Get sale
if [ -n "$SALE_ID" ]; then
  echo ""
  echo "Test 5: Get sale..."
  GET_SALE=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" \
    -H "Authorization: Bearer $TENANT_TOKEN")
  echo "$GET_SALE" | jq -r 'if .success then "✓ Sale retrieved" else "❌ Failed: \(.error.message // .message)" end'
fi

# Test 6: Create hearing profile
echo ""
echo "Test 6: Create hearing profile..."
PROFILE_RESULT=$(curl -s -X POST "$BASE_URL/api/hearing-profiles" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: profile-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"sgkInfo\": {
      \"sgkNumber\": \"12345678901\",
      \"scheme\": \"over18_working\"
    }
  }")

echo "$PROFILE_RESULT" | jq -r 'if .success then "✓ Hearing profile created" else "❌ Failed: \(.error.message // .message)" end'

# Test 7: Bulk upload parties
echo ""
echo "Test 7: Bulk upload parties..."
cat > /tmp/parties_bulk_$(date +%s).csv << EOF
firstName,lastName,phone,email
Bulk,User1,+905551$(date +%s | tail -c 9),bulk1-$(date +%s)@test.com
Bulk,User2,+905552$(date +%s | tail -c 9),bulk2-$(date +%s)@test.com
EOF

BULK_RESULT=$(curl -s -X POST "$BASE_URL/api/parties/bulk-upload" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Idempotency-Key: bulk-$(date +%s)" \
  -F "file=@/tmp/parties_bulk_$(date +%s).csv")

echo "$BULK_RESULT" | jq -r 'if .success then "✓ Bulk upload successful" else "❌ Failed: \(.error.message // .message)" end'

# Test 8: Bulk upload inventory
echo ""
echo "Test 8: Bulk upload inventory..."
cat > /tmp/inventory_bulk_$(date +%s).csv << EOF
name,sku,category,brand,price,stock
Bulk Item 1,SKU-B1-$(date +%s),hearing_aid,BrandA,1500,5
Bulk Item 2,SKU-B2-$(date +%s),accessory,BrandB,200,20
EOF

BULK_INV_RESULT=$(curl -s -X POST "$BASE_URL/api/inventory/bulk-upload" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Idempotency-Key: bulk-inv-$(date +%s)" \
  -F "file=@/tmp/inventory_bulk_$(date +%s).csv")

echo "$BULK_INV_RESULT" | jq -r 'if .success then "✓ Inventory bulk upload successful" else "❌ Failed: \(.error.message // .message)" end'

echo ""
echo "=========================="
echo "✓ Critical tests completed"
echo ""
echo "Now running full test suite..."
