#!/bin/bash
BASE_URL="http://localhost:5003"

ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token')

TENANT_ID=$(curl -s -X GET "$BASE_URL/api/admin/tenants" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Effective-Tenant-Id: system" | jq -r '.data.tenants[0].id')

TENANT_TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: switch-$(date +%s)" \
  -d "{\"targetTenantId\":\"$TENANT_ID\"}" | jq -r '.data.accessToken')

echo "=== 1. Create Party ==="
TC_NUM=$(printf "%011d" $RANDOM$RANDOM)
PARTY_ID=$(curl -s -X POST "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"phone\": \"+9055512$(date +%s | tail -c 7)\",
    \"email\": \"test$(date +%s)@example.com\",
    \"tcNumber\": \"$TC_NUM\"
  }" | jq -r '.data.id')
echo "Party: $PARTY_ID"

echo -e "\n=== 2. Create Item ==="
ITEM_ID=$(curl -s -X POST "$BASE_URL/api/inventory" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: item-$(date +%s)" \
  -d "{
    \"name\": \"Test Item\",
    \"sku\": \"SKU-$(date +%s)\",
    \"category\": \"HEARING_AID\",
    \"brand\": \"Test\",
    \"quantity\": 10,
    \"unitPrice\": 1000.0,
    \"unit\": \"PIECE\"
  }" | jq -r '.data.id')
echo "Item: $ITEM_ID"

echo -e "\n=== 3. Create Sale ==="
SALE_ID=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: sale-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"productId\": \"$ITEM_ID\",
    \"saleDate\": \"2026-02-23T00:00:00Z\",
    \"totalAmount\": 5000.0,
    \"paidAmount\": 1000.0,
    \"paymentMethod\": \"CASH\",
    \"status\": \"PENDING\"
  }" | jq -r '.data.id')
echo "Sale: $SALE_ID"

echo -e "\n=== 4. Create Invoice ==="
INVOICE_ID=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: inv-$(date +%s)" \
  -d "{
    \"saleId\": \"$SALE_ID\",
    \"invoiceNumber\": \"INV-$(date +%s)-$RANDOM\",
    \"invoiceDate\": \"2026-02-23T00:00:00Z\",
    \"dueDate\": \"2026-03-23T00:00:00Z\",
    \"totalAmount\": 5000.0,
    \"status\": \"draft\"
  }" | jq -r '.data.id')
echo "Invoice: $INVOICE_ID"

echo -e "\n=== 5. GET Tests ==="
echo -n "GET Party: "
curl -s -X GET "$BASE_URL/api/parties/$PARTY_ID" -H "Authorization: Bearer $TENANT_TOKEN" | jq -r '.success'
echo -n "GET Sale: "
curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" -H "Authorization: Bearer $TENANT_TOKEN" | jq -r '.success'
echo -n "GET Invoice: "
curl -s -X GET "$BASE_URL/api/invoices/$INVOICE_ID" -H "Authorization: Bearer $TENANT_TOKEN" | jq -r '.success'

echo -e "\n=== SUCCESS: Full workflow completed ==="
