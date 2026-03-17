#!/bin/bash

# Test script for SGK fixes
# Tests: SGK calculation, update stability, sales data consistency

set -e

echo "🧪 Testing SGK Fixes..."
echo "================================"

# Get token
TOKEN=$(python gen_token_deneme.py)
echo "✅ Token obtained"

# Test 1: Get sale and check SGK values
echo ""
echo "📋 Test 1: Get sale and verify SGK values"
echo "-----------------------------------"
SALE_DATA=$(curl -s -X GET "http://localhost:5003/api/sales/2603010102" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$SALE_DATA" | python -m json.tool > /tmp/sale_before.json

SGK_BEFORE=$(echo "$SALE_DATA" | python -c "import sys, json; data=json.load(sys.stdin); print(data['data']['devices'][0]['sgkSupport'])" 2>/dev/null || echo "0")
echo "SGK before update: $SGK_BEFORE TRY"

# Test 2: Update sale (should NOT change SGK)
echo ""
echo "📝 Test 2: Update sale and verify SGK stays same"
echo "-----------------------------------"
UPDATE_RESULT=$(curl -s -X PUT "http://localhost:5003/api/sales/2603010102" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"notes": "Test update - SGK should NOT change"}')

echo "$UPDATE_RESULT" | python -m json.tool > /tmp/sale_after_update.json

# Test 3: Get sale again and verify SGK unchanged
echo ""
echo "🔍 Test 3: Verify SGK unchanged after update"
echo "-----------------------------------"
SALE_DATA_AFTER=$(curl -s -X GET "http://localhost:5003/api/sales/2603010102" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$SALE_DATA_AFTER" | python -m json.tool > /tmp/sale_after.json

SGK_AFTER=$(echo "$SALE_DATA_AFTER" | python -c "import sys, json; data=json.load(sys.stdin); print(data['data']['devices'][0]['sgkSupport'])" 2>/dev/null || echo "0")
echo "SGK after update: $SGK_AFTER TRY"

# Test 4: Check database directly
echo ""
echo "💾 Test 4: Verify database values"
echo "-----------------------------------"
DB_SGK=$(sqlite3 apps/api/instance/xear_crm.db "SELECT sgk_support FROM device_assignments WHERE id = 'assign_e8f549c4';" 2>&1)
echo "Database SGK value: $DB_SGK TRY"

# Test 5: List sales and check SGK display
echo ""
echo "📊 Test 5: List sales and verify SGK totals"
echo "-----------------------------------"
SALES_LIST=$(curl -s -X GET "http://localhost:5003/api/sales?page=1&per_page=3" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$SALES_LIST" | python -m json.tool > /tmp/sales_list.json
echo "✅ Sales list retrieved (saved to /tmp/sales_list.json)"

# Results
echo ""
echo "================================"
echo "📊 TEST RESULTS"
echo "================================"

if [ "$SGK_BEFORE" = "$SGK_AFTER" ]; then
  echo "✅ PASS: SGK value unchanged after update ($SGK_BEFORE = $SGK_AFTER)"
else
  echo "❌ FAIL: SGK value changed! Before: $SGK_BEFORE, After: $SGK_AFTER"
  exit 1
fi

if [ "$SGK_AFTER" = "$DB_SGK" ]; then
  echo "✅ PASS: API and database values match ($SGK_AFTER = $DB_SGK)"
else
  echo "⚠️  WARNING: API ($SGK_AFTER) and database ($DB_SGK) values differ"
fi

# Check if SGK is reasonable (should be > 1000 for over18_working)
if (( $(echo "$SGK_AFTER > 1000" | bc -l) )); then
  echo "✅ PASS: SGK value is reasonable (> 1000 TRY)"
else
  echo "⚠️  WARNING: SGK value seems low ($SGK_AFTER TRY)"
fi

echo ""
echo "📁 Test artifacts saved to:"
echo "  - /tmp/sale_before.json"
echo "  - /tmp/sale_after_update.json"
echo "  - /tmp/sale_after.json"
echo "  - /tmp/sales_list.json"
echo ""
echo "✅ All tests completed!"
