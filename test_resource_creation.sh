#!/bin/bash

# Test resource creation manually
BASE_URL="http://localhost:5003"

echo "=== Testing Resource Creation ==="
echo ""

# 1. Admin Login
echo "1. Admin Login..."
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)-$$" \
  -d '{
    "email": "admin@xear.com",
    "password": "admin123"
  }')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.data.token // .data.accessToken // .token // empty')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Admin login failed!"
  echo "Response: $ADMIN_RESPONSE"
  exit 1
fi

echo "✅ Admin token: ${ADMIN_TOKEN:0:20}..."
echo ""

# 2. Get Tenant
echo "2. Getting tenant..."
TENANT_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/tenants" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TENANT_ID=$(echo $TENANT_RESPONSE | jq -r '.data.tenants[0].id // empty')

if [ -z "$TENANT_ID" ]; then
  echo "❌ No tenant found!"
  echo "Response: $TENANT_RESPONSE"
  exit 1
fi

echo "✅ Tenant ID: $TENANT_ID"
echo ""

# 3. Switch to Tenant Context
echo "3. Switching to tenant context..."
TENANT_SWITCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)-$$" \
  -d "{
    \"targetTenantId\": \"$TENANT_ID\"
  }")

TENANT_TOKEN=$(echo $TENANT_SWITCH_RESPONSE | jq -r '.data.accessToken // .accessToken // empty')

if [ -z "$TENANT_TOKEN" ]; then
  echo "❌ Tenant switch failed!"
  echo "Response: $TENANT_SWITCH_RESPONSE"
  exit 1
fi

echo "✅ Tenant token: ${TENANT_TOKEN:0:20}..."
echo ""

# 4. Create Party
echo "4. Creating party..."
PARTY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)-$$" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "phone": "+905551234567",
    "email": "test@example.com",
    "type": "INDIVIDUAL"
  }')

PARTY_ID=$(echo $PARTY_RESPONSE | jq -r '.data.id // empty')

if [ -z "$PARTY_ID" ]; then
  echo "❌ Party creation failed!"
  echo "Response: $PARTY_RESPONSE"
else
  echo "✅ Party ID: $PARTY_ID"
fi
echo ""

# 5. Create Device
echo "5. Creating device..."
DEVICE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/devices" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)-$$" \
  -d '{
    "brand": "Test Brand",
    "model": "Test Model",
    "type": "HEARING_AID",
    "serialNumber": "TEST123456",
    "status": "AVAILABLE"
  }')

DEVICE_ID=$(echo $DEVICE_RESPONSE | jq -r '.data.id // empty')

if [ -z "$DEVICE_ID" ]; then
  echo "❌ Device creation failed!"
  echo "Response: $DEVICE_RESPONSE"
else
  echo "✅ Device ID: $DEVICE_ID"
fi
echo ""

# 6. Create Sale
if [ ! -z "$PARTY_ID" ] && [ ! -z "$DEVICE_ID" ]; then
  echo "6. Creating sale..."
  SALE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sales" \
    -H "Authorization: Bearer $TENANT_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: test-$(date +%s)-$$" \
    -d "{
      \"partyId\": \"$PARTY_ID\",
      \"saleDate\": \"2026-02-21T00:00:00Z\",
      \"totalAmount\": 5000.0,
      \"paidAmount\": 1000.0,
      \"paymentMethod\": \"CASH\",
      \"status\": \"PENDING\",
      \"items\": [{
        \"deviceId\": \"$DEVICE_ID\",
        \"quantity\": 1,
        \"unitPrice\": 5000.0,
        \"totalPrice\": 5000.0
      }]
    }")

  SALE_ID=$(echo $SALE_RESPONSE | jq -r '.data.id // empty')

  if [ -z "$SALE_ID" ]; then
    echo "❌ Sale creation failed!"
    echo "Response: $SALE_RESPONSE"
  else
    echo "✅ Sale ID: $SALE_ID"
  fi
else
  echo "⊘ Skipping sale creation (missing party or device)"
fi
echo ""

# 7. Create Appointment
if [ ! -z "$PARTY_ID" ]; then
  echo "7. Creating appointment..."
  APPOINTMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/appointments" \
    -H "Authorization: Bearer $TENANT_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: test-$(date +%s)-$$" \
    -d "{
      \"partyId\": \"$PARTY_ID\",
      \"date\": \"2026-03-01T10:00:00Z\",
      \"time\": \"10:00\",
      \"duration\": 60,
      \"appointmentType\": \"consultation\",
      \"status\": \"scheduled\",
      \"notes\": \"Test appointment\"
    }")

  APPOINTMENT_ID=$(echo $APPOINTMENT_RESPONSE | jq -r '.data.id // empty')

  if [ -z "$APPOINTMENT_ID" ]; then
    echo "❌ Appointment creation failed!"
    echo "Response: $APPOINTMENT_RESPONSE"
  else
    echo "✅ Appointment ID: $APPOINTMENT_ID"
  fi
else
  echo "⊘ Skipping appointment creation (missing party)"
fi
echo ""

echo "=== Summary ==="
echo "Admin Token: ${ADMIN_TOKEN:+✅}${ADMIN_TOKEN:-❌}"
echo "Tenant ID: ${TENANT_ID:+✅}${TENANT_ID:-❌}"
echo "Tenant Token: ${TENANT_TOKEN:+✅}${TENANT_TOKEN:-❌}"
echo "Party ID: ${PARTY_ID:+✅}${PARTY_ID:-❌}"
echo "Device ID: ${DEVICE_ID:+✅}${DEVICE_ID:-❌}"
echo "Sale ID: ${SALE_ID:+✅}${SALE_ID:-❌}"
echo "Appointment ID: ${APPOINTMENT_ID:+✅}${APPOINTMENT_ID:-❌}"
