#!/bin/bash

# Test TC Number Saving Fix
# This script tests that TC numbers are properly saved when creating/updating parties

echo "=== Testing TC Number Fix ==="
echo ""

# Get auth token
echo "Getting auth token..."
TOKEN=$(curl -s -X POST http://localhost:5003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@deneme.com",
    "password": "admin123"
  }' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token"
  exit 1
fi

echo "✅ Got auth token"
echo ""

# Generate unique phone number
PHONE="0555$(date +%s | tail -c 8)"
TC_NUMBER="12345678901"

echo "Creating party with TC number: $TC_NUMBER"
echo "Phone: $PHONE"
echo ""

# Create party with TC number
RESPONSE=$(curl -s -X POST http://localhost:5003/api/parties \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"firstName\": \"TC Test\",
    \"lastName\": \"User\",
    \"phone\": \"$PHONE\",
    \"tcNumber\": \"$TC_NUMBER\",
    \"status\": \"active\"
  }")

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool
echo ""

# Extract party ID
PARTY_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('id', ''))" 2>/dev/null)

if [ -z "$PARTY_ID" ]; then
  echo "❌ Failed to create party"
  exit 1
fi

echo "✅ Party created with ID: $PARTY_ID"
echo ""

# Verify TC number in database
echo "Verifying TC number in database..."
DB_TC=$(sqlite3 apps/api/instance/xear_crm.db "SELECT tc_number FROM parties WHERE id='$PARTY_ID';")

echo "Database TC number: '$DB_TC'"
echo ""

if [ "$DB_TC" = "$TC_NUMBER" ]; then
  echo "✅ SUCCESS: TC number correctly saved in database!"
else
  echo "❌ FAILED: TC number not saved correctly"
  echo "   Expected: $TC_NUMBER"
  echo "   Got: $DB_TC"
  exit 1
fi

# Test update
echo ""
echo "Testing TC number update..."
NEW_TC="98765432109"

UPDATE_RESPONSE=$(curl -s -X PUT "http://localhost:5003/api/parties/$PARTY_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"tcNumber\": \"$NEW_TC\"
  }")

echo "Update response:"
echo "$UPDATE_RESPONSE" | python3 -m json.tool
echo ""

# Verify updated TC number
DB_TC_UPDATED=$(sqlite3 apps/api/instance/xear_crm.db "SELECT tc_number FROM parties WHERE id='$PARTY_ID';")

echo "Updated database TC number: '$DB_TC_UPDATED'"
echo ""

if [ "$DB_TC_UPDATED" = "$NEW_TC" ]; then
  echo "✅ SUCCESS: TC number correctly updated in database!"
else
  echo "❌ FAILED: TC number not updated correctly"
  echo "   Expected: $NEW_TC"
  echo "   Got: $DB_TC_UPDATED"
  exit 1
fi

echo ""
echo "=== All tests passed! ==="
