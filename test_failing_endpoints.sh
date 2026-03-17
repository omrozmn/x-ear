#!/bin/bash

BASE_URL="http://localhost:5003"

# Get admin token
echo "=== Getting admin token ==="
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token')

echo "Admin token: ${ADMIN_TOKEN:0:50}..."

# Get tenant list
echo -e "\n=== Getting tenants ==="
TENANTS=$(curl -s -X GET "$BASE_URL/api/admin/tenants" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Effective-Tenant-Id: system")

echo "$TENANTS" | jq '.data.tenants[0].id'
TENANT_ID=$(echo "$TENANTS" | jq -r '.data.tenants[0].id')

echo "Tenant ID: $TENANT_ID"

# Switch to tenant
echo -e "\n=== Switching to tenant ==="
TENANT_TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: switch-$(date +%s)" \
  -d "{\"targetTenantId\":\"$TENANT_ID\"}" | jq -r '.data.accessToken')

echo "Tenant token: ${TENANT_TOKEN:0:50}..."

# Test 1: Create party
echo -e "\n=== Test 1: Create Party ==="
PARTY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "phone": "+905551234567",
    "email": "test@example.com",
    "tcNumber": "12345678901"
  }')

echo "$PARTY_RESPONSE" | jq
PARTY_ID=$(echo "$PARTY_RESPONSE" | jq -r '.data.id')
echo "Party ID: $PARTY_ID"

# Test 2: Create sale
echo -e "\n=== Test 2: Create Sale ==="
SALE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: sale-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"saleDate\": \"2026-02-22T00:00:00Z\",
    \"totalAmount\": 5000.0,
    \"paidAmount\": 1000.0,
    \"paymentMethod\": \"CASH\",
    \"status\": \"PENDING\"
  }")

echo "$SALE_RESPONSE" | jq
SALE_ID=$(echo "$SALE_RESPONSE" | jq -r '.data.id')
echo "Sale ID: $SALE_ID"

# Test 3: Create invoice (test duplicate issue)
echo -e "\n=== Test 3: Create Invoice (First) ==="
INV_NUM="INV-$(date +%s)-$RANDOM"
INVOICE1=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: inv1-$(date +%s)" \
  -d "{
    \"saleId\": \"$SALE_ID\",
    \"invoiceNumber\": \"$INV_NUM\",
    \"invoiceDate\": \"2026-02-22T00:00:00Z\",
    \"dueDate\": \"2026-03-22T00:00:00Z\",
    \"totalAmount\": 5000.0,
    \"status\": \"draft\"
  }")

echo "$INVOICE1" | jq
INVOICE_ID=$(echo "$INVOICE1" | jq -r '.data.id')
echo "Invoice ID: $INVOICE_ID"

# Test 4: Try duplicate invoice number
echo -e "\n=== Test 4: Create Invoice (Duplicate - should fail) ==="
INVOICE2=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: inv2-$(date +%s)" \
  -d "{
    \"saleId\": \"$SALE_ID\",
    \"invoiceNumber\": \"$INV_NUM\",
    \"invoiceDate\": \"2026-02-22T00:00:00Z\",
    \"dueDate\": \"2026-03-22T00:00:00Z\",
    \"totalAmount\": 5000.0,
    \"status\": \"draft\"
  }")

echo "$INVOICE2" | jq '.error.code'

# Test 5: Create appointment
echo -e "\n=== Test 5: Create Appointment ==="
APT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/appointments" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: apt-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"date\": \"2026-03-15T10:00:00Z\",
    \"time\": \"10:00\",
    \"duration\": 60,
    \"appointmentType\": \"consultation\",
    \"status\": \"scheduled\"
  }")

echo "$APT_RESPONSE" | jq
APT_ID=$(echo "$APT_RESPONSE" | jq -r '.data.id')
echo "Appointment ID: $APT_ID"

# Test 6: Get appointment (verify it exists)
echo -e "\n=== Test 6: Get Appointment ==="
curl -s -X GET "$BASE_URL/api/appointments/$APT_ID" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.success'

# Test 7: Test tenant endpoints with admin token
echo -e "\n=== Test 7: Admin Tenant Endpoints ==="
curl -s -X GET "$BASE_URL/api/admin/tenants/$TENANT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Effective-Tenant-Id: system" | jq '.success'

echo -e "\n=== All tests complete ==="
