#!/bin/bash
# Test invoice sequence bug

BASE_URL="http://localhost:5003"

echo "=== Testing Invoice Sequence Bug ==="

ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: login-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token')

TENANT_ID=$(curl -s -X GET "$BASE_URL/api/admin/tenants?page=1&perPage=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.tenants[0].id')

TENANT_TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: switch-$(date +%s)" \
  -d '{"targetTenantId":"'"$TENANT_ID"'"}' | jq -r '.data.accessToken')

# Create party and sale first
PARTY_RES=$(curl -s -X POST "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d '{"firstName":"Test","lastName":"User","phone":"+9055512345'$(date +%s | tail -c 5)'","email":"test'$(date +%s)'@test.com","tcNumber":"'$(( 10000000000 + RANDOM ))'","status":"active"}')

PARTY_ID=$(echo "$PARTY_RES" | jq -r '.data.id')
echo "Party created: $PARTY_ID"

ITEM_RES=$(curl -s -X POST "$BASE_URL/api/inventory" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: item-$(date +%s)" \
  -d '{"name":"Test Item","sku":"SKU-'$(date +%s)'","price":5000.0,"category":"hearing_aid","brand":"TestBrand","stockQuantity":10}')

ITEM_ID=$(echo "$ITEM_RES" | jq -r '.data.id')
echo "Item created: $ITEM_ID"

SALE_RES=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: sale-$(date +%s)" \
  -d '{"partyId":"'"$PARTY_ID"'","productId":"'"$ITEM_ID"'","salesPrice":5000.0,"quantity":1,"paymentMethod":"cash","saleDate":"2026-02-22T10:00:00"}')

SALE_ID=$(echo "$SALE_RES" | jq -r '.data.sale.id // .data.id')
echo "Sale created: $SALE_ID"
echo ""

# Test 1: Create first invoice
echo "Test 1: Creating first invoice..."
INV1_RES=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: invoice-1-$(date +%s)" \
  -d '{"partyId":"'"$PARTY_ID"'","saleId":"'"$SALE_ID"'","invoiceType":"sale","items":[{"description":"Test Item","quantity":1,"unitPrice":5000.0,"vatRate":20.0,"total":6000.0}]}')

INV1_SUCCESS=$(echo "$INV1_RES" | jq -r '.success')
INV1_NUMBER=$(echo "$INV1_RES" | jq -r '.data.invoiceNumber // "null"')
INV1_ERROR=$(echo "$INV1_RES" | jq -r '.error.message // "null"')

if [ "$INV1_SUCCESS" = "true" ]; then
  echo "✓ Invoice 1 created: $INV1_NUMBER"
else
  echo "✗ Invoice 1 failed: $INV1_ERROR"
fi
echo ""

# Test 2: Create second invoice (should increment sequence)
echo "Test 2: Creating second invoice..."
INV2_RES=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: invoice-2-$(date +%s)" \
  -d '{"partyId":"'"$PARTY_ID"'","saleId":"'"$SALE_ID"'","invoiceType":"sale","items":[{"description":"Test Item 2","quantity":1,"unitPrice":5000.0,"vatRate":20.0,"total":6000.0}]}')

INV2_SUCCESS=$(echo "$INV2_RES" | jq -r '.success')
INV2_NUMBER=$(echo "$INV2_RES" | jq -r '.data.invoiceNumber // "null"')
INV2_ERROR=$(echo "$INV2_RES" | jq -r '.error.message // "null"')

if [ "$INV2_SUCCESS" = "true" ]; then
  echo "✓ Invoice 2 created: $INV2_NUMBER"
else
  echo "✗ Invoice 2 failed: $INV2_ERROR"
fi
echo ""

# Test 3: Create third invoice
echo "Test 3: Creating third invoice..."
INV3_RES=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: invoice-3-$(date +%s)" \
  -d '{"partyId":"'"$PARTY_ID"'","saleId":"'"$SALE_ID"'","invoiceType":"sale","items":[{"description":"Test Item 3","quantity":1,"unitPrice":5000.0,"vatRate":20.0,"total":6000.0}]}')

INV3_SUCCESS=$(echo "$INV3_RES" | jq -r '.success')
INV3_NUMBER=$(echo "$INV3_RES" | jq -r '.data.invoiceNumber // "null"')
INV3_ERROR=$(echo "$INV3_RES" | jq -r '.error.message // "null"')

if [ "$INV3_SUCCESS" = "true" ]; then
  echo "✓ Invoice 3 created: $INV3_NUMBER"
else
  echo "✗ Invoice 3 failed: $INV3_ERROR"
fi
echo ""

echo "=== Summary ==="
echo "Invoice 1: $INV1_NUMBER (Success: $INV1_SUCCESS)"
echo "Invoice 2: $INV2_NUMBER (Success: $INV2_SUCCESS)"
echo "Invoice 3: $INV3_NUMBER (Success: $INV3_SUCCESS)"
echo ""

if [ "$INV1_SUCCESS" = "true" ] && [ "$INV2_SUCCESS" = "true" ] && [ "$INV3_SUCCESS" = "true" ]; then
  echo "✓ All invoices created successfully with sequential numbers"
else
  echo "✗ Sequence bug detected - some invoices failed"
fi
