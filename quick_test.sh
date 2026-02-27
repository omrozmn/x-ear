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

# Generate unique values
TC=$(python3 -c "import random; print(random.randint(10000000000, 99999999999))")
PHONE=$(python3 -c "import time; print(f'+9055{int(time.time()) % 100000000}')")
EMAIL="test$(date +%s)@example.com"

echo "Creating party with TC: $TC, Phone: $PHONE"

# Create party
PARTY=$(curl -s -X POST http://localhost:5003/api/parties \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"Patient\",
    \"phone\": \"$PHONE\",
    \"email\": \"$EMAIL\",
    \"tcNumber\": \"$TC\"
  }")

echo "$PARTY" | python3 -m json.tool | head -25

PARTY_ID=$(echo "$PARTY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('id', '') if data.get('success') else '')" 2>/dev/null || echo "")

if [ -z "$PARTY_ID" ]; then
  echo "Party creation failed!"
  exit 1
fi

echo -e "\n✓ Party created: $PARTY_ID"

# Test hearing profile
echo -e "\n=== Testing hearing profile creation ==="
curl -s -X POST http://localhost:5003/api/hearing-profiles \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"sgkNumber\": \"12345678901\",
    \"scheme\": \"over18_working\"
  }" | python3 -m json.tool

echo -e "\n✓ Tests completed"
