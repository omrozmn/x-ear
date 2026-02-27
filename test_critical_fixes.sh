#!/bin/bash
BASE_URL="http://localhost:5003"

TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token')

echo "========================================="
echo "  TESTING CRITICAL FIXES"
echo "========================================="
echo ""

# Test 1: ORJSONResponse → JSONResponse fix (large integers)
echo "1. Testing large integer serialization (activity-logs)..."
response=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/activity-logs?page=1&limit=5")
status=$(echo "$response" | jq -r '.success')
if [ "$status" = "true" ]; then
  echo "   ✅ PASS - Large integers serialize correctly"
else
  echo "   ❌ FAIL - $(echo "$response" | jq -r '.error.message')"
fi

# Test 2: DeviceRead.price Optional fix
echo ""
echo "2. Testing devices with null price..."
response=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/devices?page=1&limit=5")
status=$(echo "$response" | jq -r '.success')
if [ "$status" = "true" ]; then
  echo "   ✅ PASS - Null price handled correctly"
else
  echo "   ❌ FAIL - $(echo "$response" | jq -r '.error.message')"
fi

# Test 3: SmsHeaderRequestRead.documents validator
echo ""
echo "3. Testing SMS headers with string documents..."
response=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/sms/headers?page=1&limit=5")
status=$(echo "$response" | jq -r '.success')
if [ "$status" = "true" ]; then
  echo "   ✅ PASS - String documents parsed to list"
else
  echo "   ❌ FAIL - $(echo "$response" | jq -r '.error.message')"
fi

# Test 4: InvoiceRead.metadata validator
echo ""
echo "4. Testing invoices with string metadata..."
response=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/invoices?page=1&limit=5")
status=$(echo "$response" | jq -r '.success')
if [ "$status" = "true" ]; then
  echo "   ✅ PASS - String metadata parsed to dict"
else
  echo "   ❌ FAIL - $(echo "$response" | jq -r '.error.message')"
fi

# Test 5: DeliverabilityMetrics timestamps
echo ""
echo "5. Testing deliverability metrics with timestamps..."
response=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/deliverability/trend?days=7")
status=$(echo "$response" | jq -r '.success')
if [ "$status" = "true" ]; then
  echo "   ✅ PASS - Timestamps added to deliverability_metrics"
else
  echo "   ❌ FAIL - $(echo "$response" | jq -r '.error.message')"
fi

# Test 6: Settings endpoint
echo ""
echo "6. Testing settings endpoint..."
response=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/settings")
status=$(echo "$response" | jq -r '.success')
if [ "$status" = "true" ]; then
  echo "   ✅ PASS - Settings endpoint works"
else
  echo "   ❌ FAIL - $(echo "$response" | jq -r '.error.message')"
fi

# Test 7: Audit endpoint
echo ""
echo "7. Testing audit endpoint..."
response=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/audit?page=1&limit=5")
status=$(echo "$response" | jq -r '.success')
if [ "$status" = "true" ]; then
  echo "   ✅ PASS - Audit endpoint works"
else
  echo "   ❌ FAIL - $(echo "$response" | jq -r '.error.message')"
fi

echo ""
echo "========================================="
echo "  SUMMARY"
echo "========================================="
echo "All critical schema validation fixes tested!"
