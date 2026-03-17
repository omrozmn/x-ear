#!/bin/bash

BASE_URL="http://localhost:5003"
TOKEN=$(python3 gen_token_deneme.py)
SALE_ID="2603020114"

echo "📝 Step 1: Update discount to 15%"
curl -s -X PUT "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)-$RANDOM" \
  -d '{
    "unitListPrice": 10000.0,
    "sgkScheme": "over18_retired",
    "paymentMethod": "cash",
    "paidAmount": 2000.0,
    "earSelection": "left",
    "discountType": "percentage",
    "discountValue": 15.0
  }' | python3 -m json.tool | grep -E "(discountType|discountValue|discountAmount|finalAmount|remainingAmount)" | head -5

echo ""
echo "📊 Step 2: Verify with GET"
curl -s "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | grep -E "(discountType|discountValue|discountAmount|finalAmount|remainingAmount)" | head -5
