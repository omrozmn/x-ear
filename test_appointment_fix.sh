#!/bin/bash
# Test appointment with correct time format

BASE_URL="http://localhost:5003"

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

# Create party
PARTY_RES=$(curl -s -X POST "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d '{"firstName":"Test","lastName":"User","phone":"+9055512345'$(date +%s | tail -c 5)'","email":"test'$(date +%s)'@test.com","tcNumber":"'$(( 10000000000 + RANDOM ))'","status":"active"}')

PARTY_ID=$(echo "$PARTY_RES" | jq -r '.data.id')
echo "Party created: $PARTY_ID"

# Test appointment with correct time format (HH:MM not HH:MM:SS)
echo ""
echo "Testing appointment with time='10:00' (correct format):"
curl -s -X POST "$BASE_URL/api/appointments" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: appt-$(date +%s)" \
  -d '{"partyId":"'"$PARTY_ID"'","appointmentType":"consultation","date":"2026-03-01","time":"10:00","duration":60,"status":"scheduled"}' | jq .
