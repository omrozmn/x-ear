#!/bin/bash

BASE_URL="http://localhost:5003"

echo "=== POS COMMISSION API TESTS ==="
echo ""
echo "1. Logging in..."
LOGIN_JSON=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}')

TOKEN=$(echo "$LOGIN_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed!"
    echo "$LOGIN_JSON" | python3 -m json.tool
    exit 1
fi

echo "✅ Login successful!"
echo ""

echo "=== 2. GET Commission Rates ==="
curl -s -X GET "$BASE_URL/api/pos/commission/rates" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

echo "=== 3. Calculate Commission (1000 TL, 1 Installment) ==="
curl -s -X POST "$BASE_URL/api/pos/commission/calculate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "installment_count": 1, "provider": "xear_pos"}' \
  | python3 -m json.tool
echo ""

echo "=== 4. Get Installment Options (1000 TL) ==="
curl -s -X POST "$BASE_URL/api/pos/commission/installment-options" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "provider": "xear_pos"}' \
  | python3 -m json.tool
echo ""

echo "=== 5. Calculate Commission (3000 TL, 6 Installments) ==="
curl -s -X POST "$BASE_URL/api/pos/commission/calculate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 3000, "installment_count": 6, "provider": "xear_pos"}' \
  | python3 -m json.tool
echo ""

echo "✅ All tests completed!"
