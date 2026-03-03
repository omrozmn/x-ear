#!/bin/bash

# Test party update from list page vs details page

echo "=== PARTY UPDATE TEST ==="
echo ""

# Get token first
echo "1. Getting auth token..."
TOKEN=$(curl -s -X POST http://localhost:5003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@xear.com",
    "password": "admin123"
  }' | jq -r '.data.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo "✅ Token obtained"
echo ""

# Get party details first
echo "2. Getting party details..."
PARTY_RESPONSE=$(curl -s -X GET http://localhost:5003/api/parties/pat_5d88ce9f \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Party response:"
echo "$PARTY_RESPONSE" | jq '.'
echo ""

TENANT_ID=$(echo "$PARTY_RESPONSE" | jq -r '.data.tenantId')
echo "Party tenant_id: $TENANT_ID"
echo ""

# Test 1: Update with WORKING format (from DesktopPartyDetailsPage)
echo "3. Testing UPDATE with DesktopPartyDetailsPage format..."
UPDATE_RESPONSE_1=$(curl -s -X PUT http://localhost:5003/api/parties/pat_5d88ce9f \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "phone": "5551234567",
    "gender": "M",
    "birthDate": "1990-01-01",
    "addressCity": "Istanbul",
    "addressDistrict": "Kadikoy",
    "addressFull": "Test address"
  }')

echo "Response 1 (Details Page Format):"
echo "$UPDATE_RESPONSE_1" | jq '.'
echo ""

# Test 2: Update with OLD format (what was being sent before)
echo "4. Testing UPDATE with OLD format (city/district)..."
UPDATE_RESPONSE_2=$(curl -s -X PUT http://localhost:5003/api/parties/pat_5d88ce9f \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "phone": "5551234567",
    "gender": "M",
    "birthDate": "1990-01-01",
    "city": "Istanbul",
    "district": "Kadikoy",
    "addressFull": "Test address"
  }')

echo "Response 2 (OLD Format with city/district):"
echo "$UPDATE_RESPONSE_2" | jq '.'
echo ""

# Test 3: Check what Orval-generated hook sends
echo "5. Testing what Orval sends (data wrapper)..."
UPDATE_RESPONSE_3=$(curl -s -X PUT http://localhost:5003/api/parties/pat_5d88ce9f \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "firstName": "Test",
      "lastName": "User",
      "phone": "5551234567",
      "gender": "M",
      "birthDate": "1990-01-01",
      "addressCity": "Istanbul",
      "addressDistrict": "Kadikoy",
      "addressFull": "Test address"
    }
  }')

echo "Response 3 (With data wrapper):"
echo "$UPDATE_RESPONSE_3" | jq '.'
echo ""

echo "=== TEST COMPLETE ==="
