#!/bin/bash

# Test Party Update API with Python-generated token
# Bu script party güncelleme endpoint'ini test eder

BASE_URL="http://localhost:5003"

echo "=== Party Update Test ==="
echo ""

# 1. Get token from Python script
echo "1. Getting auth token from database..."
TOKEN=$(python3 get_token.py 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" == "ERROR:"* ]; then
  echo "❌ Failed to get token"
  echo "Error: $TOKEN"
  exit 1
fi

echo "✅ Token obtained"
echo "Token (first 50 chars): ${TOKEN:0:50}..."
echo ""

# 2. Get first party
echo "2. Getting first party..."
PARTIES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/parties?page=1&perPage=1" \
  -H "Authorization: Bearer $TOKEN")

echo "Parties response:"
echo $PARTIES_RESPONSE | jq '.' 2>/dev/null || echo $PARTIES_RESPONSE
echo ""

PARTY_ID=$(echo $PARTIES_RESPONSE | jq -r '.data.parties[0].id // .parties[0].id // empty' 2>/dev/null)

if [ -z "$PARTY_ID" ] || [ "$PARTY_ID" == "null" ]; then
  echo "❌ No parties found"
  exit 1
fi

echo "✅ Party ID: $PARTY_ID"
echo ""

# 3. Get party details BEFORE update
echo "3. Getting party details BEFORE update..."
PARTY_BEFORE=$(curl -s -X GET "$BASE_URL/api/parties/$PARTY_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Current party data:"
echo $PARTY_BEFORE | jq '{
  id: .data.id // .id,
  firstName: .data.firstName // .firstName,
  lastName: .data.lastName // .lastName,
  status: .data.status // .status,
  segment: .data.segment // .segment,
  acquisitionType: .data.acquisitionType // .acquisitionType,
  branchId: .data.branchId // .branchId
}' 2>/dev/null || echo $PARTY_BEFORE
echo ""

# 4. Update party tags
echo "4. Updating party tags..."
echo "   Sending: status=active, segment=customer, acquisitionType=referral"
UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/parties/$PARTY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active",
    "segment": "customer",
    "acquisitionType": "referral"
  }')

echo "Update response:"
echo $UPDATE_RESPONSE | jq '.' 2>/dev/null || echo $UPDATE_RESPONSE
echo ""

# Check if update was successful
SUCCESS=$(echo $UPDATE_RESPONSE | jq -r '.success // false' 2>/dev/null)

if [ "$SUCCESS" == "true" ]; then
  echo "✅ Update API call successful"
else
  echo "❌ Update failed"
  ERROR=$(echo $UPDATE_RESPONSE | jq -r '.error // .message // "Unknown error"' 2>/dev/null)
  echo "Error: $ERROR"
  exit 1
fi

# 5. Verify update by fetching again
echo ""
echo "5. Verifying update (fetching party again)..."
sleep 1  # Small delay to ensure DB commit
PARTY_AFTER=$(curl -s -X GET "$BASE_URL/api/parties/$PARTY_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Updated party data:"
echo $PARTY_AFTER | jq '{
  id: .data.id // .id,
  firstName: .data.firstName // .firstName,
  lastName: .data.lastName // .lastName,
  status: .data.status // .status,
  segment: .data.segment // .segment,
  acquisitionType: .data.acquisitionType // .acquisitionType,
  branchId: .data.branchId // .branchId
}' 2>/dev/null || echo $PARTY_AFTER
echo ""

# Check if fields were updated
UPDATED_STATUS=$(echo $PARTY_AFTER | jq -r '.data.status // .status // empty' 2>/dev/null)
UPDATED_SEGMENT=$(echo $PARTY_AFTER | jq -r '.data.segment // .segment // empty' 2>/dev/null)
UPDATED_ACQ=$(echo $PARTY_AFTER | jq -r '.data.acquisitionType // .acquisitionType // empty' 2>/dev/null)

echo "Verification:"
echo "  Status: '$UPDATED_STATUS' (expected: 'active')"
echo "  Segment: '$UPDATED_SEGMENT' (expected: 'customer')"
echo "  Acquisition Type: '$UPDATED_ACQ' (expected: 'referral')"
echo ""

# Check results
PASS=true
if [ "$UPDATED_STATUS" != "active" ]; then
  echo "⚠️  Status not updated correctly"
  PASS=false
fi
if [ "$UPDATED_SEGMENT" != "customer" ]; then
  echo "⚠️  Segment not updated correctly"
  PASS=false
fi
if [ "$UPDATED_ACQ" != "referral" ]; then
  echo "⚠️  Acquisition Type not updated correctly"
  PASS=false
fi

if [ "$PASS" == "true" ]; then
  echo "✅ All tests passed! Backend is working correctly."
else
  echo "❌ Some fields were not updated correctly"
  echo ""
  echo "This suggests the backend API is not persisting the changes."
fi
