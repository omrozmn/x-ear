#!/bin/bash

# Fix SGK values by updating each assignment directly
set -e

API_URL="http://localhost:5003"

echo "🔑 Generating token..."
cd "$(dirname "$0")"
TOKEN=$(venv/bin/python gen_token_deneme.py 2>/dev/null | tail -1)

# Get all assignments with wrong SGK (2119.6)
echo ""
echo "🔍 Finding assignments with wrong SGK values..."

# Get all parties
PARTIES=$(curl -s -X GET "${API_URL}/api/parties?page=1&perPage=100" \
  -H "Authorization: Bearer ${TOKEN}")

PARTY_IDS=$(echo "$PARTIES" | jq -r '.data[].id')

FIXED=0
TOTAL=0

for PARTY_ID in $PARTY_IDS; do
  # Get devices for this party
  DEVICES=$(curl -s -X GET "${API_URL}/api/parties/${PARTY_ID}/devices" \
    -H "Authorization: Bearer ${TOKEN}")
  
  # Find assignments with SGK = 2119.6 (wrong value)
  WRONG_ASSIGNMENTS=$(echo "$DEVICES" | jq -r '.data[] | select(.sgkSupport == 2119.6) | .id')
  
  for ASSIGNMENT_ID in $WRONG_ASSIGNMENTS; do
    TOTAL=$((TOTAL+1))
    echo "  Fixing assignment: $ASSIGNMENT_ID"
    
    # Trigger recalculation by updating with empty data (forces recalc)
    RESULT=$(curl -s -X PATCH "${API_URL}/api/device-assignments/${ASSIGNMENT_ID}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: fix-sgk-$(date +%s)-$RANDOM" \
      -d '{"discountType":"percentage"}')
    
    if echo "$RESULT" | jq -e '.success' > /dev/null 2>&1; then
      FIXED=$((FIXED+1))
      echo "    ✅ Fixed"
    else
      echo "    ❌ Failed: $(echo "$RESULT" | jq -r '.error.message')"
    fi
  done
done

echo ""
echo "✅ Fix complete!"
echo "   Total found: $TOTAL assignments"
echo "   Fixed: $FIXED assignments"
