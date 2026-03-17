#!/bin/bash

echo "=== PARTY UPDATE TEST ==="
echo ""

# First, let's check if backend is running
echo "1. Checking backend..."
HEALTH=$(curl -s http://localhost:5003/health 2>/dev/null || echo "FAILED")
if [[ "$HEALTH" == "FAILED" ]]; then
  echo "❌ Backend not running on port 5003"
  exit 1
fi
echo "✅ Backend is running"
echo ""

# Try to get a token from browser's localStorage or use a test user
echo "2. Attempting to get auth token..."

# Try common test credentials
TOKEN=""
for creds in \
  '{"email":"test@test.com","password":"test123"}' \
  '{"email":"admin@test.com","password":"admin123"}' \
  '{"email":"user@test.com","password":"password"}'; do
  
  RESPONSE=$(curl -s -X POST http://localhost:5003/api/auth/login \
    -H "Content-Type: application/json" \
    -d "$creds")
  
  TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
  
  if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "✅ Token obtained with credentials: $creds"
    break
  fi
done

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Could not get token with test credentials"
  echo "Please login via browser first, then run this test"
  exit 1
fi

echo ""

# Get first party from list
echo "3. Getting party list..."
PARTIES_RESPONSE=$(curl -s -X GET "http://localhost:5003/api/parties?page=1&per_page=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

PARTY_ID=$(echo "$PARTIES_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PARTY_ID" ]; then
  echo "❌ No parties found"
  exit 1
fi

echo "✅ Found party: $PARTY_ID"
echo ""

# Get party details
echo "4. Getting party details..."
PARTY_DETAILS=$(curl -s -X GET "http://localhost:5003/api/parties/$PARTY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Party details:"
echo "$PARTY_DETAILS" | python3 -m json.tool 2>/dev/null || echo "$PARTY_DETAILS"
echo ""

# Test update with correct format
echo "5. Testing party update..."
UPDATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "http://localhost:5003/api/parties/$PARTY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name",
    "phone": "5551234567",
    "gender": "M",
    "birthDate": "1990-01-01",
    "addressCity": "Istanbul",
    "addressDistrict": "Kadikoy",
    "addressFull": "Test address 123"
  }')

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ UPDATE SUCCESSFUL!"
else
  echo "❌ UPDATE FAILED with status $HTTP_CODE"
  exit 1
fi

echo ""
echo "=== TEST COMPLETE ==="
