#!/bin/bash

echo "=== CHECKING PARTY TENANT ==="
echo ""

# Get token
TOKEN=$(curl -s -X POST http://localhost:5003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('accessToken', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Could not get token"
  exit 1
fi

echo "Token obtained"
echo ""

# Try to get party with current tenant
echo "Trying to get party pat_5d88ce9f..."
RESPONSE=$(curl -s -X GET "http://localhost:5003/api/parties/pat_5d88ce9f" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract tenant_id if successful
TENANT_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('tenantId', 'NOT_FOUND'))" 2>/dev/null)

echo "Party tenant_id: $TENANT_ID"
