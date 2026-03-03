#!/bin/bash

# Test party update with birthDate and address
# Usage: bash test_party_update.sh

set -e

API_URL="http://localhost:5003"
PARTY_ID="pat_5d88ce9f"

echo "=== Testing Party Update ==="
echo ""

# Get auth token
echo "1. Getting auth token..."
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5551234567",
    "password": "test123"
  }' | jq -r '.data.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to get auth token"
  exit 1
fi
echo "✅ Got token: ${TOKEN:0:20}..."
echo ""

# Get current party data
echo "2. Getting current party data..."
CURRENT_DATA=$(curl -s -X GET "$API_URL/parties/$PARTY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Current party data:"
echo "$CURRENT_DATA" | jq '{
  id: .data.id,
  firstName: .data.firstName,
  lastName: .data.lastName,
  birthDate: .data.birthDate,
  address: .data.address,
  addressFull: .data.addressFull,
  city: .data.city,
  district: .data.district,
  addressCity: .data.addressCity,
  addressDistrict: .data.addressDistrict
}'
echo ""

# Update party with new birthDate and address
NEW_BIRTH_DATE="1990-05-15"
NEW_ADDRESS="Yeni Test Mahallesi, Sokak No: 123"
NEW_CITY="İstanbul"
NEW_DISTRICT="Kadıköy"

echo "3. Updating party..."
echo "   - New birthDate: $NEW_BIRTH_DATE"
echo "   - New address: $NEW_ADDRESS"
echo "   - New city: $NEW_CITY"
echo "   - New district: $NEW_DISTRICT"
echo ""

UPDATE_RESPONSE=$(curl -s -X PATCH "$API_URL/parties/$PARTY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"birthDate\": \"$NEW_BIRTH_DATE\",
    \"addressFull\": \"$NEW_ADDRESS\",
    \"city\": \"$NEW_CITY\",
    \"district\": \"$NEW_DISTRICT\",
    \"addressCity\": \"$NEW_CITY\",
    \"addressDistrict\": \"$NEW_DISTRICT\"
  }")

echo "Update response:"
echo "$UPDATE_RESPONSE" | jq '.'
echo ""

# Verify the update
echo "4. Verifying update..."
UPDATED_DATA=$(curl -s -X GET "$API_URL/parties/$PARTY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Updated party data:"
echo "$UPDATED_DATA" | jq '{
  id: .data.id,
  firstName: .data.firstName,
  lastName: .data.lastName,
  birthDate: .data.birthDate,
  address: .data.address,
  addressFull: .data.addressFull,
  city: .data.city,
  district: .data.district,
  addressCity: .data.addressCity,
  addressDistrict: .data.addressDistrict
}'
echo ""

# Check if update was successful
UPDATED_BIRTH_DATE=$(echo "$UPDATED_DATA" | jq -r '.data.birthDate')
UPDATED_ADDRESS=$(echo "$UPDATED_DATA" | jq -r '.data.addressFull // .data.address')

echo "=== Verification ==="
if [ "$UPDATED_BIRTH_DATE" = "$NEW_BIRTH_DATE" ]; then
  echo "✅ birthDate updated successfully: $UPDATED_BIRTH_DATE"
else
  echo "❌ birthDate NOT updated. Expected: $NEW_BIRTH_DATE, Got: $UPDATED_BIRTH_DATE"
fi

if [ "$UPDATED_ADDRESS" = "$NEW_ADDRESS" ]; then
  echo "✅ address updated successfully: $UPDATED_ADDRESS"
else
  echo "❌ address NOT updated. Expected: $NEW_ADDRESS, Got: $UPDATED_ADDRESS"
fi

echo ""
echo "=== Test Complete ==="
