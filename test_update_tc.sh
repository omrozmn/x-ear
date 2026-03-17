#!/bin/bash

# Test TC number update via API
echo "=== Testing TC Number Update via API ==="

# Login to get token
echo "1. Getting auth token..."
TOKEN=$(curl -s -X POST http://localhost:5003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@deneme.com",
    "password": "admin123"
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('accessToken', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo "✅ Got token"
echo ""

# Update party with TC number
PARTY_ID="pat_01464a2b"
NEW_TC="55566677788"

echo "2. Updating party $PARTY_ID with TC: $NEW_TC"
echo ""

RESPONSE=$(curl -s -X PUT "http://localhost:5003/api/parties/$PARTY_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"tcNumber\": \"$NEW_TC\"
  }")

echo "API Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Check database
echo "3. Checking database..."
DB_TC=$(sqlite3 apps/api/instance/xear_crm.db "SELECT tc_number FROM parties WHERE id='$PARTY_ID';")
echo "Database TC: '$DB_TC'"
echo ""

if [ "$DB_TC" = "$NEW_TC" ]; then
  echo "✅ SUCCESS: TC updated!"
else
  echo "❌ FAILED: TC not updated"
  echo "   Expected: $NEW_TC"
  echo "   Got: $DB_TC"
fi
