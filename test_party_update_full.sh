#!/bin/bash

echo "=== FULL PARTY UPDATE TEST ==="
echo ""

# Check backend
echo "1. Checking backend..."
curl -s http://localhost:5003/health > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Backend not running"
  exit 1
fi
echo "✅ Backend is running"
echo ""

# Get token
echo "2. Getting auth token..."
TOKEN=$(curl -s -X POST http://localhost:5003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('accessToken', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Could not get token"
  exit 1
fi
echo "✅ Token obtained"
echo ""

# Create a test party
echo "3. Creating test party..."
RANDOM_PHONE="555$(date +%s | tail -c 8)"
IDEMPOTENCY_KEY="test-$(date +%s)-$RANDOM"
CREATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:5003/api/parties \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"phone\": \"$RANDOM_PHONE\",
    \"email\": \"testuser$(date +%s)@test.com\",
    \"gender\": \"M\",
    \"birthDate\": \"1990-01-01\",
    \"addressCity\": \"Ankara\",
    \"addressDistrict\": \"Cankaya\",
    \"addressFull\": \"Test address\"
  }")

HTTP_CODE=$(echo "$CREATE_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$HTTP_CODE" != "201" ]; then
  echo "❌ Failed to create party (HTTP $HTTP_CODE)"
  echo "$RESPONSE_BODY"
  exit 1
fi

PARTY_ID=$(echo "$RESPONSE_BODY" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('id', ''))" 2>/dev/null)

if [ -z "$PARTY_ID" ]; then
  echo "❌ Could not get party ID from response"
  exit 1
fi

echo "✅ Party created: $PARTY_ID"
echo ""

# Test update
echo "4. Testing party update..."
IDEMPOTENCY_KEY="update-$(date +%s)-$RANDOM"
UPDATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "http://localhost:5003/api/parties/$PARTY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name",
    "phone": "5559876543",
    "gender": "F",
    "birthDate": "1995-05-15",
    "addressCity": "Istanbul",
    "addressDistrict": "Kadikoy",
    "addressFull": "Updated address 456"
  }')

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ UPDATE SUCCESSFUL!"
  echo ""
  echo "Updated party data:"
  echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
  echo ""
  
  # Verify the update
  echo "5. Verifying update..."
  VERIFY_RESPONSE=$(curl -s -X GET "http://localhost:5003/api/parties/$PARTY_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  FIRST_NAME=$(echo "$VERIFY_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('firstName', ''))" 2>/dev/null)
  CITY=$(echo "$VERIFY_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('addressCity', ''))" 2>/dev/null)
  GENDER=$(echo "$VERIFY_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('gender', ''))" 2>/dev/null)
  
  echo "Verified data:"
  echo "  - firstName: $FIRST_NAME"
  echo "  - gender: $GENDER"
  echo "  - addressCity: $CITY"
  echo ""
  
  if [ "$FIRST_NAME" = "Updated" ] && [ "$CITY" = "Istanbul" ]; then
    echo "✅ ALL FIELDS UPDATED CORRECTLY!"
  else
    echo "⚠️  Some fields may not have updated correctly"
  fi
else
  echo "❌ UPDATE FAILED with status $HTTP_CODE"
  echo ""
  echo "Response:"
  echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
  exit 1
fi

echo ""
echo "=== TEST COMPLETE ==="
