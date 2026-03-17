#!/bin/bash
set -e

BASE_URL="http://localhost:5003"

echo "=== Getting tokens ==="
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

echo "Tokens ready"

# Test 1: Create unique party
echo -e "\n=== Test 1: Create Party with unique phone ==="
UNIQUE_PHONE="+9055512$(date +%s | tail -c 6)"
PARTY=$(curl -s -X POST "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"phone\": \"$UNIQUE_PHONE\",
    \"email\": \"test$(date +%s)@example.com\",
    \"tcNumber\": \"$(date +%s | tail -c 11)\"
  }")
echo "$PARTY" | jq '.success'
PARTY_ID=$(echo "$PARTY" | jq -r '.data.id')
echo "Party ID: $PARTY_ID"

# Test 2: Create inventory item
echo -e "\n=== Test 2: Create Inventory Item ==="
ITEM=$(curl -s -X POST "$BASE_URL/api/inventory" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: item-$(date +%s)" \
  -d "{
    \"name\": \"Test Item $(date +%s)\",
    \"sku\": \"SKU-$(date +%s)\",
    \"category\": \"HEARING_AID\",
    \"brand\": \"Test Brand\",
    \"quantity\": 10,
    \"unitPrice\": 1000.0,
    \"unit\": \"PIECE\"
  }")
echo "$ITEM" | jq '.success'
ITEM_ID=$(echo "$ITEM" | jq -r '.data.id')
echo "Item ID: $ITEM_ID"

# Test 3: Create sale with productId
echo -e "\n=== Test 3: Create Sale ==="
SALE=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: sale-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"productId\": \"$ITEM_ID\",
    \"saleDate\": \"2026-02-22T00:00:00Z\",
    \"totalAmount\": 5000.0,
    \"paidAmount\": 1000.0,
    \"paymentMethod\": \"CASH\",
    \"status\": \"PENDING\"
  }")
echo "$SALE" | jq '.success'
SALE_ID=$(echo "$SALE" | jq -r '.data.id')
echo "Sale ID: $SALE_ID"

# Test 4: Create invoice with unique number
echo -e "\n=== Test 4: Create Invoice ==="
INV_NUM="INV-$(date +%s)-$RANDOM"
INVOICE=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: inv-$(date +%s)" \
  -d "{
    \"saleId\": \"$SALE_ID\",
    \"invoiceNumber\": \"$INV_NUM\",
    \"invoiceDate\": \"2026-02-22T00:00:00Z\",
    \"dueDate\": \"2026-03-22T00:00:00Z\",
    \"totalAmount\": 5000.0,
    \"status\": \"draft\"
  }")
echo "$INVOICE" | jq '.success'
INVOICE_ID=$(echo "$INVOICE" | jq -r '.data.id')
echo "Invoice ID: $INVOICE_ID"

# Test 5: GET invoice
echo -e "\n=== Test 5: GET Invoice ==="
curl -s -X GET "$BASE_URL/api/invoices/$INVOICE_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.success'

# Test 6: GET sale
echo -e "\n=== Test 6: GET Sale ==="
curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.success'

# Test 7: Admin tenant endpoint
echo -e "\n=== Test 7: Admin GET Tenant ==="
curl -s -X GET "$BASE_URL/api/admin/tenants/$TENANT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Effective-Tenant-Id: system" | jq '.success'

# Test 8: Create user in tenant
echo -e "\n=== Test 8: Create User in Tenant ==="
USER=$(curl -s -X POST "$BASE_URL/api/admin/tenants/$TENANT_ID/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Effective-Tenant-Id: $TENANT_ID" \
  -H "Idempotency-Key: user-$(date +%s)" \
  -d "{
    \"email\": \"user$(date +%s)@test.com\",
    \"password\": \"Test123!\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"role\": \"USER\"
  }")
echo "$USER" | jq '.success'

# Test 9: Bulk upload validation
echo -e "\n=== Test 9: Bulk Upload (should fail with validation) ==="
curl -s -X POST "$BASE_URL/api/parties/bulk-upload" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: bulk-$(date +%s)" \
  -d '{"parties": []}' | jq '.error.code'

# Test 10: Device assignment
echo -e "\n=== Test 10: Device Assignment ==="
DEVICE=$(curl -s -X POST "$BASE_URL/api/devices" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: dev-$(date +%s)" \
  -d "{
    \"serialNumber\": \"SN-$(date +%s)\",
    \"brand\": \"Test Brand\",
    \"model\": \"Test Model\",
    \"deviceType\": \"HEARING_AID\",
    \"status\": \"available\"
  }")
echo "$DEVICE" | jq '.success'
DEVICE_ID=$(echo "$DEVICE" | jq -r '.data.id')

ASSIGNMENT=$(curl -s -X POST "$BASE_URL/api/parties/$PARTY_ID/device-assignments" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: assign-$(date +%s)" \
  -d "{
    \"deviceAssignments\": [{
      \"inventoryId\": \"$ITEM_ID\",
      \"assignmentType\": \"PERMANENT\",
      \"assignedAt\": \"2026-02-22T00:00:00Z\"
    }]
  }")
echo "$ASSIGNMENT" | jq '.success'

echo -e "\n=== All tests complete ==="
