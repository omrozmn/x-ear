#!/bin/bash
# Test Critical Endpoints with CORRECT Schemas

BASE_URL="http://localhost:5003"
PASSED=0
FAILED=0

echo "=== Testing Critical Endpoints (Corrected Schemas) ==="

# Setup
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

echo "Setup complete. Tenant: $TENANT_ID"
echo ""

# Test 1: Create Party
echo "Test 1: POST /api/parties"
PARTY_RES=$(curl -s -X POST "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d '{"firstName":"Test","lastName":"User","phone":"+9055512345'$(date +%s | tail -c 5)'","email":"test'$(date +%s)'@test.com","tcNumber":"'$(( 10000000000 + RANDOM ))'","status":"active"}')

PARTY_ID=$(echo "$PARTY_RES" | jq -r '.data.id')
SUCCESS=$(echo "$PARTY_RES" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✓ PASS - Party created: $PARTY_ID"
  PASSED=$((PASSED + 1))
else
  echo "✗ FAIL - $(echo "$PARTY_RES" | jq -r '.error.message')"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Create Inventory Item
echo "Test 2: POST /api/inventory"
ITEM_RES=$(curl -s -X POST "$BASE_URL/api/inventory" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: item-$(date +%s)" \
  -d '{"name":"Test Hearing Aid","sku":"SKU-'$(date +%s)'","price":5000.0,"category":"hearing_aid","brand":"TestBrand","stockQuantity":10}')

ITEM_ID=$(echo "$ITEM_RES" | jq -r '.data.id')
SUCCESS=$(echo "$ITEM_RES" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✓ PASS - Item created: $ITEM_ID"
  PASSED=$((PASSED + 1))
else
  echo "✗ FAIL - $(echo "$ITEM_RES" | jq -r '.error.message')"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: Create Sale (CORRECTED - with productId)
echo "Test 3: POST /api/sales (CORRECTED)"
SALE_RES=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: sale-$(date +%s)" \
  -d '{"partyId":"'"$PARTY_ID"'","productId":"'"$ITEM_ID"'","salesPrice":5000.0,"quantity":1,"paymentMethod":"cash","saleDate":"2026-02-22T10:00:00"}')

SALE_ID=$(echo "$SALE_RES" | jq -r '.data.sale.id // .data.id')
SUCCESS=$(echo "$SALE_RES" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✓ PASS - Sale created: $SALE_ID"
  PASSED=$((PASSED + 1))
else
  echo "✗ FAIL - $(echo "$SALE_RES" | jq -r '.error.message')"
  echo "Response: $(echo "$SALE_RES" | jq .)"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 4: Create Payment Plan
echo "Test 4: POST /api/sales/$SALE_ID/payment-plan"
if [ "$SALE_ID" != "null" ] && [ ! -z "$SALE_ID" ]; then
  PLAN_RES=$(curl -s -X POST "$BASE_URL/api/sales/$SALE_ID/payment-plan" \
    -H "Authorization: Bearer $TENANT_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: plan-$(date +%s)" \
    -d '{"installmentCount":12,"firstPaymentDate":"2026-03-01"}')

  SUCCESS=$(echo "$PLAN_RES" | jq -r '.success')
  if [ "$SUCCESS" = "true" ]; then
    echo "✓ PASS - Payment plan created"
    PASSED=$((PASSED + 1))
  else
    echo "✗ FAIL - $(echo "$PLAN_RES" | jq -r '.error.message')"
    echo "Response: $(echo "$PLAN_RES" | jq .)"
    FAILED=$((FAILED + 1))
  fi
else
  echo "⊘ SKIP - No sale ID"
fi
echo ""

# Test 5: Device Assignment (CORRECTED - with deviceAssignments array)
echo "Test 5: POST /api/parties/$PARTY_ID/device-assignments (CORRECTED)"
DEVICE_RES=$(curl -s -X POST "$BASE_URL/api/parties/$PARTY_ID/device-assignments" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: device-$(date +%s)" \
  -d '{"deviceAssignments":[{"itemId":"'"$ITEM_ID"'","serialNumber":"SN-'$(date +%s)'","assignmentType":"sale","ear":"both","assignmentDate":"2026-02-22"}]}')

SUCCESS=$(echo "$DEVICE_RES" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✓ PASS - Device assigned"
  PASSED=$((PASSED + 1))
else
  echo "✗ FAIL - $(echo "$DEVICE_RES" | jq -r '.error.message')"
  echo "Response: $(echo "$DEVICE_RES" | jq .)"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 6: Create Invoice (CORRECTED - invoiceType='sale', with total)
echo "Test 6: POST /api/invoices (CORRECTED)"
INVOICE_RES=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: invoice-$(date +%s)" \
  -d '{"partyId":"'"$PARTY_ID"'","saleId":"'"$SALE_ID"'","invoiceType":"sale","items":[{"description":"Test Item","quantity":1,"unitPrice":5000.0,"vatRate":20.0,"total":6000.0}]}')

SUCCESS=$(echo "$INVOICE_RES" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✓ PASS - Invoice created"
  PASSED=$((PASSED + 1))
else
  echo "✗ FAIL - $(echo "$INVOICE_RES" | jq -r '.error.message')"
  echo "Response: $(echo "$INVOICE_RES" | jq .)"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 7: Hearing Profile
echo "Test 7: POST /api/hearing-profiles"
PROFILE_RES=$(curl -s -X POST "$BASE_URL/api/hearing-profiles" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: profile-$(date +%s)" \
  -d '{"partyId":"'"$PARTY_ID"'","sgkInfo":{"sgkNumber":"12345678901","scheme":"over18_working","eligibilityDate":"2026-01-01"}}')

SUCCESS=$(echo "$PROFILE_RES" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✓ PASS - Hearing profile created"
  PASSED=$((PASSED + 1))
else
  echo "✗ FAIL - $(echo "$PROFILE_RES" | jq -r '.error.message')"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 8: Appointment (CORRECTED - with date and time fields)
echo "Test 8: POST /api/appointments (CORRECTED)"
APPT_RES=$(curl -s -X POST "$BASE_URL/api/appointments" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: appt-$(date +%s)" \
  -d '{"partyId":"'"$PARTY_ID"'","appointmentType":"consultation","date":"2026-03-01","time":"10:00:00","duration":60,"status":"scheduled"}')

SUCCESS=$(echo "$APPT_RES" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✓ PASS - Appointment created"
  PASSED=$((PASSED + 1))
else
  echo "✗ FAIL - $(echo "$APPT_RES" | jq -r '.error.message')"
  echo "Response: $(echo "$APPT_RES" | jq .)"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 9: Campaign
echo "Test 9: POST /api/campaigns"
CAMPAIGN_RES=$(curl -s -X POST "$BASE_URL/api/campaigns" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: campaign-$(date +%s)" \
  -d '{"name":"Test Campaign","slug":"test-campaign-'$(date +%s)'","description":"Test","startDate":"2026-01-01","endDate":"2026-12-31","isActive":true}')

SUCCESS=$(echo "$CAMPAIGN_RES" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✓ PASS - Campaign created"
  PASSED=$((PASSED + 1))
else
  echo "✗ FAIL - $(echo "$CAMPAIGN_RES" | jq -r '.error.message')"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 10: Pricing Preview (CORRECTED - with deviceAssignments)
echo "Test 10: POST /api/pricing-preview (CORRECTED)"
PRICING_RES=$(curl -s -X POST "$BASE_URL/api/pricing-preview" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: pricing-$(date +%s)" \
  -d '{"deviceAssignments":[{"itemId":"'"$ITEM_ID"'","quantity":1}],"partyId":"'"$PARTY_ID"'"}')

SUCCESS=$(echo "$PRICING_RES" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✓ PASS - Pricing preview calculated"
  PASSED=$((PASSED + 1))
else
  echo "✗ FAIL - $(echo "$PRICING_RES" | jq -r '.error.message')"
  echo "Response: $(echo "$PRICING_RES" | jq .)"
  FAILED=$((FAILED + 1))
fi
echo ""

echo "=== Results ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Total: $((PASSED + FAILED))"
if [ $((PASSED + FAILED)) -gt 0 ]; then
  echo "Success Rate: $(( PASSED * 100 / (PASSED + FAILED) ))%"
fi
