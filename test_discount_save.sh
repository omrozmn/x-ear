#!/bin/bash

BASE_URL="http://localhost:5003"
TOKEN=$(python3 gen_token_deneme.py)

SALE_ID="2603020114"

echo "🔍 Testing discount save for sale $SALE_ID"

# Add 10% discount
echo ""
echo "📝 Adding 10% discount..."
curl -s -X PUT "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)-$RANDOM" \
  -d '{
    "unitListPrice": 10000.0,
    "sgkScheme": "over18_working",
    "paymentMethod": "cash",
    "paidAmount": 2000.0,
    "earSelection": "bilateral",
    "discountType": "percentage",
    "discountValue": 10.0
  }' | python3 -m json.tool | head -30

echo ""
echo "📊 Checking saved values..."
curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)['data']
print(f'  discountType: {data.get(\"discountType\")}')
print(f'  discountValue: {data.get(\"discountValue\")}')
print(f'  discountAmount: {data.get(\"discountAmount\")}')
print(f'  finalAmount: {data.get(\"finalAmount\")}')
print(f'  paidAmount: {data.get(\"paidAmount\")}')
print(f'  remainingAmount: {data.get(\"remainingAmount\")}')
"
